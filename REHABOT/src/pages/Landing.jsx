import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/ui/Logo'

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How it Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'Contact', href: '#contact' }
]

const stats = [
  {
    emoji: '🏥',
    value: 'Less than 100',
    desc: 'physiotherapists serve 65 million Tanzanians'
  },
  {
    emoji: '📊',
    value: 'Over 50%',
    desc: 'of patients abandon treatment after discharge'
  },
  {
    emoji: '📄',
    value: 'Near-zero',
    desc: 'adherence tracking with paper exercise handouts'
  }
]

const steps = [
  {
    num: '1',
    title: 'Create Patient Profile',
    desc: 'Add your patient and assign exercises from the library'
  },
  {
    num: '2',
    title: 'WhatsApp Reminders',
    desc: 'Rehabot sends daily WhatsApp reminders in Swahili or English'
  },
  {
    num: '3',
    title: 'Patient Replies',
    desc: 'Patients reply to confirm exercises and rate their pain'
  },
  {
    num: '4',
    title: 'Track Progress',
    desc: 'You see adherence rates and pain trends on your dashboard'
  }
]

const features = [
  { emoji: '💬', title: 'WhatsApp Native', desc: 'Works on any phone. No app download required.' },
  { emoji: '🤖', title: 'AI in Swahili', desc: 'Claude AI responds to patient questions in Swahili and English' },
  { emoji: '📈', title: 'Pain Tracking', desc: 'Patients rate pain 1-10 daily. You see the trend.' },
  { emoji: '📋', title: 'Adherence Dashboard', desc: 'See which patients are doing their exercises and which are not' },
  { emoji: '📄', title: 'Weekly PDF Reports', desc: 'Auto-generated reports for each patient every week' },
  { emoji: '🏋️', title: 'Exercise Library', desc: '15+ physiotherapy exercises with Swahili and English names' }
]

const plans = [
  {
    name: 'Free Trial',
    price: 'Free',
    period: '14 days',
    patients: 'Up to 10 patients',
    features: ['Full features', 'No credit card'],
    cta: 'Get Started',
    highlighted: false
  },
  {
    name: 'Starter',
    price: 'TZS 50,000',
    period: '/month',
    patients: 'Up to 30 patients',
    features: ['All features', 'WhatsApp support'],
    cta: 'Start Free Trial',
    highlighted: true
  },
  {
    name: 'Pro',
    price: 'TZS 120,000',
    period: '/month',
    patients: 'Unlimited patients',
    features: ['Priority support', 'Custom exercises'],
    cta: 'Start Free Trial',
    highlighted: false
  }
]

const testimonials = [
  {
    initials: 'JM',
    quote: 'Rehabot has completely transformed how we follow up with our patients. Adherence rates have doubled since we started using it.',
    name: 'Dr. James Mwangi',
    clinic: 'Kilimanjaro Physiotherapy Centre'
  },
  {
    initials: 'AM',
    quote: 'The Swahili support is a game-changer. Our patients finally understand their exercises and actually do them.',
    name: 'Amina Mohammed',
    clinic: 'Dar es Salaam Sports Rehab Clinic'
  },
  {
    initials: 'PN',
    quote: 'The automated WhatsApp reminders save us hours of manual follow-up calls every week. Worth every shilling.',
    name: 'Peter Ndung\'u',
    clinic: 'Mwanza General Hospital Physio Dept'
  }
]

function Navbar() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <a href="#" className="flex-shrink-0">
            <Logo />
          </a>
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map(link => (
              <a key={link.href} href={link.href} className="text-sm font-medium text-gray-600 hover:text-green-600 transition-colors">
                {link.label}
              </a>
            ))}
          </div>
          <div className="hidden md:flex items-center gap-3">
            <button onClick={() => navigate('/login')} className="px-5 py-2 text-sm font-medium text-green-700 border border-green-300 rounded-lg hover:bg-green-50 transition-all">
              Login
            </button>
            <button onClick={() => navigate('/register')} className="px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 shadow-sm transition-all">
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
          <div className="md:hidden pb-4 border-t border-gray-100 pt-4">
            <div className="flex flex-col gap-3">
              {navLinks.map(link => (
                <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="text-sm font-medium text-gray-600 hover:text-green-600 transition-colors">
                  {link.label}
                </a>
              ))}
              <hr className="border-gray-100" />
              <button onClick={() => { setOpen(false); navigate('/login') }} className="w-full px-4 py-2 text-sm font-medium text-green-700 border border-green-300 rounded-lg hover:bg-green-50 transition-all text-center">
                Login
              </button>
              <button onClick={() => { setOpen(false); navigate('/register') }} className="w-full px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-all text-center">
                Get Started Free
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

