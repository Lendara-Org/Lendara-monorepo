import Link from "next/link";
import { DOC_LANGS, DOC_SLUGS, docHref, type DocChrome, type DocLang, type DocPage, type DocSlug } from "@/lib/docs";
import { DEMO_URL } from "@/lib/site";
import { Isotipo } from "../brand/isotipo";

type Props = {
  lang: DocLang;
  slug: DocSlug;
  page: DocPage;
  chrome: DocChrome;
  titles: Record<DocSlug, string>;
};

export function DocsLayout({ lang, slug, page, chrome, titles }: Props) {
  const index = DOC_SLUGS.indexOf(slug);
  const prev = index > 0 ? DOC_SLUGS[index - 1] : undefined;
  const next = index < DOC_SLUGS.length - 1 ? DOC_SLUGS[index + 1] : undefined;

  const nav = (
    <ul className="flex flex-col gap-0.5 text-sm">
      {DOC_SLUGS.map((s) => (
        <li key={s}>
          <Link
            href={docHref(lang, s)}
            aria-current={s === slug ? "page" : undefined}
            className={`block rounded-md px-3 py-1.5 transition ${
              s === slug ? "bg-paper font-medium text-ink" : "text-gray hover:text-ink"
            }`}
          >
            {titles[s]}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div lang={lang} className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-10 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Link href={`/${lang}`} className="flex items-center gap-2">
              <Isotipo className="h-5 w-auto text-crimson" />
              <span className="font-display text-2xl leading-none tracking-wide">Lendara</span>
              <span className="rounded-sm bg-wine px-1.5 py-0.5 font-mono text-[10px] uppercase leading-none text-paper">
                Sandbox
              </span>
            </Link>
            <Link href={docHref(lang, "")} className="text-sm text-gray hover:text-ink">
              {chrome.docs}
            </Link>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="hidden text-gray hover:text-ink sm:inline">
              {chrome.dashboard}
            </Link>
            <a href={DEMO_URL} target="_blank" rel="noreferrer" className="hidden text-gray hover:text-ink sm:inline">
              {chrome.demo}
            </a>
            <div role="group" aria-label="Language" className="flex rounded-md border border-line p-0.5 text-xs">
              {DOC_LANGS.map((l) => (
                <Link
                  key={l}
                  href={docHref(l, slug)}
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

      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-8 px-4 py-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:py-12">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <details className="rounded-lg border border-line lg:hidden">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">{chrome.menu}</summary>
            <div className="border-t border-line p-2">{nav}</div>
          </details>
          <nav aria-label={chrome.docs} className="hidden lg:block">
            {nav}
          </nav>
        </aside>

        <article className="min-w-0 max-w-3xl">
          <h1 className="text-3xl font-semibold tracking-tight text-ink">{page.title}</h1>
          <p className="mt-2 text-lg text-gray">{page.description}</p>
          <div className="mt-8">{page.body()}</div>

          <nav className="mt-16 grid gap-3 border-t border-line pt-6 sm:grid-cols-2">
            {prev !== undefined ? (
              <Link href={docHref(lang, prev)} className="rounded-lg border border-line p-4 transition hover:border-ink">
                <span className="text-xs text-gray">{chrome.previous}</span>
                <span className="mt-1 block font-medium text-ink">{titles[prev]}</span>
              </Link>
            ) : (
              <span />
            )}
            {next !== undefined && (
              <Link href={docHref(lang, next)} className="rounded-lg border border-line p-4 text-right transition hover:border-ink">
                <span className="text-xs text-gray">{chrome.next}</span>
                <span className="mt-1 block font-medium text-ink">{titles[next]}</span>
              </Link>
            )}
          </nav>
        </article>
      </div>
    </div>
  );
}
