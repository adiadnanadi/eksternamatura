'use client'

import { motion } from 'framer-motion'
import {
  Sigma,
  BookOpen,
  Globe,
  GraduationCap,
  Brain,
  Timer,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
}

const subjects = [
  {
    icon: Sigma,
    name: 'Matematika',
    count: 267,
    desc: 'Srednja škola — brojevi, jednačine, funkcije i geometrija, sa kompletnim rješenjima korak po korak.',
    gradient: 'from-violet-500 to-fuchsia-500',
    shadow: 'shadow-violet-500/25',
  },
  {
    icon: BookOpen,
    name: 'Bosanski jezik',
    count: 451,
    desc: 'Osnovna i srednja škola — pravopis, jezik, književnost i sva oblasti pisnog ispita.',
    gradient: 'from-emerald-500 to-teal-500',
    shadow: 'shadow-emerald-500/25',
  },
  {
    icon: Globe,
    name: 'Engleski jezik',
    count: 550,
    desc: 'Osnovna i srednja škola — vokabular, gramatika i čitanje s razumijevanjem, sa tekstovima za vježbu.',
    gradient: 'from-amber-500 to-orange-500',
    shadow: 'shadow-amber-500/25',
  },
]

const modes = [
  {
    icon: Brain,
    title: 'Mod učenja',
    tagline: 'Uči dok vježbaš',
    points: [
      'Odmah vidiš da li je odgovor tačan',
      'Matematika: rješenje korak po korak uz svako pitanje',
      'Biraš predmet, temu i broj pitanja',
    ],
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    icon: Timer,
    title: 'Mod testiranja',
    tagline: 'Kao pravi ispit',
    points: [
      '10 ili 20 pitanja po oficijelnoj strukturi ispita',
      'Bez otkrivanja odgovora tokom rješavanja',
      'Rezultat i pregled svih pitanja na kraju',
    ],
    gradient: 'from-amber-500 to-orange-600',
  },
]

export function Landing({
  user,
  onStart,
}: {
  user: { name: string } | null
  onStart: () => void
}) {
  return (
    <main className="relative overflow-hidden">
      {/* dekorativni blobovi */}
      <div className="hero-blob left-[-10%] top-[-10%] h-[420px] w-[420px] bg-emerald-300/50 dark:bg-emerald-700/25" />
      <div className="hero-blob right-[-8%] top-[8%] h-[380px] w-[380px] bg-amber-200/60 dark:bg-amber-700/20" />
      <div className="hero-blob bottom-[30%] left-[30%] h-[300px] w-[300px] bg-violet-200/50 dark:bg-violet-800/20" />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        {/* HERO */}
        <section className="flex flex-col items-center pb-14 pt-14 text-center sm:pt-20">
          <motion.div
            {...fadeUp}
            transition={{ duration: 0.5 }}
            className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            <Sparkles className="h-4 w-4" />
            1581 pitanja • osnovna i srednja škola • spremno za ispite
          </motion.div>

          <motion.h1
            {...fadeUp}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="max-w-3xl text-balance text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl"
          >
            Vježbaj pametno.{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-amber-500 bg-clip-text text-transparent">
              Položi sigurno.
            </span>
          </motion.h1>

          <motion.p
            {...fadeUp}
            transition={{ duration: 0.55, delay: 0.16 }}
            className="mt-5 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg"
          >
            Kompletna banka pitanja za provjeru znanja iz matematike, bosanskog i
            engleskog jezika — za osnovnu i srednju školu. Uči uz objašnjenja ili
            testiraj sebe kao na pravom ispitu — sve na jednom mjestu, na mobitelu i računaru.
          </motion.p>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.55, delay: 0.24 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <Button
              size="lg"
              onClick={onStart}
              className="h-13 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 px-8 text-base font-semibold shadow-lg shadow-emerald-600/25 transition-transform hover:scale-[1.02]"
            >
              {user ? `Nastavi kao ${user.name.split(' ')[0]}` : 'Počni besplatno'}
              <ArrowRight className="ml-1 h-5 w-5" />
            </Button>
          </motion.div>

          <motion.div
            {...fadeUp}
            transition={{ duration: 0.55, delay: 0.32 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
          >
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-600" /> Zaštićena banka pitanja
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Email prijava
            </span>
            <span className="inline-flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-emerald-600" /> Struktura stvarnog ispita
            </span>
          </motion.div>
        </section>

        {/* PREDMETI */}
        <section className="grid gap-4 pb-6 sm:grid-cols-3 sm:gap-5" aria-label="Predmeti">
          {subjects.map((s, i) => (
            <motion.div
              key={s.name}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="group rounded-3xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div
                className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${s.gradient} text-white shadow-lg ${s.shadow}`}
              >
                <s.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold">{s.name}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              <p className={`mt-4 text-2xl font-extrabold ${s.name === 'Matematika' ? 'text-violet-600 dark:text-violet-400' : s.name === 'Bosanski jezik' ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {s.count}
                <span className="ml-1 text-sm font-medium text-muted-foreground">pitanja</span>
              </p>
            </motion.div>
          ))}
        </section>

        {/* MODEOVI */}
        <section className="grid gap-4 pb-16 pt-6 sm:grid-cols-2 sm:gap-5" aria-label="Modovi rada">
          {modes.map((m, i) => (
            <motion.div
              key={m.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="relative overflow-hidden rounded-3xl border bg-card p-6 sm:p-7"
            >
              <div className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${m.gradient}`} />
              <div className="flex items-center gap-3">
                <span className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${m.gradient} text-white shadow-md`}>
                  <m.icon className="h-5.5 w-5.5" />
                </span>
                <div>
                  <h3 className="font-bold leading-tight">{m.title}</h3>
                  <p className="text-sm text-muted-foreground">{m.tagline}</p>
                </div>
              </div>
              <ul className="mt-4 space-y-2.5">
                {m.points.map(p => (
                  <li key={p} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {p}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </section>
      </div>
    </main>
  )
}
