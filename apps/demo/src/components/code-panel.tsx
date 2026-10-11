import type { Messages } from "@/lib/i18n";
import { CopyButton } from "./copy-button";

const SERVER = `// app/api/session/route.ts
import { LendaraRamp } from "@lendara/ramp";

const lendara = new LendaraRamp({
  apiKey: process.env.LENDARA_API_KEY,
});

export async function POST(req: Request) {
  const { account, fiat_currency, amount } = await req.json();
  const session = await lendara.createSession({
    account, fiat_currency, amount,
  });
  return Response.json({ url: session.url });
}`;

const BROWSER = `// "Add funds" button
import { Lendara } from "@lendara/widget";

const { url } = await fetch("/api/session", {
  method: "POST",
  body: JSON.stringify({ account, fiat_currency, amount }),
}).then((r) => r.json());

Lendara.open({
  url,
  onComplete: (tx) => showReceipt(tx),
  onError: (err) => showError(err.message),
});`;

const INSTALL = "npm i @lendara/ramp @lendara/widget";

export function CodePanel({ t, dashboardUrl }: { t: Messages; dashboardUrl: string }) {
  return (
    <section aria-labelledby="code-title" className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-gray">{t.code.eyebrow}</p>
        <h2 id="code-title" className="mt-1 text-xl font-semibold text-ink">
          {t.code.title}
        </h2>
      </div>
      <Snippet title={t.code.install} code={INSTALL} t={t} />
      <Snippet title={t.code.server} code={SERVER} t={t} />
      <Snippet title={t.code.browser} code={BROWSER} t={t} />
      <p className="text-sm text-gray">
        {t.code.keyHint}{" "}
        <a href={dashboardUrl} target="_blank" rel="noreferrer" className="text-ink underline">
          {t.code.dashboard}
        </a>
      </p>
    </section>
  );
}

function Snippet({ title, code, t }: { title: string; code: string; t: Messages }) {
  return (
    <figure className="overflow-hidden rounded-xl border border-line bg-ink">
      <figcaption className="flex items-center justify-between border-b border-white/10 px-4 py-2 [&>button]:border-white/20 [&>button]:bg-transparent [&>button]:text-paper">
        <span className="font-mono text-xs text-paper/70">{title}</span>
        <CopyButton value={code} label={t.copy} copied={t.copied} />
      </figcaption>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-paper">
        <code>{code}</code>
      </pre>
    </figure>
  );
}