function Hero() {
  const navigate = useNavigate()

  return (
    <section id="hero" className="pt-28 pb-16 md:pt-36 md:pb-24 bg-gradient-to-br from-white via-green-50/40 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
              Rehabilitation Follow-Up,{' '}
              <span className="text-green-600">Delivered on WhatsApp</span>
            </h1>
            <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-xl">
              Rehabot Africa helps physiotherapists in Tanzania keep patients on track between sessions — through daily AI-powered WhatsApp reminders, pain tracking, and exercise guidance. No app downloads. No internet barriers. Just WhatsApp.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <button onClick={() => navigate('/register')} className="px-7 py-3.5 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 shadow-lg shadow-green-200 transition-all">
                Get Started Free
              </button>
              <a href="#how-it-works" className="inline-flex items-center gap-2 px-7 py-3.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl hover:border-green-300 hover:text-green-700 transition-all">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                Watch How It Works
              </a>
            </div>
          </div>
          <div className="flex justify-center">
            <WhatsAppChat />
          </div>
        </div>
      </div>
    </section>
  )
}

function WhatsAppChat() {
  const messages = [
    { side: 'left', text: 'Habari Juma! Your exercises for today: Knee Extensions 3x10, Hip Abduction 3x15. Reply YES when done.' },
    { side: 'right', text: 'NDIYO' },
    { side: 'left', text: 'Hongera! Great work today. We will check your pain level shortly.' },
    { side: 'right', text: 'My knee hurts a bit today' },
    { side: 'left', text: 'That is normal after exercise. Rest for 20 minutes and apply ice if needed. Contact your physio if pain is above 7/10.' }
  ]

  return (
    <div className="w-[300px] sm:w-[340px] bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">
      <div className="bg-[#075e54] px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-[#25d366] flex items-center justify-center text-white text-xs font-bold">RB</div>
        <div className="flex-1 min-w-0">
          <div className="text-white text-sm font-semibold">Rehabot Africa</div>
          <div className="text-[#b0d4d0] text-xs">AI Assistant</div>
        </div>
        <svg className="w-5 h-5 text-white/80" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
      </div>
      <div className="bg-[#efeae2] p-3 space-y-2.5 min-h-[360px] flex flex-col justify-end">
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
          <div className="w-9 h-9 rounded-full bg-[#25d366] flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.75 12.75 9 18l12-12" /></svg>
          </div>
        </div>
      </div>
    </div>
  )
}

