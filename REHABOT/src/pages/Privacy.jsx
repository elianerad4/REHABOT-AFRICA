import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import Logo from '../components/ui/Logo'
import { privacyPolicy } from '../config/legal'

function Block({ block }) {
  if (block.type === 'h3') {
    return <h3 className="text-base font-display font-semibold text-neutral-900 dark:text-white mt-6 mb-2">{block.text}</h3>
  }
  if (block.type === 'ul') {
    return (
      <ul className="list-disc pl-5 space-y-1.5 text-neutral-600 dark:text-neutral-300 marker:text-primary-500">
        {block.items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    )
  }
  return (
    <p className={`text-neutral-600 dark:text-neutral-300 leading-relaxed ${block.strong ? 'font-semibold text-neutral-900 dark:text-white' : ''}`}>
      {block.text}
    </p>
  )
}

export default function Privacy() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white dark:bg-surface-dark">
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-surface-dark/90 backdrop-blur-sm border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200">
            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
            Back
          </button>
          <Logo size="sm" />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 sm:px-6 py-12 grid lg:grid-cols-[220px_1fr] gap-12">
        <nav aria-label="Table of contents" className="hidden lg:block">
          <div className="sticky top-24 space-y-1">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-3">On this page</p>
            {privacyPolicy.sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block text-sm text-neutral-500 hover:text-primary-600 dark:text-neutral-400 dark:hover:text-primary-400 py-1 leading-snug"
              >
                {s.heading}
              </a>
            ))}
          </div>
        </nav>

        <article className="max-w-[70ch]">
          <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wide mb-2">Legal</p>
          <h1 className="text-3xl font-display font-bold text-neutral-900 dark:text-white mb-2">{privacyPolicy.title}</h1>
          <p className="text-sm text-neutral-400 dark:text-neutral-500 mb-8">Last Updated: {privacyPolicy.lastUpdated}</p>

          <div className="space-y-4 mb-10 pb-10 border-b border-neutral-100 dark:border-neutral-800">
            {privacyPolicy.intro.map((p, i) => (
              <p key={i} className="text-neutral-600 dark:text-neutral-300 leading-relaxed">{p}</p>
            ))}
          </div>

          <div className="space-y-12">
            {privacyPolicy.sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-24">
                <h2 className="text-xl font-display font-bold text-neutral-900 dark:text-white mb-3">{section.heading}</h2>
                <div className="space-y-3">
                  {section.body.map((block, i) => (
                    <Block key={i} block={block} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </article>
      </div>
    </div>
  )
}
