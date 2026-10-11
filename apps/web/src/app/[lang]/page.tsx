import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Landing } from "@/components/landing/landing";
import { en } from "@/content/landing/en";
import { es } from "@/content/landing/es";
import { DOC_LANGS, isDocLang } from "@/lib/docs";

const COPY = { es, en };

type Props = { params: Promise<{ lang: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return DOC_LANGS.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params;
  if (!isDocLang(lang)) return {};
  return {
    title: { absolute: COPY[lang].meta.title },
    description: COPY[lang].meta.description,
    alternates: { languages: { es: "/es", en: "/en" } },
  };
}

export default async function LandingPage({ params }: Props) {
  const { lang } = await params;
  if (!isDocLang(lang)) notFound();
  return <Landing lang={lang} t={COPY[lang]} />;
}
