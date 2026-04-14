import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  ClipboardPenLine,
  Clock3,
  MessageSquareText,
  PillBottle,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'

import BrandLogo from '@/components/branding/BrandLogo'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { getAppHomePath } from '@/utils/appRoutes'

const heroFeatures = [
  { icon: Brain, label: 'Behavior Decoder', tone: 'primary' },
  { icon: MessageSquareText, label: 'Exact scripts', tone: 'secondary' },
  { icon: ClipboardPenLine, label: 'Daily Log', tone: 'primary' },
  { icon: PillBottle, label: 'Medication tracker', tone: 'secondary' },
  { icon: Sparkles, label: 'AI fallback', tone: 'accent' },
]

const browseGroups = [
  'Repetition',
  'Agitation',
  'Sundowning',
  'Medication',
]

const responsePanels = [
  {
    title: "What's Happening",
    body: 'See the why in plain words.',
    tone:
      'border-[rgb(var(--theme-primary-strong-rgb)/0.9)] bg-[rgb(var(--theme-primary-soft-rgb)/0.88)] text-[rgb(var(--theme-primary-ink-rgb))]',
  },
  {
    title: 'What NOT to Do',
    body: 'Spot escalation triggers fast.',
    tone:
      'border-[rgb(var(--theme-secondary-strong-rgb)/0.92)] bg-[rgb(var(--theme-secondary-soft-rgb)/0.96)] text-[rgb(var(--theme-secondary-ink-rgb))]',
  },
  {
    title: 'What to Say Instead',
    body: 'Use exact calm scripts.',
    tone: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  {
    title: 'Why This Works',
    body: 'Keep the response grounded.',
    tone:
      'border-[rgb(var(--theme-border-rgb)/0.92)] bg-white text-[rgb(var(--theme-primary-ink-rgb))]',
  },
]

const logMoods = ['Calm', 'Anxious', 'Confused', 'Agitated']

const medicationRows = [
  { name: 'Donepezil', time: '8:00 AM', status: 'Taken' },
  { name: 'Vitamin D', time: '1:00 PM', status: 'Skipped' },
  { name: 'Evening dose', time: '8:30 PM', status: 'Due next' },
]

function FeatureChip({ icon: Icon, label, tone = 'primary', delay = 0, className }) {
  const toneClasses = {
    primary: 'theme-icon-primary',
    secondary: 'theme-icon-secondary',
    accent: 'theme-icon-accent',
  }

  return (
    <div
      className={cn('brochure-feature-chip brochure-reveal', className)}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span
        className={cn(
          'inline-flex h-10 w-10 shrink-0 items-center justify-center',
          toneClasses[tone] || toneClasses.primary
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="text-sm font-semibold text-foreground">{label}</span>
    </div>
  )
}

function SectionIntro({ eyebrow, title, description, points, reverse = false, children }) {
  return (
    <section className="brochure-section">
      <div className="brochure-section-grid">
        <div
          className={cn('brochure-section-copy brochure-reveal', reverse && 'lg:order-2')}
          style={{ animationDelay: '80ms' }}
        >
          <p className="brochure-kicker">{eyebrow}</p>
          <h2 className="brochure-section-title">{title}</h2>
          <p className="brochure-support mt-4">{description}</p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {points.map((point) => (
              <span key={point} className="brochure-pill-outline">
                <CheckCircle2 className="h-4 w-4" />
                {point}
              </span>
            ))}
          </div>
        </div>

        <div
          className={cn('brochure-visual-wrap brochure-reveal', reverse && 'lg:order-1')}
          style={{ animationDelay: '180ms' }}
        >
          {children}
        </div>
      </div>
    </section>
  )
}

function HeroVisual({ decoderHref }) {
  return (
    <div className="brochure-hero-visual">
      <div className="brochure-orb is-primary" />
      <div className="brochure-orb is-secondary" />
      <div className="brochure-orb is-accent" />

      <div className="brochure-floating-chip is-top brochure-reveal brochure-float-delayed">
        <Sparkles className="h-4 w-4 text-[rgb(var(--theme-secondary-rgb))]" />
        Short, clear support on hand
      </div>

      <div
        className="brochure-floating-chip is-bottom brochure-reveal brochure-float-delayed"
        style={{ animationDelay: '320ms' }}
      >
        <ShieldCheck className="h-4 w-4 text-emerald-700" />
        Built for the stressful moments
      </div>

      <div className="brochure-visual-stage">
        <div className="brochure-device brochure-reveal brochure-float" style={{ animationDelay: '160ms' }}>
          <div className="brochure-device-frame">
            <div className="brochure-notch" />

            <div className="brochure-mini-card is-primary">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[rgb(var(--theme-primary-ink-rgb))]">
                What&apos;s happening right now?
              </p>
              <Link to={decoderHref} className="brochure-device-cta mt-3">
                <span>Open Behavior Decoder</span>
                <ArrowRight className="brochure-device-cta-arrow h-4 w-4" />
              </Link>
            </div>

            <div className="brochure-device-grid">
              <div className="brochure-mini-card">
                <div className="flex items-center gap-2">
                  <span className="theme-icon-primary inline-flex h-8 w-8 items-center justify-center">
                    <ClipboardPenLine className="h-4 w-4" />
                  </span>
                  <p className="text-sm font-semibold text-foreground">Daily Log</p>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  Mood chips + a quick note.
                </p>
              </div>

              <div className="brochure-mini-card">
                <div className="flex items-center gap-2">
                  <span className="theme-icon-secondary inline-flex h-8 w-8 items-center justify-center">
                    <PillBottle className="h-4 w-4" />
                  </span>
                  <p className="text-sm font-semibold text-foreground">Meds</p>
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  Upcoming doses stay visible.
                </p>
              </div>
            </div>

            <div className="brochure-mini-card mt-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                    Last lookup
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[rgb(var(--theme-primary-ink-rgb))]">
                    Refusing to shower
                  </p>
                </div>
                <span className="brochure-chip-tag">REPETITION</span>
              </div>
            </div>
          </div>
        </div>

        <div className="brochure-feature-rail">
          {heroFeatures.map((feature, index) => (
            <FeatureChip
              key={feature.label}
              {...feature}
              delay={index * 100 + 260}
              className={cn(
                'brochure-hero-feature',
                index % 2 === 0 ? 'brochure-float' : 'brochure-float-delayed'
              )}
            />
          ))}
          <div className="brochure-floating-chip is-side brochure-reveal brochure-float" style={{ animationDelay: '540ms' }}>
            <Clock3 className="h-4 w-4 text-[rgb(var(--theme-primary-ink-rgb))]" />
            Dose due at 8:30 PM
          </div>
        </div>
      </div>
    </div>
  )
}

function BrowseVisual() {
  return (
    <div className="brochure-panel-surface">
      <div className="brochure-searchbar">
        <Search className="h-4 w-4 text-muted-foreground" />
        Search a behavior or keyword
      </div>

      <div className="brochure-browse-grid">
        {browseGroups.map((group, index) => (
          <div
            key={group}
            className={cn(
              'brochure-mini-pill brochure-reveal',
              index % 2 === 0
                ? 'border-[rgb(var(--theme-primary-strong-rgb)/0.8)] bg-[rgb(var(--theme-primary-soft-rgb)/0.78)] text-[rgb(var(--theme-primary-ink-rgb))]'
                : 'border-[rgb(var(--theme-secondary-strong-rgb)/0.9)] bg-[rgb(var(--theme-secondary-soft-rgb)/0.85)] text-[rgb(var(--theme-secondary-ink-rgb))]'
            )}
            style={{ animationDelay: `${index * 90 + 120}ms` }}
          >
            {group}
          </div>
        ))}
      </div>

      <div className="brochure-result-list">
        {[
          'Attention-Seeking or Constant Calling Out',
          'Repeating the Same Question',
          'Making Repetitive Noises or Sounds',
        ].map((item) => (
          <div key={item} className="brochure-result-item">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[rgb(var(--theme-primary-ink-rgb))]">
                  {item}
                </p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Fast browse plus search-driven lookup.
                </p>
              </div>
              <ArrowRight className="mt-1 h-4 w-4 text-[rgb(var(--theme-primary-ink-rgb))]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ResponseVisual() {
  return (
    <div className="brochure-panel-surface">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="brochure-kicker">Structured response</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            One screen. Four calm panels.
          </p>
        </div>
        <span className="theme-icon-primary inline-flex h-11 w-11 items-center justify-center">
          <MessageSquareText className="h-5 w-5" />
        </span>
      </div>

      <div className="brochure-response-grid">
        {responsePanels.map((panel) => (
          <div key={panel.title} className={cn('brochure-response-card', panel.tone)}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
              {panel.title}
            </p>
            <p className="mt-3 text-sm font-semibold leading-6">{panel.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function LogVisual() {
  return (
    <div className="brochure-panel-surface">
      <div className="flex flex-wrap gap-2">
        {logMoods.map((mood, index) => (
          <span
            key={mood}
            className={cn(
              'brochure-mini-pill',
              index === 0 && 'border-emerald-200 bg-emerald-50 text-emerald-800',
              index === 1 &&
                'border-[rgb(var(--theme-secondary-strong-rgb)/0.92)] bg-[rgb(var(--theme-secondary-soft-rgb)/0.94)] text-[rgb(var(--theme-secondary-ink-rgb))]',
              index === 2 &&
                'border-[rgb(var(--theme-primary-strong-rgb)/0.88)] bg-[rgb(var(--theme-primary-soft-rgb)/0.9)] text-[rgb(var(--theme-primary-ink-rgb))]',
              index === 3 && 'border-amber-200 bg-amber-50 text-amber-800'
            )}
          >
            {mood}
          </span>
        ))}
      </div>

      <div className="brochure-log-note mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Quick note
        </p>
        <p className="mt-2 text-sm leading-6 text-[rgb(var(--theme-foreground-rgb)/0.82)]">
          Asked for her mother again after sunset. Decoder lookup linked.
        </p>
      </div>

      <div className="brochure-log-summary mt-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Weekly pattern
          </p>
          <p className="mt-2 text-sm font-semibold text-[rgb(var(--theme-primary-ink-rgb))]">
            Calm mornings. Agitated evenings.
          </p>
        </div>
        <div className="brochure-bars">
          {[42, 70, 58, 84, 46, 61, 76].map((height, index) => (
            <span
              key={index}
              style={{ height: `${height}%` }}
              className={index % 2 === 0 ? 'is-primary' : 'is-secondary'}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function MedicationVisual() {
  return (
    <div className="brochure-panel-surface">
      <div className="brochure-mini-card is-primary">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[rgb(var(--theme-primary-ink-rgb))]">
              Next dose
            </p>
            <p className="mt-2 text-lg font-semibold text-[rgb(var(--theme-primary-ink-rgb))]">
              Evening dose at 8:30 PM
            </p>
          </div>
          <span className="theme-icon-primary inline-flex h-10 w-10 items-center justify-center">
            <Clock3 className="h-5 w-5" />
          </span>
        </div>
      </div>

      <div className="brochure-med-list">
        {medicationRows.map((row) => (
          <div key={row.name} className="brochure-med-row">
            <div>
              <p className="text-sm font-semibold text-foreground">{row.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">{row.time}</p>
            </div>
            <span
              className={cn(
                'brochure-chip-tag',
                row.status === 'Taken' &&
                  'border-emerald-200 bg-emerald-50 text-emerald-800',
                row.status === 'Skipped' &&
                  'border-[rgb(var(--theme-secondary-strong-rgb)/0.92)] bg-[rgb(var(--theme-secondary-soft-rgb)/0.94)] text-[rgb(var(--theme-secondary-ink-rgb))]',
                row.status === 'Due next' &&
                  'border-[rgb(var(--theme-primary-strong-rgb)/0.88)] bg-[rgb(var(--theme-primary-soft-rgb)/0.92)] text-[rgb(var(--theme-primary-ink-rgb))]'
              )}
            >
              {row.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function AIVisual() {
  return (
    <div className="brochure-panel-surface">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="brochure-kicker">Fallback only</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            AI opens after the static decoder.
          </p>
        </div>
        <span className="brochure-chip-tag">12 left</span>
      </div>

      <div className="brochure-ai-prompt">
        The static advice did not help. What should I say now?
      </div>

      <div className="brochure-ai-stack">
        <div className="brochure-ai-section is-primary">
          <p className="brochure-ai-title">What may be happening</p>
          <p>New pain or fear can sound like calling out.</p>
        </div>
        <div className="brochure-ai-section is-secondary">
          <p className="brochure-ai-title">Try this next</p>
          <p>Check comfort, bathroom, and body position first.</p>
        </div>
        <div className="brochure-ai-section is-emerald">
          <p className="brochure-ai-title">Words to try</p>
          <p>“I’m here. Let’s get you more comfortable.”</p>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const { isAuthenticated, user } = useAuth()
  const primaryHref = isAuthenticated ? getAppHomePath(user) : '/register'
  const primaryLabel = isAuthenticated ? 'Open CalmCompass' : 'Get access'
  const decoderHref = isAuthenticated ? '/decoder' : '/register'

  return (
    <div className="brochure-home min-h-[calc(100vh-4rem)] px-4 pb-20 sm:px-6">
      <div className="brochure-shell">
        <section className="brochure-hero">
          <div className="brochure-copy">
            <div className="brochure-reveal" style={{ animationDelay: '40ms' }}>
              <BrandLogo className="mb-6" />
            </div>
            <p className="brochure-kicker brochure-reveal" style={{ animationDelay: '120ms' }}>
              Dementia care companion
            </p>
            <h1 className="brochure-headline brochure-reveal" style={{ animationDelay: '180ms' }}>
              CalmCompass for the hard moments.
              <span className="brochure-headline-accent block text-[rgb(var(--theme-secondary-rgb))]">
                Decode. Respond. Track.
              </span>
            </h1>
            <p className="brochure-support mt-5 brochure-reveal" style={{ animationDelay: '260ms' }}>
              A mobile-first behavior decoder with exact scripts, daily logs, medication tracking,
              and AI backup when the static answer is not enough.
            </p>

            <div className="brochure-cta-row brochure-reveal" style={{ animationDelay: '340ms' }}>
              <Button asChild size="lg" className="h-12 rounded-full px-6">
                <Link to={primaryHref}>
                  {primaryLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              {!isAuthenticated ? (
                <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-6">
                  <Link to="/pricing">See pricing</Link>
                </Button>
              ) : null}
            </div>

          </div>

          <HeroVisual decoderHref={decoderHref} />
        </section>

        <SectionIntro
          eyebrow="Browse and search"
          title="See the behavior fast."
          description="Jump in from broad groups or type the exact moment you are seeing."
          points={['Categories', 'Keyword search', 'Last lookup ready']}
        >
          <BrowseVisual />
        </SectionIntro>

        <SectionIntro
          eyebrow="Structured response"
          title="Get the next move on one screen."
          description="Plain-language explanation, clear don’ts, exact scripts, and the reason behind them."
          points={['4-panel decoder', 'Exact phrases', 'Low cognitive load']}
          reverse
        >
          <ResponseVisual />
        </SectionIntro>

        <SectionIntro
          eyebrow="Daily Log"
          title="Capture the day in taps."
          description="Mood chips, a short note, and linked behaviors create a useful weekly picture."
          points={['Mood chips', 'Quick note', 'Weekly pattern']}
        >
          <LogVisual />
        </SectionIntro>

        <SectionIntro
          eyebrow="Medication tracker"
          title="Keep doses visible without the clutter."
          description="See what is due next and log every dose as taken, skipped, or refused."
          points={['Upcoming doses', 'Taken / skipped / refused', 'Adherence view']}
          reverse
        >
          <MedicationVisual />
        </SectionIntro>

        <SectionIntro
          eyebrow="AI fallback"
          title="Open AI only when you still need help."
          description="CalmCompass keeps the static decoder first, then offers short constrained AI follow-up with visible limits."
          points={['Decoder-first flow', 'Short TL;DR answers', 'Usage limits built in']}
        >
          <AIVisual />
        </SectionIntro>

        <section className="brochure-finale brochure-reveal" style={{ animationDelay: '120ms' }}>
          <div className="brochure-finale-copy">
            <p className="brochure-kicker">One calm tool</p>
            <h2 className="brochure-section-title">Built for the phone in your hand.</h2>
            <p className="brochure-support mt-4">
              CalmCompass keeps the answer close, the copy short, and the next step clear.
            </p>
          </div>
          <div className="brochure-cta-row mt-8">
            <Button asChild size="lg" className="h-12 rounded-full px-6">
              <Link to={primaryHref}>
                {primaryLabel}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            {!isAuthenticated ? (
              <Button asChild size="lg" variant="outline" className="h-12 rounded-full px-6">
                <Link to="/login">Sign in</Link>
              </Button>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  )
}
