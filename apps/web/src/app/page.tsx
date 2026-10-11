import { headers } from "next/headers";
import { redirect } from "next/navigation";

// / → /es or /en, from the browser's preferred language.
export default async function Home() {
  const accept = (await headers()).get("accept-language") ?? "";
  redirect(accept.toLowerCase().startsWith("es") ? "/es" : "/en");
}
