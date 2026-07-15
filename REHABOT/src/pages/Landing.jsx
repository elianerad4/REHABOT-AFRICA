import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/ui/Logo'

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Contact', href: '#contact' }
]

const statsData = [
  { value: '65M+', desc: 'Tanzanians underserved by physiotherapy' },
  { value: '50%', desc: 'Patients abandon treatment after discharge' },
  { value: '0', desc: 'App downloads required' },
  { value: '1,000+', desc: 'Free WhatsApp conversations per month' }
]

const problemCards = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="#dc2626"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
    ),
    title: 'Fewer than 100 physiotherapists',
    desc: 'Tanzania has fewer than 100 physiotherapists for 65 million people'
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="#dc2626"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" /></svg>
    ),
    title: 'Paper handouts, zero follow-up',
    desc: 'Patients leave with a paper handout and zero follow-up'
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="#dc2626"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" /></svg>
    ),
    title: 'No tracking, no insight',
    desc: 'Without tracking, physios have no idea if patients are doing their exercises'
  }
]

const steps = [
  {
    num: '1',
    title: 'Add Patient',
    desc: 'Enter name, phone, diagnosis and assign exercises from the library'
  },
  {
    num: '2',
    title: 'Reminders Sent',
    desc: 'Patient receives daily WhatsApp message in Swahili or English at their preferred time'
  },
  {
    num: '3',
    title: 'Patient Replies',
    desc: 'They confirm exercises, rate pain 1-10, ask questions. AI responds instantly.'
  },
  {
    num: '4',
    title: 'You See Everything',
    desc: 'Dashboard shows adherence rates, pain trends, and weekly PDF reports'
  }
]

const features = [
  { emoji: '📱', title: 'WhatsApp Native', desc: 'Works on any phone. Zero app downloads. Zero data barriers.' },
  { emoji: '🤖', title: 'AI in Swahili', desc: 'Claude AI answers patient questions in Swahili and English, 24/7' },
  { emoji: '📊', title: 'Pain Tracking', desc: 'Daily pain scores logged automatically. See trends over time.' },
  { emoji: '✅', title: 'Adherence Dashboard', desc: 'Know exactly which patients are doing their exercises' },
  { emoji: '📄', title: 'Weekly PDF Reports', desc: 'Auto-generated patient reports every Sunday' },
  { emoji: '🏋️', title: 'Exercise Library', desc: '15+ physiotherapy exercises with Swahili and English names' }
]

const plans = [
  {
    name: 'Free Trial',
    price: 'Free',
    period: '14 days',
    patients: 'Up to 10 patients',
    features: ['All features included', 'No credit card needed'],
    cta: 'Start Free Trial',
    highlighted: false
  },
  {
    name: 'Starter',
    price: 'TZS 50,000',
    period: '/month',
    patients: 'Up to 30 patients',
    features: ['All features included', 'WhatsApp support'],
    cta: 'Get Started',
    highlighted: true,
    badge: 'Most Popular'
  },
  {
    name: 'Pro',
    price: 'TZS 120,000',
    period: '/month',
    patients: 'Unlimited patients',
    features: ['Priority support', 'Custom exercises', 'API access'],
    cta: 'Contact Us',
    highlighted: false
  }
]

const faqs = [
  {
    q: 'Do patients need to download an app?',
    a: 'No. Everything works through WhatsApp which is already on their phone.'
  },
  {
    q: 'What languages does Rehabot support?',
    a: 'Swahili and English. Patients choose their preferred language when registered.'
  },
  {
    q: 'How much does it cost after the free trial?',
    a: 'Starting from TZS 50,000 per month for up to 30 patients.'
  },
  {
    q: 'Is patient data secure?',
    a: 'Yes. All data is encrypted and stored on Supabase secure servers.'
  },
  {
    q: 'Can I use my existing phone number?',
    a: 'We recommend a dedicated SIM for Rehabot Africa to keep business and personal separate.'
  },
  {
    q: 'What happens if a patient doesn\'t reply?',
    a: 'The system logs the missed day. You can see non-responding patients on your dashboard.'
  }
]

