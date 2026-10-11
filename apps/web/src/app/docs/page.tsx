import { headers } from "next/headers";
import { redirect } from "next/navigation";

// /docs → /docs/es or /docs/en, from the browser's preferred language.
export default async function DocsIndex() {
  const accept = (await headers()).get("accept-language") ?? "";
  redirect(accept.toLowerCase().startsWith("es") ? "/docs/es" : "/docs/en");
}
