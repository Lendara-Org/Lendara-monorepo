const SERVER = `// app/api/session/route.ts (your server)
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

const CLIENT = `// "Add funds" button (your app)
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

export function CodePanel() {
  return (
    <section aria-labelledby="code-title" className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-gray">How this app integrates Lendara</p>
        <h2 id="code-title" className="mt-1 text-xl font-semibold text-ink">
          Two snippets: one on the server, one in the browser
        </h2>
      </div>
      <Snippet title="Server" code={SERVER} />
      <Snippet title="Browser" code={CLIENT} />
      <p className="text-sm text-gray">
        Install with <code className="font-mono text-ink">npm i @lendara/ramp @lendara/widget</code>. Get an API key
        from the Lendara dashboard.
      </p>
    </section>
  );
}

function Snippet({ title, code }: { title: string; code: string }) {
  return (
    <figure className="overflow-hidden rounded-xl border border-line bg-ink">
      <figcaption className="border-b border-white/10 px-4 py-2 font-mono text-xs text-paper/70">{title}</figcaption>
      <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-relaxed text-paper">
        <code>{code}</code>
      </pre>
    </figure>
  );
}
