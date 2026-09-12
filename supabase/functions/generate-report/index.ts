import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Scoped to the calling user's own JWT (not the service role) so every
    // query below is governed by the same RLS policies as the rest of the
    // app — a physio can only ever pull patients/pain_logs/adherence_logs
    // etc. that they are actually allowed to see.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { patient_id, week_start, week_end } = await req.json()

    if (!patient_id || !week_start || !week_end) {
      return new Response(
        JSON.stringify({ error: 'Missing patient_id, week_start, or week_end' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch patient details. RLS (physio_own_patients / admin_patients_select)
    // means this returns nothing if the caller isn't this patient's physio
    // or an admin — that's what turns an unauthorized request into a 404
    // rather than a data leak.
    const { data: patient } = await supabase
      .from('patients')
      .select('*, profiles(full_name, clinic_name)')
      .eq('id', patient_id)
      .single()

    if (!patient) {
      return new Response(
        JSON.stringify({ error: 'Patient not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch pain logs for the week
    const { data: painLogs } = await supabase
      .from('pain_logs')
      .select('score, logged_at')
      .eq('patient_id', patient_id)
      .gte('logged_at', week_start)
      .lte('logged_at', week_end)
      .order('logged_at', { ascending: true })

    // Fetch adherence logs for the week
    const { data: adherenceLogs } = await supabase
      .from('adherence_logs')
      .select('log_date, confirmed, reply_received')
      .eq('patient_id', patient_id)
      .gte('log_date', week_start)
      .lte('log_date', week_end)
      .order('log_date', { ascending: true })

    // Calculate stats
    const avgPain = painLogs && painLogs.length > 0
      ? (painLogs.reduce((sum: number, l: any) => sum + l.score, 0) / painLogs.length).toFixed(1)
      : 'N/A'

    const adherencePercent = adherenceLogs && adherenceLogs.length > 0
      ? Math.round(
          (adherenceLogs.filter((l: any) => l.confirmed).length / adherenceLogs.length) * 100
        )
      : 0

    const totalDays = adherenceLogs?.length ?? 0
    const completedDays = adherenceLogs?.filter((l: any) => l.confirmed).length ?? 0

    // Data-derived summary (used as fallback / label for the AI summary)
    const fallbackSummary =
      `The patient confirmed ${completedDays} of ${totalDays} daily exercise reminders this week (${adherencePercent}% adherence).` +
      (avgPain !== 'N/A' ? ` Average reported pain was ${avgPain}/10.` : '')

    // AI-generated summary (labelled clearly; falls back to data-derived text)
    async function generateAiSummary() {
      const dataText = JSON.stringify({
        adherence_percent: adherencePercent,
        avg_pain: avgPain,
        days_completed: `${completedDays}/${totalDays}`
      })
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': Deno.env.get('ANTHROPIC_API_KEY') ?? '',
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 300,
            system: 'You are a clinical reporting assistant for physiotherapists. Summarise the following structured rehabilitation data in 2-3 clear sentences. Do not invent findings. Only report what the data shows.',
            messages: [{ role: 'user', content: dataText }]
          })
        })
        const data = await res.json()
        return data?.content?.[0]?.text ?? ''
      } catch {
        return ''
      }
    }
    const aiSummary = (await generateAiSummary()) || fallbackSummary

    // Build HTML report
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      color: #1a1a1a;
      padding: 40px;
      line-height: 1.6;
    }
    .header {
      border-bottom: 3px solid #16a34a;
      padding-bottom: 20px;
      margin-bottom: 30px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .logo {
      font-size: 22px;
      font-weight: bold;
      color: #16a34a;
    }
    .logo span {
      display: block;
      font-size: 12px;
      color: #666;
      font-weight: normal;
    }
    .report-meta { text-align: right; font-size: 13px; color: #666; }
    h1 { font-size: 20px; margin-bottom: 5px; }
    .patient-info {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 25px;
    }
    .patient-info h2 {
      font-size: 16px;
      color: #15803d;
      margin-bottom: 10px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .info-item { font-size: 13px; }
    .info-item strong { color: #374151; }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
      margin-bottom: 25px;
    }
    .stat-box {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 15px;
      text-align: center;
    }
    .stat-box .value {
      font-size: 28px;
      font-weight: bold;
      color: #16a34a;
    }
    .stat-box .label {
      font-size: 12px;
      color: #6b7280;
      margin-top: 4px;
    }
    .section { margin-bottom: 25px; }
    .section h3 {
      font-size: 15px;
      font-weight: bold;
      color: #374151;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e5e7eb;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th {
      background: #f9fafb;
      padding: 8px 12px;
      text-align: left;
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; }
    .confirmed { color: #16a34a; font-weight: bold; }
    .missed { color: #dc2626; }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #9ca3af;
      text-align: center;
    }
  </style>
</head>
<body>

  <div class="header">
    <div>
      <div class="logo">
        Rehabot Africa
        <span>Rehabilitation Follow-Up System</span>
      </div>
    </div>
    <div class="report-meta">
      <strong>Weekly Report</strong><br>
      ${week_start} to ${week_end}<br>
      Generated: ${new Date().toLocaleDateString('en-GB')}
    </div>
  </div>

  <div class="patient-info">
    <h2>Patient Information</h2>
    <div class="info-grid">
      <div class="info-item"><strong>Name:</strong> ${patient.full_name}</div>
      <div class="info-item"><strong>Phone:</strong> ${patient.phone_number}</div>
      <div class="info-item"><strong>Diagnosis:</strong> ${patient.diagnosis}</div>
      <div class="info-item"><strong>Language:</strong> ${patient.language === 'sw' ? 'Swahili' : 'English'}</div>
      <div class="info-item"><strong>Status:</strong> ${patient.status}</div>
      <div class="info-item"><strong>Clinic:</strong> ${patient.profiles?.clinic_name ?? 'N/A'}</div>
    </div>
  </div>

  <div class="stats-grid">
    <div class="stat-box">
      <div class="value">${adherencePercent}%</div>
      <div class="label">Exercise Adherence</div>
    </div>
    <div class="stat-box">
      <div class="value">${avgPain}</div>
      <div class="label">Avg Pain Score (1–10)</div>
    </div>
    <div class="stat-box">
      <div class="value">${completedDays}/${totalDays}</div>
      <div class="label">Days Completed</div>
    </div>
  </div>

  <div class="section">
    <h3>Daily Adherence</h3>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Exercise Confirmed</th>
          <th>Reply Received</th>
        </tr>
      </thead>
      <tbody>
        ${adherenceLogs?.map((log: any) => `
          <tr>
            <td>${new Date(log.log_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
            <td class="${log.confirmed ? 'confirmed' : 'missed'}">
              ${log.confirmed ? '✓ Yes' : '✗ No'}
            </td>
            <td>${log.reply_received ? 'Yes' : 'No'}</td>
          </tr>
        `).join('') ?? '<tr><td colspan="3">No data</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h3>Pain Score Log</h3>
    <table>
      <thead>
        <tr>
          <th>Date & Time</th>
          <th>Pain Score</th>
          <th>Level</th>
        </tr>
      </thead>
      <tbody>
        ${painLogs && painLogs.length > 0
          ? painLogs.map((log: any) => `
            <tr>
              <td>${new Date(log.logged_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
              <td><strong>${log.score}/10</strong></td>
              <td>${log.score <= 3 ? '🟢 Mild' : log.score <= 6 ? '🟡 Moderate' : '🔴 Severe'}</td>
            </tr>
          `).join('')
          : '<tr><td colspan="3">No pain scores recorded this week</td></tr>'
        }
      </tbody>
    </table>
  </div>

  <div class="section" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:15px;">
    <h3>AI-Generated Summary</h3>
    <p style="font-size:13px;">${aiSummary}</p>
    <p style="font-size:11px;color:#6b7280;">Automatically generated summary for clinical decision support. The underlying data is shown above; always verify against raw data.</p>
  </div>

  <div class="footer">
    This report was automatically generated by Rehabot Africa — Darva Health<br>
    For clinical decisions, always consult the supervising physiotherapist.
  </div>

</body>
</html>
    `

    // Save report record to database. physio_reports RLS requires
    // auth.uid() = physio_id, so this must be the caller's own id.
    const { data: report } = await supabase
      .from('reports')
      .insert({
        patient_id,
        physio_id: user.id,
        week_start,
        week_end,
        avg_pain_score: avgPain === 'N/A' ? null : parseFloat(avgPain),
        adherence_percent: adherencePercent
      })
      .select()
      .single()

    return new Response(
      JSON.stringify({
        success: true,
        report_id: report?.id,
        html,
        stats: {
          adherence_percent: adherencePercent,
          avg_pain: avgPain,
          completed_days: completedDays,
          total_days: totalDays
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('generate-report error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
