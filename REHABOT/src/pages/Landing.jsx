import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import {
  Menu, X, ChevronDown, ArrowRight, ShieldAlert, FileWarning, EyeOff, ArrowRight as ArrowRightSm,
  Smartphone, Bot, Activity, CheckCircle2, FileText, Dumbbell, ShieldCheck, Lock, Stethoscope, Check
} from 'lucide-react'
import Logo from '../components/ui/Logo'
import Button from '../components/ui/Button'

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
    icon: ShieldAlert,
    title: 'Fewer than 100 physiotherapists',
    desc: 'Tanzania has fewer than 100 physiotherapists for 65 million people'
  },
  {
    icon: FileWarning,
    title: 'Paper handouts, zero follow-up',
    desc: 'Patients leave with a paper handout and zero follow-up'
  },
  {
    icon: EyeOff,
    title: 'No tracking, no insight',
    desc: 'Without tracking, physios have no idea if patients are doing their exercises'
  }
]

const steps = [
  { num: '1', title: 'Add Patient', desc: 'Enter name, phone, diagnosis and assign exercises from the library' },
  { num: '2', title: 'Reminders Sent', desc: 'Patient receives daily WhatsApp message in Swahili or English at their preferred time' },
  { num: '3', title: 'Patient Replies', desc: 'They confirm exercises, rate pain 1-10, ask questions. AI responds instantly.' },
  { num: '4', title: 'You See Everything', desc: 'Dashboard shows adherence rates, pain trends, and weekly PDF reports' }
]

const features = [
  { icon: Smartphone, title: 'WhatsApp Native', desc: 'Works on any phone. Zero app downloads. Zero data barriers.' },
  { icon: Bot, title: 'AI in Swahili', desc: 'Claude AI answers patient questions in Swahili and English, 24/7' },
  { icon: Activity, title: 'Pain Tracking', desc: 'Daily pain scores logged automatically. See trends over time.' },
  { icon: CheckCircle2, title: 'Adherence Dashboard', desc: 'Know exactly which patients are doing their exercises' },
  { icon: FileText, title: 'Weekly PDF Reports', desc: 'Auto-generated patient reports every Sunday' },
  { icon: Dumbbell, title: 'Exercise Library', desc: '15+ physiotherapy exercises with Swahili and English names' }
]

const trustSignals = [
  { icon: Lock, title: 'Encrypted by default', desc: 'Patient data is encrypted in transit and stored on secure infrastructure.' },
  { icon: ShieldCheck, title: 'Official WhatsApp Business API', desc: 'Messages are sent through Meta’s official Cloud API, not a workaround.' },
  { icon: Stethoscope, title: 'Built with physiotherapists', desc: 'Designed and reviewed alongside practicing clinicians in Tanzania.' }
]

const plans = [
  { name: 'Free Trial', price: 'Free', period: '14 days', patients: 'Up to 10 patients', features: ['All features included', 'No credit card needed'], cta: 'Start Free Trial', highlighted: false },
  { name: 'Starter', price: 'TZS 50,000', period: '/month', patients: 'Up to 30 patients', features: ['All features included', 'WhatsApp support'], cta: 'Get Started', highlighted: true, badge: 'Most Popular' },
  { name: 'Pro', price: 'TZS 120,000', period: '/month', patients: 'Unlimited patients', features: ['Priority support', 'Custom exercises', 'API access'], cta: 'Contact Us', highlighted: false }
]

const faqs = [
  { q: 'Do patients need to download an app?', a: 'No. Everything works through WhatsApp which is already on their phone.' },
  { q: 'What languages does Rehabot support?', a: 'Swahili and English. Patients choose their preferred language when registered.' },
  { q: 'How much does it cost after the free trial?', a: 'Starting from TZS 50,000 per month for up to 30 patients.' },
  { q: 'Is patient data secure?', a: 'Yes. All data is encrypted and stored on Supabase secure servers.' },
  { q: 'Can I use my existing phone number?', a: 'We recommend a dedicated SIM for Rehabot Africa to keep business and personal separate.' },
  { q: 'What happens if a patient doesn\'t reply?', a: 'The system logs the missed day. You can see non-responding patients on your dashboard.' }
]

const EASE = [0.22, 1, 0.36, 1]
const fadeUp = { hidden: { opacity: 0, y: 28 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } } }
const staggerContainer = { hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } } }

function Reveal({ children, className = '', delay = 0 }) {
  return (
    <motion.div className={className} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={fadeUp} transition={{ delay }}>
      {children}
    </motion.div>
  )
}

