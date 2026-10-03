// Pure phone-number helpers for the Textify integration. Kept free of Deno
// and network dependencies so they can be unit-tested in isolation.

// Tanzanian mobile numbers are 10 digits in local form: 07X XXX XXXX (or 06X).
// Textify's example receivers use this local format ("0712345678"), so we
// normalise every input to that shape.
export const TZ_LOCAL_RE = /^0[67]\d{8}$/

// Accepted inputs: 0712345678 | +255712345678 | 255712345678 | 00255712345678.
export function normalizeTanzanianPhone(raw: string): string {
  let value = (raw ?? '').trim()

  // International dial prefix ("00…") — Tanzania is 00255.
  if (value.startsWith('00255')) value = '0' + value.slice(5)
  else if (value.startsWith('00')) value = '+' + value.slice(2)

  if (value.startsWith('+255')) {
    value = '0' + value.slice(4)
  } else if (value.startsWith('255')) {
    value = '0' + value.slice(3)
  }

  return value
}

export function isValidTanzanianPhone(value: string): boolean {
  return TZ_LOCAL_RE.test(value)
}

// Returns the local 07X… number or throws a descriptive validation error.
export function normalizeAndValidatePhone(raw: string): string {
  const normalized = normalizeTanzanianPhone(raw)
  if (!isValidTanzanianPhone(normalized)) {
    throw new Error(
      `Invalid Tanzanian phone number: "${raw}". Expected 0712345678, +255712345678 or 255712345678.`
    )
  }
  return normalized
}

// Strips everything except digits for safe comparisons/logging.
export function digitsOnly(raw: string): string {
  return (raw ?? '').replace(/\D/g, '')
}

// Normalise any accepted input to the E.164-ish format the app stores patients
// under ("+2557XXXXXXXX"), used to match an inbound SMS sender to a patient.
export function normalizeToE164(raw: string): string {
  const local = normalizeTanzanianPhone(raw)
  if (!isValidTanzanianPhone(local)) {
    throw new Error(`Invalid Tanzanian phone number: "${raw}"`)
  }
  return '+255' + local.slice(1)
}