function Problem() {
  return (
    <section className="bg-[#0f1c14] py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-16">
          The Hidden Rehabilitation Crisis
        </h2>
        <div className="grid sm:grid-cols-3 gap-8">
          {stats.map((s, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 text-center hover:bg-white/10 transition-all group">
              <div className="text-5xl mb-5 group-hover:scale-110 transition-transform inline-block">{s.emoji}</div>
              <div className="text-2xl font-bold text-white mb-2">{s.value}</div>
              <div className="text-gray-400 text-sm leading-relaxed">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-4">
          Simple for Physios. Powerful for Patients.
        </h2>
        <p className="text-gray-500 text-center max-w-xl mx-auto mb-16">Four steps to transform your rehabilitation follow-up</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="relative text-center group">
              <div className="w-14 h-14 rounded-2xl bg-green-100 text-green-700 font-bold text-xl flex items-center justify-center mx-auto mb-5 group-hover:bg-green-600 group-hover:text-white transition-all shadow-md">
                {step.num}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-7 left-[60%] w-[calc(80%)] h-px border-t-2 border-dashed border-green-200" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section id="features" className="py-20 md:py-28 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-16">
          Everything a physiotherapist needs
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="bg-white rounded-2xl p-7 border border-gray-100 shadow-sm hover:shadow-md hover:border-green-200 hover:-translate-y-0.5 transition-all group">
              <div className="text-3xl mb-4 group-hover:scale-110 transition-transform inline-block">{f.emoji}</div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function WhatsAppPreview() {
  const messages2 = [
    { side: 'left', name: 'Rehabot', text: 'Habari Juma! Your exercises for today: Knee Extensions 3x10, Hip Abduction 3x15. Reply YES when done.' },
    { side: 'right', name: 'Patient', text: 'NDIYO' },
    { side: 'left', name: 'Rehabot', text: 'Hongera! Great work today. We will check your pain level shortly.' },
    { side: 'right', name: 'Patient', text: 'My knee hurts a bit today' },
    { side: 'left', name: 'Rehabot', text: 'That is normal after exercise. Rest for 20 minutes and apply ice if needed. Contact your physio if pain is above 7/10.' }
  ]

  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-4">
          What your patients see on WhatsApp
        </h2>
        <p className="text-gray-500 text-center max-w-xl mx-auto mb-12">A seamless experience your patients already know how to use</p>
        <div className="flex justify-center">
          <div className="w-[360px] sm:w-[400px] bg-white rounded-[28px] shadow-2xl border-4 border-gray-800 overflow-hidden">
            <div className="bg-gray-800 px-5 py-4 flex items-center gap-3">
              <svg className="w-2.5 h-2.5 text-gray-400" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="currentColor"/></svg>
              <svg className="w-2.5 h-2.5 text-gray-400" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="currentColor"/></svg>
              <svg className="w-2.5 h-2.5 text-gray-400" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill="currentColor"/></svg>
              <div className="flex-1 text-center text-xs text-gray-300 font-medium">WhatsApp</div>
              <div className="w-5" />
            </div>
            <div className="bg-[#efeae2] p-3.5 space-y-2.5 min-h-[400px] flex flex-col justify-end">
              {messages2.map((msg, i) => (
                <div key={i} className={`flex ${msg.side === 'left' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[88%] px-4 py-2.5 rounded-xl text-sm leading-relaxed shadow-sm ${
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
                <div className="w-9 h-9 rounded-full bg-[#25d366] flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.75 12.75 9 18l12-12" /></svg>
                </div>
              </div>
            </div>
          </div>
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
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-4">
          Simple, affordable pricing for African clinics
        </h2>
        <p className="text-gray-500 text-center max-w-xl mx-auto mb-12">Start free, upgrade when you need more</p>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <div key={i} className={`relative bg-white rounded-2xl border-2 p-8 flex flex-col transition-all hover:shadow-lg ${
              plan.highlighted ? 'border-green-500 shadow-lg shadow-green-100 scale-[1.02] md:scale-105' : 'border-gray-100 hover:border-green-200'
            }`}>
              {plan.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                  Most Popular
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
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-8">
                <button onClick={() => navigate('/register')} className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
                  plan.highlighted
                    ? 'bg-green-600 text-white hover:bg-green-700 shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-green-100 hover:text-green-700'
                }`}>
                  {plan.cta}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Testimonials() {
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-16">
          Trusted by physiotherapists across Tanzania
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-gray-50 rounded-2xl p-8 border border-gray-100 hover:shadow-md hover:border-green-200 transition-all">
              <div className="w-14 h-14 rounded-full bg-green-600 text-white font-bold text-lg flex items-center justify-center mb-5">
                {t.initials}
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-6 italic">"{t.quote}"</p>
              <div>
                <div className="font-bold text-gray-900 text-sm">{t.name}</div>
                <div className="text-gray-500 text-xs mt-0.5">{t.clinic}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function CTA() {
  const navigate = useNavigate()

  return (
    <section className="bg-[#0f1c14] py-20 md:py-28">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
          Ready to transform your rehabilitation practice?
        </h2>
        <p className="text-gray-400 text-lg mb-10">
          Join physiotherapists across Tanzania using Rehabot Africa to keep patients on track
        </p>
        <button onClick={() => navigate('/register')} className="inline-flex items-center gap-2 px-8 py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg shadow-green-900/30 transition-all text-lg">
          Start Your Free Trial Today
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" /></svg>
        </button>
      </div>
    </section>
  )
}

function Footer() {
  const navigate = useNavigate()

  return (
    <footer id="contact" className="bg-gray-900 text-gray-400 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <Logo />
            <p className="mt-4 text-sm leading-relaxed">Rehabilitation, within reach</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Links</h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#features" className="hover:text-green-400 transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-green-400 transition-colors">Pricing</a></li>
              <li><button onClick={() => navigate('/login')} className="hover:text-green-400 transition-colors">Login</button></li>
              <li><button onClick={() => navigate('/register')} className="hover:text-green-400 transition-colors">Register</button></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Contact</h4>
            <ul className="space-y-2.5 text-sm">
              <li>Built by Darva Health</li>
              <li>Dar es Salaam, Tanzania</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Legal</h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#" className="hover:text-green-400 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-green-400 transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-gray-800 text-sm text-center">
          &copy; 2026 Rehabot Africa. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <Problem />
      <HowItWorks />
      <Features />
      <WhatsAppPreview />
      <Pricing />
      <Testimonials />
      <CTA />
      <Footer />
    </div>
  )
}
