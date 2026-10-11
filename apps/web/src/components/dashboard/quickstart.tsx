import { TEST_CARDS } from "@/lib/card";
import { Card, CopyButton } from "./shell";

const SERVER = `import { LendaraRamp } from "@lendara/ramp";

const lendara = new LendaraRamp({ apiKey: process.env.LENDARA_API_KEY });

// In your API route: create a session for the buyer.
const { url } = await lendara.createSession({
  account: "G...",          // buyer's Stellar account
  fiat_currency: "CRC",     // CRC, ARS or CLP
  amount: "25000",
});`;

const BROWSER = `import { Lendara } from "@lendara/widget";

Lendara.open({
  url,                      // from your server
  onComplete: (tx) => console.log("USDC sent", tx),
  onError: (err) => console.error(err.message),
});`;

const RESULTS: Record<string, string> = {
  approved: "Completed: USDC sent",
  kyc_rejected: "Error: KYC rejected",
  payment_not_received: "Expired: payment not received",
  delayed: "Completed after 30 s",
};

const groups = (n: string) => n.replace(/(\d{4})(?=\d)/g, "$1 ");

export function Quickstart() {
  return (
    <Card title="Quickstart">
      <ol className="flex flex-col gap-4 text-sm text-ink">
        <li>
          <p className="mb-2">1. Install the packages</p>
          <Code code="npm i @lendara/ramp @lendara/widget" />
        </li>
        <li>
          <p className="mb-2">2. On your server, create a session</p>
          <Code code={SERVER} />
        </li>
        <li>
          <p className="mb-2">3. In the browser, open the widget</p>
          <Code code={BROWSER} />
        </li>
      </ol>
    </Card>
  );
}

export function TestCards() {
  return (
    <Card title="Test cards">
      <p className="mb-3 text-sm text-gray">Any future expiry date and any 3-digit CVC. Real cards are rejected.</p>
      <ul className="flex flex-col divide-y divide-line text-sm">
        {TEST_CARDS.map((card) => (
          <li key={card.number} className="flex items-center justify-between gap-3 py-2.5">
            <span className="whitespace-nowrap font-mono text-ink">{groups(card.number)}</span>
            <span className="text-right text-gray">{RESULTS[card.scenario]}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Code({ code }: { code: string }) {
  return (
    <div className="overflow-hidden rounded-md bg-ink">
      <div className="flex justify-end border-b border-white/10 px-2 py-1.5 [&>button]:border-white/20 [&>button]:text-paper">
        <CopyButton value={code} />
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-paper">
        <code>{code}</code>
      </pre>
    </div>
  );
}