function RevealGroup({ children, className = '' }) {
  return (
    <motion.div className={className} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.15 }} variants={staggerContainer}>
      {children}
    </motion.div>
  )
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
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: EASE }}
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${scrolled ? 'bg-white/95 dark:bg-surface-dark/95 backdrop-blur-sm shadow-xs' : 'bg-transparent'}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <a href="#" className="flex-shrink-0"><Logo /></a>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                {link.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Button variant="secondary" size="md" onClick={() => navigate('/login')}>Login</Button>
            <Button variant="primary" size="md" icon={ArrowRight} iconPosition="right" onClick={() => navigate('/register')}>
              Get Started Free
            </Button>
          </div>

          <button onClick={() => setOpen(!open)} className="md:hidden p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors" aria-label="Toggle menu">
            {open ? <X className="w-5 h-5" strokeWidth={2} /> : <Menu className="w-5 h-5" strokeWidth={2} />}
          </button>
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: EASE }}
              className="md:hidden overflow-hidden border-t border-neutral-100 dark:border-neutral-800"
            >
              <div className="flex flex-col gap-3 pb-5 pt-4">
                {navLinks.map((link) => (
                  <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-primary-600 py-1">
                    {link.label}
                  </a>
                ))}
                <hr className="border-neutral-100 dark:border-neutral-800 my-1" />
                <Button variant="secondary" onClick={() => { setOpen(false); navigate('/login') }}>Login</Button>
                <Button onClick={() => { setOpen(false); navigate('/register') }}>Get Started Free</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  )
}

