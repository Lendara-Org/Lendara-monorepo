import { CodePanel } from "@/components/code-panel";
import { Store } from "@/components/store";
import { config } from "@/lib/config";

export default function Home() {
  return (
    <div className="min-h-dvh bg-paper">
      <div className="bg-wine px-4 py-2 text-center text-xs text-paper">
        Demo app on Stellar testnet. Payments are simulated by the Lendara sandbox; no real money moves.
      </div>
      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:py-16">
        <Store horizonUrl={config.horizonUrl} usdcIssuer={config.usdcIssuer} />
        <CodePanel />
      </main>
    </div>
  );
}
