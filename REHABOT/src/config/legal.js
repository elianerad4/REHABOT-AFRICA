// Central place to update legal/contact details used across the app.
export const legalContact = {
  privacyEmail: '[INSERT PRIVACY EMAIL]',
  website: '[INSERT WEBSITE]',
  location: 'Tanzania'
}

export const privacyPolicy = {
  title: 'Rehabot Privacy Policy',
  lastUpdated: '13 September 2026',
  intro: [
    `Rehabot ("Rehabot", "we", "us", or "our") is an AI-powered physiotherapy follow-up platform operated by Darva Health. Rehabot helps physiotherapy clinics communicate with patients, send rehabilitation reminders, monitor exercise adherence, collect patient-reported information, and support physiotherapists in managing follow-up care.`,
    `This Privacy Policy explains how we collect, use, store, disclose, and protect personal information when you use the Rehabot platform, website, dashboard, or WhatsApp-based services.`,
    `By using Rehabot, you acknowledge that you have read and understood this Privacy Policy.`
  ],
  sections: [
    {
      id: 'information-we-collect',
      heading: '1. Information We Collect',
      body: [
        { type: 'p', text: 'Depending on how you use Rehabot, we may collect the following categories of information.' },
        { type: 'h3', text: '1.1 Patient Information' },
        { type: 'p', text: 'Physiotherapy clinics or authorized healthcare professionals may provide information about patients, including:' },
        {
          type: 'ul',
          items: [
            'Full name',
            'Telephone number and WhatsApp number',
            'Age or date of birth',
            'Sex or gender where relevant to clinical care',
            'Physiotherapy diagnosis or clinical condition',
            'Relevant medical or rehabilitation history',
            'Assigned rehabilitation exercises',
            'Exercise schedules',
            'Pain scores and other patient-reported outcomes',
            'Exercise adherence information',
            'Appointment or follow-up information',
            'Patient responses to rehabilitation messages',
            'Other information voluntarily provided during rehabilitation follow-up'
          ]
        },
        { type: 'p', text: 'Some of this information may constitute health or other sensitive personal information under applicable data-protection laws.' },
        { type: 'h3', text: '1.2 Account Information' },
        { type: 'p', text: 'For physiotherapists, clinic administrators, and other authorized users, we may collect:' },
        {
          type: 'ul',
          items: [
            'Name',
            'Email address',
            'Telephone number',
            'Clinic or organization information',
            'Login credentials or authentication information',
            'Subscription and account status',
            "Information associated with the user's Rehabot account"
          ]
        },
        { type: 'h3', text: '1.3 WhatsApp Communications' },
        { type: 'p', text: 'When Rehabot communicates with patients through WhatsApp, we may process:' },
        {
          type: 'ul',
          items: [
            'WhatsApp telephone numbers',
            'Messages sent to Rehabot',
            'Responses to rehabilitation reminders',
            'Exercise-related responses',
            'Pain scores and other information submitted through WhatsApp',
            'Media or files sent through the service where supported'
          ]
        },
        { type: 'p', text: 'WhatsApp is operated by Meta Platforms, Inc. and its affiliates. WhatsApp processes information according to its own privacy practices and policies.' },
        { type: 'h3', text: '1.4 Technical Information' },
        { type: 'p', text: 'We may automatically collect limited technical information such as:' },
        {
          type: 'ul',
          items: [
            'IP address',
            'Browser type',
            'Device type',
            'Operating system',
            'Log information',
            'Authentication events',
            'Platform usage information',
            'Error and diagnostic information'
          ]
        },
        { type: 'p', text: 'We use this information primarily to operate, secure, maintain, and improve Rehabot.' }
      ]
    },
    {
      id: 'how-we-use-information',
      heading: '2. How We Use Personal Information',
      body: [
        { type: 'p', text: 'We may use personal information for the following purposes:' },
        {
          type: 'ul',
          items: [
            'Providing physiotherapy follow-up services',
            'Sending exercise reminders',
            'Sending appointment or follow-up reminders',
            'Recording exercise adherence',
            'Recording patient-reported pain scores and other rehabilitation information',
            'Helping physiotherapists monitor patient progress',
            'Generating rehabilitation reports and summaries',
            'Providing AI-assisted functionality',
            'Responding to patient messages',
            'Maintaining patient and clinic records',
            'Managing user accounts and subscriptions',
            'Providing customer support',
            'Maintaining and improving the security and reliability of the platform',
            'Detecting and preventing fraud, abuse, unauthorized access, and other security incidents',
            'Complying with applicable legal and regulatory obligations'
          ]
        },
        { type: 'p', text: 'We will not use patient information for purposes unrelated to the provision, security, administration, or improvement of the Rehabot service without an appropriate legal basis or authorization.' }
      ]
    },
    {
      id: 'health-information',
      heading: '3. Health and Rehabilitation Information',
      body: [
        { type: 'p', text: "Rehabot may process information relating to a person's physical health, rehabilitation, symptoms, pain, diagnosis, exercises, and treatment progress." },
        { type: 'p', text: 'This information should only be entered into Rehabot by authorized healthcare professionals or by patients themselves through authorized communication channels.' },
        { type: 'p', text: 'Healthcare providers remain responsible for ensuring that they have an appropriate legal basis, consent, authorization, or other lawful basis for providing patient information to Rehabot where required by applicable law.' },
        { type: 'p', text: 'Rehabot is a technology platform and does not replace the professional judgment of a qualified physiotherapist or other healthcare professional.' }
      ]
    },
    {
      id: 'ai-assisted-processing',
      heading: '4. AI-Assisted Processing',
      body: [
        { type: 'p', text: 'Certain Rehabot features may use artificial intelligence to assist with communication, rehabilitation follow-up, summaries, or other platform functionality.' },
        { type: 'p', text: 'Where AI processing is used, relevant information may be processed by our AI service providers to generate the requested response or output.' },
        { type: 'p', text: 'AI-generated information is intended to support healthcare professionals and patient communication. It should not be treated as an independent medical diagnosis or as a substitute for assessment and clinical judgment by a qualified healthcare professional.' },
        { type: 'p', text: 'We take reasonable measures to limit the information processed by AI systems to what is necessary for the relevant feature.' }
      ]
    },
    {
      id: 'whatsapp-third-party',
      heading: '5. WhatsApp and Third-Party Services',
      body: [
        { type: 'p', text: 'Rehabot relies on third-party infrastructure and service providers to operate certain functions of the platform.' },
        { type: 'p', text: 'These may include:' },
        {
          type: 'ul',
          items: [
            'WhatsApp/Meta for patient communication',
            'Cloud hosting and database providers',
            'Authentication and security providers',
            'Cloud storage providers',
            'AI service providers',
            'Email or notification providers',
            'Analytics, monitoring, or technical service providers where applicable'
          ]
        },
        { type: 'p', text: 'These providers may process information on our behalf or independently according to the services they provide and their applicable privacy policies.' },
        { type: 'p', text: 'We do not sell patient personal information to third parties.' }
      ]
    },
    {
      id: 'how-we-share-information',
      heading: '6. How We Share Personal Information',
      body: [
        { type: 'p', text: 'We may share personal information with:' },
        { type: 'h3', text: 'Authorized Healthcare Providers' },
        { type: 'p', text: "Patient information may be accessible to the physiotherapist, clinic, or healthcare organization responsible for the patient's rehabilitation." },
        { type: 'h3', text: 'Service Providers' },
        { type: 'p', text: 'We may provide limited access to trusted third-party service providers that help us operate Rehabot, such as hosting, database, messaging, authentication, storage, and AI infrastructure providers.' },
        { type: 'p', text: 'These providers are expected to process information only for authorized purposes and subject to appropriate contractual or technical safeguards where applicable.' },
        { type: 'h3', text: 'Legal and Regulatory Authorities' },
        { type: 'p', text: 'We may disclose information where reasonably necessary to:' },
        {
          type: 'ul',
          items: [
            'Comply with applicable law',
            'Respond to lawful requests',
            'Protect the rights, safety, and security of Rehabot, our users, patients, or others',
            'Investigate fraud, abuse, or security incidents'
          ]
        },
        { type: 'h3', text: 'Business Transfers' },
        { type: 'p', text: 'If Rehabot or substantially all of its assets are involved in a merger, acquisition, financing, restructuring, or sale, personal information may be transferred as part of that transaction, subject to applicable legal requirements.' }
      ]
    },
    {
      id: 'data-retention',
      heading: '7. Data Retention',
      body: [
        { type: 'p', text: 'We retain personal information only for as long as reasonably necessary for the purposes described in this Privacy Policy, including providing the service, maintaining appropriate clinical or administrative records, resolving disputes, enforcing agreements, maintaining security, and complying with legal obligations.' },
        { type: 'p', text: 'Healthcare providers may have separate legal obligations regarding the retention of patient records.' },
        { type: 'p', text: 'When information is no longer required, we may delete, anonymize, or securely dispose of it, subject to applicable retention requirements.' }
      ]
    },
    {
      id: 'data-security',
      heading: '8. Data Security',
      body: [
        { type: 'p', text: 'We implement reasonable technical and organizational measures designed to protect personal information against unauthorized access, alteration, disclosure, loss, or destruction.' },
        { type: 'p', text: 'Depending on the information and system involved, these measures may include:' },
        {
          type: 'ul',
          items: [
            'Authentication and access controls',
            'Encryption in transit',
            'Database security controls',
            'Role-based access controls',
            'Security monitoring',
            'Secure infrastructure',
            'Restricted administrative access',
            'Regular software and infrastructure maintenance'
          ]
        },
        { type: 'p', text: 'However, no internet-based service can guarantee absolute security.' },
        { type: 'p', text: 'Users are responsible for maintaining the confidentiality of their account credentials and for notifying Rehabot of suspected unauthorized access.' }
      ]
    },
    {
      id: 'responsibilities',
      heading: '9. Patient and Healthcare Provider Responsibilities',
      body: [
        { type: 'p', text: 'Healthcare providers using Rehabot are responsible for:' },
        {
          type: 'ul',
          items: [
            'Providing accurate patient information',
            'Using Rehabot only for legitimate healthcare and rehabilitation purposes',
            'Ensuring that they have the necessary authority or lawful basis to process patient information',
            'Maintaining appropriate confidentiality',
            'Providing patients with any legally required notices',
            'Using patient information only for appropriate professional purposes',
            'Protecting their Rehabot account credentials'
          ]
        },
        { type: 'p', text: 'Patients should provide accurate information and should contact their healthcare professional if they have concerns about their rehabilitation, symptoms, or treatment.' }
      ]
    },
    {
      id: 'your-privacy-rights',
      heading: '10. Your Privacy Rights',
      body: [
        { type: 'p', text: 'Depending on applicable law, you may have rights concerning your personal information, which may include the right to:' },
        {
          type: 'ul',
          items: [
            'Request access to personal information we hold about you',
            'Request correction of inaccurate information',
            'Request deletion of personal information where legally permitted',
            'Request restriction of certain processing',
            'Object to certain processing',
            'Request a copy of certain information',
            'Withdraw consent where processing is based on consent',
            'Lodge a complaint with an applicable data-protection authority'
          ]
        },
        { type: 'p', text: 'Some rights may be subject to legal limitations, particularly where information must be retained for healthcare, legal, security, or regulatory purposes.' },
        { type: 'p', text: 'To exercise a privacy right, contact us using the details provided below.' }
      ]
    },
    {
      id: 'childrens-privacy',
      heading: "11. Children's Privacy",
      body: [
        { type: 'p', text: 'Rehabot is primarily designed for use by adults and healthcare professionals.' },
        { type: 'p', text: 'Where rehabilitation services are provided to a minor, the responsible healthcare provider or authorized guardian is responsible for ensuring that appropriate consent, authorization, and safeguards are in place as required by applicable law.' },
        { type: 'p', text: "We do not knowingly collect children's personal information for unrelated purposes." }
      ]
    },
    {
      id: 'international-transfers',
      heading: '12. International Data Transfers',
      body: [
        { type: 'p', text: 'Rehabot and its service providers may process or store information in countries other than the country where the information was originally collected.' },
        { type: 'p', text: 'Where personal information is transferred internationally, we will take reasonable steps to ensure that appropriate safeguards are applied as required by applicable data-protection laws.' }
      ]
    },
    {
      id: 'cookies',
      heading: '13. Cookies and Similar Technologies',
      body: [
        { type: 'p', text: 'The Rehabot website and application may use cookies, local storage, or similar technologies to:' },
        {
          type: 'ul',
          items: [
            'Maintain authentication sessions',
            'Remember preferences',
            'Improve security',
            'Understand platform usage',
            'Diagnose technical problems',
            'Improve the user experience'
          ]
        },
        { type: 'p', text: 'Where required by law, we will request appropriate consent before using non-essential cookies or similar technologies.' }
      ]
    },
    {
      id: 'changes',
      heading: '14. Changes to This Privacy Policy',
      body: [
        { type: 'p', text: 'We may update this Privacy Policy from time to time to reflect changes in Rehabot, applicable laws, technology, or our data-processing practices.' },
        { type: 'p', text: 'When we make significant changes, we may provide an appropriate notice through the Rehabot platform, website, email, or other communication channel.' },
        { type: 'p', text: 'The "Last Updated" date at the beginning of this policy indicates when it was most recently revised.' }
      ]
    },
    {
      id: 'contact',
      heading: '15. Contact Us',
      body: [
        { type: 'p', text: 'If you have questions about this Privacy Policy, want to exercise a privacy right, or have concerns about how your information is handled, contact us:' },
        { type: 'p', text: 'Rehabot / Darva Health', strong: true },
        { type: 'p', text: `Email: ${legalContact.privacyEmail}` },
        { type: 'p', text: `Website: ${legalContact.website}` },
        { type: 'p', text: `Location: ${legalContact.location}` },
        { type: 'p', text: 'For patient-specific questions about your rehabilitation records, you may also contact the physiotherapy clinic or healthcare professional managing your care.' }
      ]
    },
    {
      id: 'important-notice',
      heading: '16. Important Notice',
      body: [
        { type: 'p', text: 'Rehabot is a technology platform designed to support physiotherapy follow-up and communication. It does not independently establish a medical diagnosis, replace a physiotherapist, or provide emergency medical services.' },
        { type: 'p', text: 'If you experience a medical emergency or severe or rapidly worsening symptoms, seek appropriate emergency medical care rather than relying on Rehabot.' },
        { type: 'p', text: 'By using Rehabot, you acknowledge that you have read this Privacy Policy and understand how your information may be processed as described above.' }
      ]
    }
  ]
}