function WhatsAppChat({ messages, animateIn = false }) {
  return (
    <div className="w-[300px] sm:w-[340px] bg-white rounded-3xl shadow-popover border border-neutral-200 overflow-hidden mx-auto">
      <div className="bg-whatsapp-dark px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          RA
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-semibold">Rehabot Africa</span>
            <motion.span className="w-2 h-2 rounded-full bg-whatsapp inline-block" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} />
          </div>
          <div className="text-white/60 text-xs">online</div>
        </div>
      </div>
      <div className="bg-[#efeae2] p-3 space-y-2.5 min-h-[360px] flex flex-col justify-end">
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={animateIn ? { opacity: 0, y: 12, scale: 0.96 } : false}
            whileInView={animateIn ? { opacity: 1, y: 0, scale: 1 } : undefined}
            viewport={animateIn ? { once: true } : undefined}
            transition={{ duration: 0.35, delay: animateIn ? i * 0.45 : 0, ease: EASE }}
            className={`flex ${msg.side === 'left' ? 'justify-start' : 'justify-end'}`}
          >
            <div className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-sm leading-relaxed shadow-xs ${msg.side === 'left' ? 'bg-white text-neutral-800 rounded-bl-sm' : 'bg-whatsapp/25 text-neutral-800 rounded-br-sm'}`}>
              {msg.text}
            </div>
          </motion.div>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <div className="flex-1 bg-white rounded-full px-4 py-2 text-sm text-neutral-400 border border-neutral-200">Type a message…</div>
          <div className="w-9 h-9 rounded-full bg-whatsapp flex items-center justify-center flex-shrink-0">
            <ArrowRightSm className="w-4 h-4 text-white -rotate-45" strokeWidth={2.5} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Hero() {
  const navigate = useNavigate()

  return (
    <section id="hero" className="pt-28 pb-16 md:pt-36 md:pb-24 bg-gradient-to-b from-primary-50/50 to-white dark:from-primary-500/5 dark:to-surface-dark overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial="hidden" animate="show" variants={staggerContainer}>
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/30 rounded-full px-4 py-1.5 text-xs font-medium text-primary-700 dark:text-primary-300 mb-6">
              <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
              AI-Powered WhatsApp Follow-Up
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-neutral-900 dark:text-white leading-[1.1]">
              Keep Every Patient on Track — <span className="text-primary-600 dark:text-primary-400">Automatically</span>
            </motion.h1>
            <motion.p variants={fadeUp} className="mt-6 text-lg text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-xl">
              Rehabot Africa sends daily exercise reminders, collects pain scores, and answers patient questions in Swahili — all through WhatsApp. No app. No barriers. Just results.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-4">
              <Button size="lg" icon={ArrowRight} iconPosition="right" onClick={() => navigate('/register')}>Start Free Trial</Button>
              <Button as="a" href="#how-it-works" variant="secondary" size="lg">See How It Works</Button>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: EASE }}
            className="relative"
          >
            <div className="rounded-2xl overflow-hidden shadow-popover border border-neutral-200/60 dark:border-neutral-800">
              <img
                src="/images/hero-physio-session-sm.webp"
                srcSet="/images/hero-physio-session-sm.webp 640w, /images/hero-physio-session.webp 1200w"
                sizes="(min-width: 768px) 480px, 90vw"
                alt="A physiotherapist assisting a patient through a guided exercise in a clinic setting"
                loading="eager"
                width={480}
                height={720}
                className="w-full h-full object-cover aspect-[4/5]"
              />
            </div>
            <div className="absolute -bottom-5 -left-5 hidden sm:flex items-center gap-3 bg-white dark:bg-surface-dark-raised rounded-xl shadow-popover border border-neutral-200 dark:border-neutral-800 px-4 py-3">
              <div className="w-9 h-9 rounded-full bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                <Smartphone className="w-4.5 h-4.5 text-primary-600 dark:text-primary-400" strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-white leading-tight">Delivered on WhatsApp</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-tight">No app install needed</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

function StatsBar() {
  return (
    <section className="bg-neutral-900 dark:bg-black/40 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <RevealGroup className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {statsData.map((s, i) => (
            <motion.div key={i} variants={fadeUp} className="text-center">
              <div className="text-3xl md:text-4xl font-display font-bold text-primary-400">{s.value}</div>
              <div className="text-neutral-400 text-sm mt-1 leading-relaxed">{s.desc}</div>
            </motion.div>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}

function Problem() {
  return (
    <section className="py-20 md:py-28 bg-white dark:bg-surface-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal><h2 className="text-3xl md:text-4xl font-display font-bold text-neutral-900 dark:text-white text-center mb-4">The Rehabilitation Gap is Real</h2></Reveal>
        <RevealGroup className="grid md:grid-cols-3 gap-8 mt-12">
          {problemCards.map((card, i) => (
            <motion.div key={i} variants={fadeUp} whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className="bg-danger-50/60 dark:bg-danger-500/5 border border-red-100 dark:border-red-900/40 rounded-xl p-8 text-center">
              <div className="w-14 h-14 bg-danger-50 dark:bg-danger-500/10 rounded-xl flex items-center justify-center mx-auto mb-5">
                <card.icon className="w-6 h-6 text-danger-500" strokeWidth={1.75} />
              </div>
              <h3 className="text-lg font-display font-semibold text-neutral-900 dark:text-white mb-2">{card.title}</h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed">{card.desc}</p>
            </motion.div>
          ))}
        </RevealGroup>
        <Reveal delay={0.1}>
          <div className="text-center mt-16">
            <div className="inline-flex items-center gap-3 text-base font-semibold text-primary-700 dark:text-primary-300 bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/30 rounded-full px-6 py-3">
              <ArrowRight className="w-5 h-5" strokeWidth={2} />
              Rehabot Africa changes that.
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  )
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-neutral-50 dark:bg-surface-dark-raised">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal><h2 className="text-3xl md:text-4xl font-display font-bold text-neutral-900 dark:text-white text-center mb-4">From Discharge to Recovery — Automatically</h2></Reveal>
        <div className="relative mt-16">
          <motion.div
            initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 1, ease: EASE }} style={{ transformOrigin: 'left' }}
            className="hidden lg:block absolute top-14 left-[12.5%] right-[12.5%] h-0.5 bg-primary-200 dark:bg-primary-500/30"
          />
          <RevealGroup className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0 relative">
            {steps.map((step, i) => (
              <motion.div key={i} variants={fadeUp} className="relative flex flex-col items-center text-center lg:px-4">
                <motion.div whileHover={{ scale: 1.12 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }} className="w-14 h-14 rounded-xl bg-primary-600 text-white font-display font-bold text-xl flex items-center justify-center mb-5 shadow-card relative z-10">
                  {step.num}
                </motion.div>
                <h3 className="text-lg font-display font-semibold text-neutral-900 dark:text-white mb-2">{step.title}</h3>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed max-w-xs">{step.desc}</p>
              </motion.div>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  )
}

function Features() {
  return (
    <section id="features" className="py-20 md:py-28 bg-white dark:bg-surface-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal><h2 className="text-3xl md:text-4xl font-display font-bold text-neutral-900 dark:text-white text-center mb-4">Built for African Physiotherapy</h2></Reveal>
        <RevealGroup className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
          {features.map((f, i) => (
            <motion.div key={i} variants={fadeUp} whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className="bg-white dark:bg-surface-dark-raised rounded-xl p-7 border border-primary-100 dark:border-primary-500/15 shadow-card group">
              <div className="w-12 h-12 bg-primary-50 dark:bg-primary-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-600 transition-colors duration-200">
                <f.icon className="w-5.5 h-5.5 text-primary-600 dark:text-primary-400 group-hover:text-white transition-colors duration-200" strokeWidth={1.75} />
              </div>
              <h3 className="text-lg font-display font-semibold text-neutral-900 dark:text-white mb-2">{f.title}</h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}

function TrustSignals() {
  return (
    <section className="py-20 md:py-28 bg-neutral-50 dark:bg-surface-dark-raised">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <Reveal className="order-2 lg:order-1">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-neutral-900 dark:text-white mb-4">
              Clinical-grade, by design
            </h2>
            <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed mb-8 max-w-lg">
              Rehabot is built to handle patient health information responsibly, on top of infrastructure clinicians can trust.
            </p>
            <div className="space-y-5">
              {trustSignals.map((t, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                    <t.icon className="w-5 h-5 text-primary-600 dark:text-primary-400" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-neutral-900 dark:text-white text-sm">{t.title}</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
          <Reveal className="order-1 lg:order-2">
            <div className="rounded-2xl overflow-hidden shadow-card border border-neutral-200 dark:border-neutral-800">
              <img
                src="/images/clinic-stretching-session-sm.webp"
                srcSet="/images/clinic-stretching-session-sm.webp 700w, /images/clinic-stretching-session.webp 1400w"
                sizes="(min-width: 1024px) 560px, 90vw"
                alt="A physiotherapist guiding a patient through a stretching exercise"
                loading="lazy"
                width={700}
                height={467}
                className="w-full h-full object-cover aspect-[3/2]"
              />
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function WhatsAppPreview() {
  const painMessages = [
    { side: 'left', text: 'Je unajisikiaje leo? Tupa nambari 1-10 kuonyesha maumivu yako' },
    { side: 'right', text: '4' },
    { side: 'left', text: 'Asante! Tumesajili maumivu yako: 4/10. Daktari wako ataona hii.' }
  ]

  return (
    <section className="py-20 md:py-28 bg-neutral-900 dark:bg-black/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal><h2 className="text-3xl md:text-4xl font-display font-bold text-white text-center mb-4">What Your Patients Experience</h2></Reveal>
        <div className="grid md:grid-cols-2 gap-12 items-center mt-12">
          <Reveal>
            <p className="text-neutral-300 text-lg leading-relaxed">
              Your patients don't need to download anything. They don't need internet beyond basic WhatsApp data. They just receive a message every morning and reply when done.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <div className="flex -space-x-2">
                {['A', 'M', 'J', 'F'].map((letter, n) => (
                  <motion.div
                    key={letter}
                    initial={{ opacity: 0, scale: 0, x: -10 }}
                    whileInView={{ opacity: 1, scale: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: n * 0.1, type: 'spring', stiffness: 260, damping: 18 }}
                    className="w-10 h-10 rounded-full bg-primary-500/20 border-2 border-neutral-900 flex items-center justify-center text-xs font-bold text-primary-200"
                  >
                    {letter}
                  </motion.div>
                ))}
              </div>
              <span className="text-neutral-400 text-sm">Joined by physios across Tanzania</span>
            </div>
          </Reveal>
          <Reveal><WhatsAppChat messages={painMessages} animateIn /></Reveal>
        </div>
      </div>
    </section>
  )
}

function Pricing() {
  const navigate = useNavigate()

  return (
    <section id="pricing" className="py-20 md:py-28 bg-white dark:bg-surface-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal><h2 className="text-3xl md:text-4xl font-display font-bold text-neutral-900 dark:text-white text-center mb-4">Affordable for African Clinics</h2></Reveal>
        <RevealGroup className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mt-12">
          {plans.map((plan, i) => (
            <motion.div
              key={i} variants={fadeUp} whileHover={{ y: -8 }} transition={{ type: 'spring', stiffness: 280, damping: 20 }}
              className={`relative bg-white dark:bg-surface-dark-raised rounded-xl border-2 p-8 flex flex-col ${plan.highlighted ? 'border-primary-500 shadow-popover scale-[1.02]' : 'border-neutral-200 dark:border-neutral-800 shadow-card'}`}
            >
              {plan.badge && (
                <motion.div initial={{ opacity: 0, y: -6 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.3 }} className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-primary-600 text-white text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                  {plan.badge}
                </motion.div>
              )}
              <div>
                <h3 className="text-lg font-display font-semibold text-neutral-900 dark:text-white mb-1">{plan.name}</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-display font-bold text-neutral-900 dark:text-white">{plan.price}</span>
                  <span className="text-neutral-500 dark:text-neutral-400 text-sm">{plan.period}</span>
                </div>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1">{plan.patients}</p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2.5 text-sm text-neutral-600 dark:text-neutral-300">
                      <Check className="w-4 h-4 text-primary-600 dark:text-primary-400 flex-shrink-0" strokeWidth={2.25} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-8">
                <Button variant={plan.highlighted ? 'primary' : 'secondary'} className="w-full" onClick={() => navigate('/register')}>
                  {plan.cta}
                </Button>
              </div>
              {plan.highlighted && <p className="text-center text-xs text-neutral-400 dark:text-neutral-500 mt-3">Save 20% with annual billing</p>}
            </motion.div>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}

function FAQ() {
  const [openIndex, setOpenIndex] = useState(null)

  return (
    <section className="py-20 md:py-28 bg-neutral-50 dark:bg-surface-dark-raised">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Reveal><h2 className="text-3xl md:text-4xl font-display font-bold text-neutral-900 dark:text-white text-center mb-12">Frequently Asked Questions</h2></Reveal>
        <RevealGroup className="space-y-4">
          {faqs.map((faq, i) => (
            <motion.div key={i} variants={fadeUp} className="bg-white dark:bg-surface-dark-raised rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
              <button onClick={() => setOpenIndex(openIndex === i ? null : i)} className="w-full px-6 py-4 flex items-center justify-between text-left focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary-500">
                <span className="font-medium text-neutral-900 dark:text-white text-sm">{faq.q}</span>
                <motion.span animate={{ rotate: openIndex === i ? 180 : 0 }} transition={{ duration: 0.25 }}>
                  <ChevronDown className="w-5 h-5 text-neutral-400 flex-shrink-0" strokeWidth={2} />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {openIndex === i && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: EASE }} className="overflow-hidden">
                    <div className="px-6 pb-4 text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{faq.a}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </RevealGroup>
      </div>
    </section>
  )
}

function FinalCTA() {
  const navigate = useNavigate()

  return (
    <section className="bg-primary-600 py-20 md:py-28">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <Reveal>
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">Start Helping Patients Today</h2>
          <p className="text-primary-100 text-lg mb-10">Join physiotherapists across Tanzania using Rehabot Africa</p>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="inline-block">
            <Button size="lg" className="!bg-white !text-primary-700 hover:!bg-neutral-50 shadow-lg" onClick={() => navigate('/register')}>
              Create Free Account
            </Button>
          </motion.div>
          <p className="text-primary-200 text-sm mt-4">No credit card required. 14-day free trial. Cancel anytime.</p>
        </Reveal>
      </div>
    </section>
  )
}

function Footer() {
  const navigate = useNavigate()

  return (
    <footer id="contact" className="bg-neutral-900 dark:bg-black/40 text-neutral-400 py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <Logo mono />
            <p className="mt-4 text-sm leading-relaxed text-neutral-400">
              Rehabot Africa is built by Darva Health, a health technology startup based in Dar es Salaam, Tanzania. Our mission is to make rehabilitation accessible to every patient regardless of location.
            </p>
          </div>

          <div>
            <h4 className="text-white font-display font-semibold mb-4 text-sm">Product</h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#features" className="hover:text-primary-400 transition-colors">Features</a></li>
              <li><a href="#pricing" className="hover:text-primary-400 transition-colors">Pricing</a></li>
              <li><button onClick={() => navigate('/login')} className="hover:text-primary-400 transition-colors">Login</button></li>
              <li><button onClick={() => navigate('/register')} className="hover:text-primary-400 transition-colors">Register</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-display font-semibold mb-4 text-sm">Support</h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#contact" className="hover:text-primary-400 transition-colors">Contact Us</a></li>
              <li><a href="#" className="hover:text-primary-400 transition-colors">WhatsApp Support</a></li>
              <li><a href="#" className="hover:text-primary-400 transition-colors">Documentation</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-display font-semibold mb-4 text-sm">Legal</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/privacy" className="hover:text-primary-400 transition-colors">Privacy Policy</Link></li>
              <li><a href="#" className="hover:text-primary-400 transition-colors">Terms of Service</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <p className="text-neutral-500">&copy; 2026 Rehabot Africa by Darva Health. Built in Tanzania.</p>
          <p className="text-neutral-500">Rehabilitation, within reach</p>
        </div>
      </div>
    </footer>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-white dark:bg-surface-dark font-sans">
      <Navbar />
      <Hero />
      <StatsBar />
      <Problem />
      <HowItWorks />
      <Features />
      <TrustSignals />
      <WhatsAppPreview />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </div>
  )
}
