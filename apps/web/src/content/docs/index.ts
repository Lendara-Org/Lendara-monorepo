import type { DocChrome, DocLang, DocPage, DocSlug } from "@/lib/docs";
import * as en from "./en";
import * as es from "./es";

export const docs: Record<DocLang, { chrome: DocChrome; pages: Record<DocSlug, DocPage> }> = { en, es };
