import type { ProjectCreated } from "@/lib/dashboard-api";
import { Button } from "../widget/ui";
import { Card, CopyButton } from "./shell";

export function KeyReveal({ created, onContinue }: { created: ProjectCreated; onContinue: () => void }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{created.project.name} is ready</h1>
        <p className="mt-1 text-sm text-gray">This is your project&apos;s API key.</p>
      </div>
      <Card>
        <div className="flex items-center gap-3 rounded-md border border-line bg-paper p-3">
          <code className="min-w-0 flex-1 break-all font-mono text-sm text-ink">{created.api_key}</code>
          <CopyButton value={created.api_key} />
        </div>
        <p role="note" className="mt-4 border-l-2 border-wine pl-3 text-sm text-ink">
          Store it now in your server&apos;s environment (<code className="font-mono">LENDARA_API_KEY</code>). Lendara keeps
          only a hash, so it can&apos;t be shown again. This browser remembers it for the dashboard.
        </p>
        <Button type="button" onClick={onContinue} className="mt-5 w-full">
          Go to the dashboard
        </Button>
      </Card>
    </div>
  );
}
