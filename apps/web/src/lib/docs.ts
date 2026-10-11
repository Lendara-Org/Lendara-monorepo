export const DOC_LANGS = ["es", "en"] as const;
export type DocLang = (typeof DOC_LANGS)[number];

export const isDocLang = (v: string): v is DocLang => (DOC_LANGS as readonly string[]).includes(v);

/** Page order in the sidebar. "" is the overview. */
export const DOC_SLUGS = ["", "quickstart", "test-cards", "widget", "sdk", "wallets", "sandbox"] as const;
export type DocSlug = (typeof DOC_SLUGS)[number];

export const isDocSlug = (v: string): v is DocSlug => (DOC_SLUGS as readonly string[]).includes(v);

export const docHref = (lang: DocLang, slug: DocSlug) => `/docs/${lang}${slug ? `/${slug}` : ""}`;

export type DocPage = { title: string; description: string; body: () => React.ReactNode };

export type DocChrome = {
  docs: string;
  dashboard: string;
  demo: string;
  previous: string;
  next: string;
  menu: string;
  copy: string;
  copied: string;
};