function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('opacity-100', 'translate-y-0')
            entry.target.classList.remove('opacity-0', 'translate-y-8')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}

function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <a href="#" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-9 h-9 bg-[#16a34a] rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-bold text-gray-900 -mb-0.5">Rehabot</div>
              <div className="text-[10px] font-medium text-[#16a34a] tracking-wider uppercase">Africa</div>
            </div>
          </a>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(link => (
              <a key={link.href} href={link.href} className="text-sm font-medium text-gray-600 hover:text-[#16a34a] transition-colors">
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="px-5 py-2.5 text-sm font-medium text-[#16a34a] border-2 border-[#16a34a] rounded-lg hover:bg-green-50 transition-all">
              Login
            </button>
            <button onClick={() => navigate('/register')} className="px-5 py-2.5 text-sm font-medium text-white bg-[#c85b1a] rounded-lg hover:bg-orange-700 shadow-sm transition-all">
              Get Started Free
            </button>
          </div>

          <button onClick={() => setOpen(!open)} className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              )}
            </svg>
          </button>
        </div>

        {open && (
          <div className="md:hidden pb-5 border-t border-gray-100 pt-4">
            <div className="flex flex-col gap-3">
              {navLinks.map(link => (
                <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="text-sm font-medium text-gray-600 hover:text-[#16a34a] transition-colors py-1">
                  {link.label}
                </a>
              ))}
              <hr className="border-gray-100 my-1" />
              <button onClick={() => { setOpen(false); navigate('/login') }} className="w-full px-4 py-2.5 text-sm font-medium text-[#16a34a] border-2 border-[#16a34a] rounded-lg hover:bg-green-50 transition-all text-center">
                Login
              </button>
              <button onClick={() => { setOpen(false); navigate('/register') }} className="w-full px-4 py-2.5 text-sm font-medium text-white bg-[#c85b1a] rounded-lg hover:bg-orange-700 transition-all text-center">
                Get Started Free
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

function WhatsAppChat({ messages, minHeight = '360px' }) {
  return (
    <div className="w-[300px] sm:w-[340px] bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden mx-auto">
      <div className="bg-[#075e54] px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#25d366] flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-semibold">Rehabot Africa</span>
            <span className="w-2 h-2 rounded-full bg-[#25d366] inline-block" />
          </div>
          <div className="text-[#b0d4d0] text-xs">online</div>
        </div>
        <svg className="w-5 h-5 text-white/80" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
      </div>
      <div className="bg-[#efeae2] p-3 space-y-2.5 min-h-[360px] flex flex-col justify-end bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMjAwIDBMMjAwIDQwME0wIDIwMEw0MDAgMjAwIiBzdHJva2U9IiNlMGVkZTgiIHN0cm9rZS13aWR0aD0iLjUiLz48L3N2Zz4=')]">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.side === 'left' ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed shadow-sm ${
              msg.side === 'left'
                ? 'bg-white text-gray-800 rounded-bl-sm'
                : 'bg-[#d9fdd3] text-gray-800 rounded-br-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <div className="flex-1 bg-white rounded-full px-4 py-2 text-sm text-gray-400 border border-gray-200">Type a message...</div>
          <div className="w-9 h-9 rounded-full bg-[#25d366] flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.75 12.75 9 18l12-12" /></svg>
          </div>
        </div>
      </div>
    </div>
  )
}

function FadeSection({ children, className = '' }) {
  return <div className={`reveal opacity-0 translate-y-8 transition-all duration-700 ${className}`}>{children}</div>
}

function Hero() {
  const navigate = useNavigate()
  const heroMessages = [
    { side: 'left', text: 'Habari Juma! 💪 Mazoezi yako ya leo: Knee Extensions 3x10, Hip Abduction 3x15. Jibu NDIYO ukimaliza.' },
    { side: 'right', text: 'NDIYO' },
    { side: 'left', text: 'Hongera! 🎉 Umefanya vizuri leo. Tutakuuliza kuhusu maumivu yako hivi karibuni.' },
    { side: 'right', text: 'Goti langu linauma kidogo' },
    { side: 'left', text: 'Pole sana. Maumivu kidogo baada ya mazoezi ni ya kawaida. Pumzika dakika 20. Wasiliana na daktari wako ikiwa maumivu yataendelea.' }
  ]

  return (
    <section id="hero" className="pt-28 pb-16 md:pt-36 md:pb-24 bg-gradient-to-br from-white via-green-50/40 to-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <FadeSection>
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-1.5 text-xs font-medium text-[#16a34a] mb-6">
              <span className="w-2 h-2 rounded-full bg-[#16a34a] animate-pulse" />
              AI-Powered WhatsApp Follow-Up
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Keep Every Patient on Track —{' '}
              <span className="text-[#16a34a]">Automatically</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-xl">
              Rehabot Africa sends daily exercise reminders, collects pain scores, and answers patient questions in Swahili — all through WhatsApp. No app. No barriers. Just results.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <button onClick={() => navigate('/register')} className="px-8 py-3.5 bg-[#c85b1a] text-white font-semibold rounded-xl hover:bg-orange-700 shadow-lg shadow-orange-200 transition-all text-sm">
                Start Free Trial
              </button>
              <a href="#how-it-works" className="inline-flex items-center gap-2 px-8 py-3.5 border-2 border-[#16a34a] text-[#16a34a] font-semibold rounded-xl hover:bg-green-50 transition-all text-sm">
                See How It Works
              </a>
            </div>
          </FadeSection>
          <FadeSection>
            <WhatsAppChat messages={heroMessages} />
          </FadeSection>
        </div>
      </div>
    </section>
  )
}

function StatsBar() {
  return (
    <section className="bg-[#0f1c14] py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {statsData.map((s, i) => (
            <FadeSection key={i} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-[#c85b1a]">{s.value}</div>
              <div className="text-gray-400 text-sm mt-1 leading-relaxed">{s.desc}</div>
            </FadeSection>
          ))}
        </div>
      </div>
    </section>
  )
}

function Problem() {
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeSection>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-4">
            The Rehabilitation Gap is Real
          </h2>
        </FadeSection>
        <div className="grid md:grid-cols-3 gap-8 mt-12">
          {problemCards.map((card, i) => (
            <FadeSection key={i}>
              <div className="bg-red-50/50 border border-red-100 rounded-2xl p-8 text-center hover:shadow-md hover:-translate-y-0.5 transition-all">
                <div className="w-14 h-14 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  {card.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{card.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{card.desc}</p>
              </div>
            </FadeSection>
          ))}
        </div>
        <FadeSection>
          <div className="text-center mt-16">
            <div className="inline-flex items-center gap-3 text-lg font-semibold text-[#16a34a] bg-green-50 border border-green-200 rounded-full px-6 py-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
              Rehabot Africa changes that.
            </div>
          </div>
        </FadeSection>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeSection>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-4">
            From Discharge to Recovery — Automatically
          </h2>
        </FadeSection>
        <div className="relative mt-16">
          <div className="hidden lg:block absolute top-14 left-[12.5%] right-[12.5%] h-0.5 bg-[#16a34a]/30" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0 relative">
            {steps.map((step, i) => (
              <FadeSection key={i} className="relative flex flex-col items-center text-center lg:px-4">
                <div className="w-14 h-14 rounded-2xl bg-[#16a34a] text-white font-bold text-xl flex items-center justify-center mb-5 shadow-md relative z-10">
                  {step.num}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed max-w-xs">{step.desc}</p>
              </FadeSection>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section id="features" className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeSection>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-4">
            Built for African Physiotherapy
          </h2>
        </FadeSection>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {features.map((f, i) => (
            <FadeSection key={i}>
              <div className="bg-white rounded-2xl p-7 border border-[#16a34a]/20 shadow-sm hover:shadow-md hover:border-[#16a34a]/50 hover:-translate-y-0.5 transition-all group">
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:bg-[#16a34a] group-hover:text-white transition-all">
                  {f.emoji}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            </FadeSection>
          ))}
        </div>
      </div>
    </section>
  )
}

function WhatsAppPreview() {
  const painMessages = [
    { side: 'left', text: 'Je unajisikiaje leo? Tupa nambari 1-10 kuonyesha maumivu yako' },
    { side: 'right', text: '4' },
    { side: 'left', text: 'Asante! Tumesajili maumivu yako: 4/10. Daktari wako ataona hii. 🙏' }
  ]

  return (
    <section className="py-20 md:py-28 bg-[#0f1c14]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeSection>
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            What Your Patients Experience
          </h2>
        </FadeSection>
        <div className="grid md:grid-cols-2 gap-12 items-center mt-12">
          <FadeSection>
            <p className="text-gray-300 text-lg leading-relaxed">
              Your patients don't need to download anything. They don't need internet beyond basic WhatsApp data. They just receive a message every morning and reply when done.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <div className="flex -space-x-2">
                {[1,2,3,4].map(n => (
                  <div key={n} className="w-10 h-10 rounded-full bg-[#16a34a]/30 border-2 border-[#0f1c14] flex items-center justify-center text-xs font-bold text-white">P{n}</div>
                ))}
              </div>
              <span className="text-gray-400 text-sm">Joined by physios across Tanzania</span>
            </div>
          </FadeSection>
          <FadeSection>
            <WhatsAppChat messages={painMessages} />
          </FadeSection>
        </div>
      </div>
    </section>
  )
}

function Pricing() {
  const navigate = useNavigate()

  return (
    <section id="pricing" className="py-20 md:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeSection>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-4">
            Affordable for African Clinics
          </h2>
        </FadeSection>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-12">
          {plans.map((plan, i) => (
            <FadeSection key={i}>
              <div className={`relative bg-white rounded-2xl border-2 p-8 flex flex-col transition-all hover:shadow-lg ${
                plan.highlighted ? 'border-[#16a34a] shadow-lg shadow-green-100 scale-[1.02]' : 'border-gray-100 hover:border-[#16a34a]/40'
              }`}>
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#c85b1a] text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                    {plan.badge}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-500 text-sm">{plan.period}</span>
                  </div>
                  <p className="text-gray-500 text-sm mt-1">{plan.patients}</p>
                  <ul className="mt-6 space-y-3">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2.5 text-sm text-gray-600">
                        <svg className="w-4 h-4 text-[#16a34a] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-8">
                  <button onClick={() => navigate('/register')} className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                    plan.highlighted
                      ? 'bg-[#c85b1a] text-white hover:bg-orange-700 shadow-md'
                      : plan.name === 'Free Trial'
                        ? 'bg-[#16a34a] text-white hover:bg-green-700 shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-green-100 hover:text-green-700'
                  }`}>
                    {plan.cta}
                  </button>
                </div>
                {plan.highlighted && (
                  <p className="text-center text-xs text-gray-400 mt-3">Save 20% with annual billing</p>
                )}
              </div>
            </FadeSection>
          ))}
        </div>
      </div>
    </section>
  )
}

function Trust() {
  return (
    <section className="py-16 md:py-20 bg-white border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <FadeSection>
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-8">Built on Trusted Technology</p>
        </FadeSection>
        <FadeSection>
          <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16">
            {[
              { name: 'WhatsApp', color: '#25d366' },
              { name: 'Claude AI', color: '#16a34a' },
              { name: 'Supabase', color: '#3ecf8e' },
              { name: 'Vercel', color: '#000' }
            ].map((brand) => (
              <div key={brand.name} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg" style={{ backgroundColor: brand.color }} />
                <span className="text-sm font-semibold text-gray-700">{brand.name}</span>
              </div>
            ))}
          </div>
          <p className="text-gray-400 text-sm mt-8 max-w-2xl mx-auto">
            Rehabot Africa is built on enterprise-grade infrastructure trusted by millions of businesses worldwide.
          </p>
        </FadeSection>
      </div>
    </section>
  )
}

function FAQ() {
  const [openIndex, setOpenIndex] = useState(null)

  return (
    <section className="py-20 md:py-28 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeSection>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
            Frequently Asked Questions
          </h2>
        </FadeSection>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <FadeSection key={i}>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left"
                >
                  <span className="font-medium text-gray-900 text-sm">{faq.q}</span>
                  <svg className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${openIndex === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                {openIndex === i && (
                  <div className="px-6 pb-4 text-sm text-gray-500 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            </FadeSection>
          ))}
        </div>
      </div>
    </section>
  )
}

function FinalCTA() {
  const navigate = useNavigate()

  return (
    <section className="bg-[#16a34a] py-20 md:py-28">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <FadeSection>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Start Helping Patients Today
          </h2>
          <p className="text-green-100 text-lg mb-10">
            Join physiotherapists across Tanzania using Rehabot Africa
          </p>
          <button onClick={() => navigate('/register')} className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#16a34a] font-bold rounded-xl hover:bg-gray-50 shadow-lg transition-all text-lg">
            Create Free Account
          </button>
          <p className="text-green-200 text-sm mt-4">No credit card required. 14-day free trial. Cancel anytime.</p>
        </FadeSection>
      </div>
    </section>
  )
}

function Footer() {
  const navigate = useNavigate()

  return (
    <footer id="contact" className="bg-[#0f1c14] text-gray-400 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-[#16a34a] rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
              </div>
              <div className="leading-tight">
                <div className="text-sm font-bold text-white -mb-0.5">Rehabot</div>
                <div className="text-[10px] font-medium text-[#16a34a] tracking-wider uppercase">Africa</div>
              </div>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-gray-400">
              Rehabot Africa is built by Darva Health, a health technology startup based in Dar es Salaam, Tanzania. Our mission is to make rehabilitation accessible to every patient regardless of location.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <a href="#" className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#16a34a] transition-colors">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
              </a>
              <a href="mailto:hello@rehabot.africa" className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#16a34a] transition-colors">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Product</h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#features" className="hover:text-[#16a34a] transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-[#16a34a] transition-colors">Pricing</a></li>
              <li><button onClick={() => navigate('/login')} className="hover:text-[#16a34a] transition-colors">Login</button></li>
              <li><button onClick={() => navigate('/register')} className="hover:text-[#16a34a] transition-colors">Register</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Support</h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#contact" className="hover:text-[#16a34a] transition-colors">Contact Us</a></li>
              <li><a href="#" className="hover:text-[#16a34a] transition-colors">WhatsApp Support</a></li>
              <li><a href="#" className="hover:text-[#16a34a] transition-colors">Documentation</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4 text-sm">Legal</h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#" className="hover:text-[#16a34a] transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-[#16a34a] transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <p className="text-gray-500">&copy; 2026 Rehabot Africa by Darva Health. Built in Tanzania 🇹🇿</p>
          <p className="text-gray-500">Rehabilitation, within reach</p>
        </div>
      </div>
    </footer>
  )
}

export default function Landing() {
  useScrollReveal()

  return (
    <div className="min-h-screen bg-white font-sans">
      <Navbar />
      <Hero />
      <StatsBar />
      <Problem />
      <HowItWorks />
      <Features />
      <WhatsAppPreview />
      <Pricing />
      <Trust />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  )
}
