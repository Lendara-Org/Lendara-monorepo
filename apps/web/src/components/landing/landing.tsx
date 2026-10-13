import Image from "next/image";
import Link from "next/link";
import type { LandingCopy } from "@/content/landing/types";
import type { DocLang } from "@/lib/docs";
import { API_URL, DEMO_URL, REPO_URL } from "@/lib/site";
import { Isotipo } from "../brand/isotipo";
import { CodeBlock } from "../docs/prose";
import { StatusPill } from "../widget/ui";
import { TransferCard } from "./transfer-card";

const SNIPPET = `// Server
const { url } = await lendara.createSession({
  account: "G...", fiat_currency: "CRC", amount: "25000",
});

// Browser
Lendara.open({ url, onComplete: (tx) => showReceipt(tx) });`;

const LANGS: DocLang[] = ["es", "en"];

export function Landing({ lang, t }: { lang: DocLang; t: LandingCopy }) {
  const docs = `/docs/${lang}`;
  return (
    <div lang={lang} className="min-h-dvh overflow-x-hidden bg-paper text-ink">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href={`/${lang}`} className="flex items-center gap-2">
            <Isotipo className="h-5 w-auto text-crimson" />
            <span className="font-display text-2xl leading-none tracking-wide">Lendara</span>
            <span className="rounded-sm bg-wine px-1.5 py-0.5 font-mono text-[10px] uppercase leading-none text-paper">
              Sandbox
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href={docs} className="hidden text-gray hover:text-ink sm:inline">
              {t.nav.docs}
            </Link>
            <Link href="/dashboard" className="hidden text-gray hover:text-ink sm:inline">
              {t.nav.dashboard}
            </Link>
            <a href={DEMO_URL} target="_blank" rel="noreferrer" className="hidden text-gray hover:text-ink sm:inline">
              {t.nav.demo}
            </a>
            <div role="group" aria-label="Language" className="flex rounded-md border border-line p-0.5 text-xs">
              {LANGS.map((l) => (
                <Link
                  key={l}
                  href={`/${l}`}
                  hrefLang={l}
                  aria-current={l === lang ? "true" : undefined}
                  className={`rounded px-2.5 py-1 font-mono uppercase transition ${
                    l === lang ? "bg-ink text-paper" : "text-gray hover:text-ink"
                  }`}
                >
                  {l}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative isolate overflow-hidden">
          <div aria-hidden className="absolute inset-0 -z-10">
            <Image
              src="/brand/hero-anchor-cover.jpg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover motion-safe:animate-drift"
            />
            <div className="absolute inset-0 bg-paper/60 backdrop-blur-[2px]" />
          </div>
          <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] items-center gap-12 px-4 py-16 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:py-24">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-gray">{t.hero.eyebrow}</p>
            <h1 className="mt-4 font-display text-5xl leading-[0.95] tracking-wide sm:text-6xl lg:text-7xl">
              {t.hero.title}
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink/85">{t.hero.lead}</p>
            <ul className="mt-5 flex max-w-xl flex-col gap-2 text-ink/85">
              {t.hero.points.map((p) => (
                <li key={p} className="flex gap-3">
                  <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-crimson" />
                  {p}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/dashboard"
                className="flex h-12 items-center rounded-lg bg-ink px-6 font-medium text-paper transition hover:bg-ink/90"
              >
                {t.hero.primary}
              </Link>
              <Link
                href={docs}
                className="flex h-12 items-center rounded-lg border border-ink px-6 font-medium transition hover:bg-surface"
              >
                {t.hero.secondary}
              </Link>
              <a href={DEMO_URL} target="_blank" rel="noreferrer" className="px-2 text-sm text-gray underline hover:text-ink">
                {t.hero.tertiary}
              </a>
            </div>
            <div className="mt-10 flex items-center gap-3 border-t border-line pt-4">
              <div className="flex -space-x-1.5">
                <Image src="/brand/pin-cr.png" alt="" width={20} height={20} className="rounded-full ring-2 ring-paper" />
                <Image src="/brand/pin-ar.png" alt="" width={20} height={20} className="rounded-full ring-2 ring-paper" />
                <Image src="/brand/pin-cl.png" alt="" width={20} height={20} className="rounded-full ring-2 ring-paper" />
              </div>
              <p className="text-sm text-gray">{t.hero.footnote}</p>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <TransferCard t={t.transfer} />
          </div>
          </div>
        </section>

        {/* Verifiable transfer */}
        <section className="border-y border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-16 lg:py-20">
            <h2 className="font-display text-4xl tracking-wide sm:text-5xl">{t.verifiable.title}</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {t.verifiable.items.map((item) => (
                <div
                  key={item.title}
                  className="group rounded-xl border border-line bg-paper p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="h-1 w-10 rounded-full bg-ink transition-all duration-300 group-hover:w-14 group-hover:bg-crimson" />
                  <h3 className="mt-4 font-semibold">{item.title}</h3>
                  <p className="mt-2 leading-relaxed text-gray">{item.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:items-center">
              <p className="text-sm text-gray">{t.verifiable.statesTitle}</p>
              <div className="flex flex-wrap gap-2">
                <StatusPill tone="expired">{t.transfer.states.pending}</StatusPill>
                <StatusPill tone="processing">{t.transfer.states.processing}</StatusPill>
                <StatusPill tone="completed">{t.transfer.states.completed}</StatusPill>
                <StatusPill tone="failed">{t.transfer.states.error}</StatusPill>
              </div>
            </div>
          </div>
        </section>

        {/* What you integrate */}
        <section className="relative isolate overflow-hidden bg-ink text-paper">
          <div aria-hidden className="absolute inset-0 -z-10">
            <Image src="/brand/alter-background.jpg" alt="" fill sizes="100vw" className="object-cover opacity-60" />
            <div className="absolute inset-0 bg-ink/70" />
          </div>
          <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-10 px-4 py-16 lg:grid-cols-2 lg:py-20">
            <div>
              <h2 className="font-display text-4xl tracking-wide sm:text-5xl">{t.integrate.title}</h2>
              <p className="mt-3 text-lg text-paper/85">{t.integrate.lead}</p>
              <div className="mt-8 flex flex-col gap-4">
                <div className="rounded-xl border border-paper/15 bg-paper/5 p-5 backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-paper/30">
                  <h3 className="font-semibold">{t.integrate.apps.title}</h3>
                  <p className="mt-1 leading-relaxed text-paper/70">
                    {t.integrate.apps.body}{" "}
                    <span className="font-mono text-sm text-paper">@lendara/ramp · @lendara/widget</span>
                  </p>
                </div>
                <div className="rounded-xl border border-paper/15 bg-paper/5 p-5 backdrop-blur-sm transition hover:-translate-y-0.5 hover:border-paper/30">
                  <h3 className="font-semibold">{t.integrate.wallets.title}</h3>
                  <p className="mt-1 leading-relaxed text-paper/70">{t.integrate.wallets.body}</p>
                  <p className="mt-1 break-all font-mono text-xs text-paper/80">{API_URL}/.well-known/stellar.toml</p>
                </div>
              </div>
              <Link href={`${docs}/quickstart`} className="mt-8 inline-block font-medium text-paper underline underline-offset-4">
                {t.integrate.cta}
              </Link>
            </div>
            <div className="lg:pt-16">
              <CodeBlock code={SNIPPET} title="lendara.ts" copy={lang === "es" ? ["Copiar", "Copiado"] : ["Copy", "Copied"]} />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-16 lg:py-20">
            <h2 className="font-display text-4xl tracking-wide sm:text-5xl">{t.how.title}</h2>
            <ol className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-stretch lg:gap-0">
              {t.how.steps.map((step, i) => (
                <li key={step} className="contents">
                  <div className="group flex-1 rounded-xl border border-line bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-ink hover:shadow-md lg:min-w-0">
                    <span className="flex size-8 items-center justify-center rounded-full bg-ink font-mono text-xs text-paper transition group-hover:bg-crimson">
                      {i + 1}
                    </span>
                    <p className="mt-3 leading-relaxed">{step}</p>
                  </div>
                  {i < t.how.steps.length - 1 && (
                    <div aria-hidden className="hidden shrink-0 items-center justify-center px-3 text-line lg:flex">
                      <svg viewBox="0 0 16 16" fill="none" className="size-4">
                        <path d="M2 8h11M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Current status */}
        <section className="relative isolate overflow-hidden bg-wine text-paper">
          <Isotipo className="pointer-events-none absolute -right-6 top-1/2 h-[85%] w-auto -translate-y-1/2 text-paper opacity-[0.12] sm:-right-4" />
          <div className="relative mx-auto max-w-6xl px-4 py-16 lg:py-20">
            <h2 className="font-display text-4xl tracking-wide sm:text-5xl">{t.status.title}</h2>
            <div className="mt-10 grid gap-10 md:grid-cols-2">
              <div>
                <h3 className="font-mono text-xs uppercase tracking-wider text-paper/70">{t.status.doneLabel}</h3>
                <ul className="mt-4 flex flex-col gap-3">
                  {t.status.done.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span aria-hidden className="font-mono">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-mono text-xs uppercase tracking-wider text-paper/70">{t.status.nextLabel}</h3>
                <ul className="mt-4 flex flex-col gap-3 text-paper/85">
                  {t.status.next.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span aria-hidden className="font-mono">○</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-10 max-w-3xl border-t border-paper/20 pt-6 text-sm leading-relaxed text-paper/80">
              {t.status.note}
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative isolate overflow-hidden">
          <div aria-hidden className="absolute inset-0 -z-10">
            <Image src="/brand/hero-object.jpg" alt="" fill sizes="100vw" className="object-cover motion-safe:animate-drift" />
            <div className="absolute inset-0 bg-paper/60 backdrop-blur-[2px]" />
          </div>
          <div className="mx-auto max-w-6xl px-4 py-16 text-center lg:py-24">
            <h2 className="font-display text-4xl tracking-wide sm:text-5xl">{t.final.title}</h2>
            <p className="mx-auto mt-3 max-w-xl text-lg text-ink/85">{t.final.body}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/dashboard"
                className="flex h-12 items-center rounded-lg bg-ink px-6 font-medium text-paper transition hover:bg-ink/90"
              >
                {t.final.primary}
              </Link>
              <Link
                href={`${docs}/quickstart`}
                className="flex h-12 items-center rounded-lg border border-ink px-6 font-medium transition hover:bg-surface"
              >
                {t.final.secondary}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-ink text-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Isotipo className="h-[18px] w-auto text-crimson" />
            <span className="font-display text-xl tracking-wide">Lendara</span>
            <span className="text-paper/70">{t.footer.sandbox}</span>
          </div>
          <nav className="flex gap-4 text-paper/80">
            <Link href={docs} className="hover:text-paper">
              {t.nav.docs}
            </Link>
            <Link href="/dashboard" className="hover:text-paper">
              {t.nav.dashboard}
            </Link>
            <a href={REPO_URL} target="_blank" rel="noreferrer" className="hover:text-paper">
              {t.footer.source}
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
