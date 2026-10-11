import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsLayout } from "@/components/docs/docs-layout";
import { docs } from "@/content/docs";
import { DOC_LANGS, DOC_SLUGS, docHref, isDocLang, isDocSlug, type DocSlug } from "@/lib/docs";

type Props = { params: Promise<{ lang: string; slug?: string[] }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return DOC_LANGS.flatMap((lang) => DOC_SLUGS.map((slug) => ({ lang, slug: slug ? [slug] : [] })));
}

async function resolve(params: Props["params"]) {
  const { lang, slug } = await params;
  const s = slug?.join("/") ?? "";
  if (!isDocLang(lang) || !isDocSlug(s)) notFound();
  return { lang, slug: s };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await resolve(params);
  const page = docs[lang].pages[slug];
  return {
    title: `${page.title} · Docs`,
    description: page.description,
    alternates: { languages: Object.fromEntries(DOC_LANGS.map((l) => [l, docHref(l, slug)])) },
  };
}

export default async function DocPage({ params }: Props) {
  const { lang, slug } = await resolve(params);
  const { chrome, pages } = docs[lang];
  const titles = Object.fromEntries(DOC_SLUGS.map((s) => [s, pages[s].title])) as Record<DocSlug, string>;
  return <DocsLayout lang={lang} slug={slug} page={pages[slug]} chrome={chrome} titles={titles} />;
}
