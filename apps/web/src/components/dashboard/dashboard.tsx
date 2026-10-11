"use client";

import { LendaraError } from "@lendara/ramp";
import { useEffect, useState } from "react";
import { saveApiKey, useApiKey } from "@/lib/api-key";
import { lendaraClient, type ProjectCreated } from "@/lib/dashboard-api";
import { KeyReveal } from "./key-reveal";
import { Onboarding } from "./onboarding";
import { Quickstart, TestCards } from "./quickstart";
import { Card, CopyButton, Shell } from "./shell";
import { Transactions } from "./transactions";

export function Dashboard() {
  const apiKey = useApiKey();
  const [created, setCreated] = useState<ProjectCreated | null>(null);

  if (apiKey === undefined) {
    return <Shell>{null}</Shell>;
  }
  if (created) {
    return (
      <Shell>
        <KeyReveal created={created} onContinue={() => setCreated(null)} />
      </Shell>
    );
  }
  if (!apiKey) {
    return (
      <Shell>
        <Onboarding
          onCreated={(c) => {
            saveApiKey(c.api_key);
            setCreated(c);
          }}
          onSignIn={saveApiKey}
        />
      </Shell>
    );
  }
  return <ProjectView apiKey={apiKey} />;
}

function ProjectView({ apiKey }: { apiKey: string }) {
  const [project, setProject] = useState<{ key: string; name: string } | null>(null);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    let cancelled = false;
    lendaraClient(apiKey)
      .getProject()
      .then((p) => !cancelled && setProject({ key: apiKey, name: p.name }))
      .catch((err: unknown) => {
        // The key was deleted or belongs to another environment.
        if (!cancelled && err instanceof LendaraError && err.status === 401) setInvalid(true);
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  const signOut = (
    <button type="button" onClick={() => saveApiKey(null)} className="text-sm text-gray underline hover:text-ink">
      Sign out
    </button>
  );

  if (invalid) {
    return (
      <Shell actions={signOut}>
        <Card className="mx-auto max-w-xl">
          <p className="text-sm text-ink">The API key saved in this browser is no longer valid.</p>
          <button type="button" onClick={() => saveApiKey(null)} className="mt-3 text-sm underline">
            Use another key
          </button>
        </Card>
      </Shell>
    );
  }

  return (
    <Shell actions={signOut}>
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-gray">Project</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">{project?.key === apiKey ? project.name : "…"}</h1>
      </div>
      {/* Mobile order: transactions, key and test cards, quickstart. */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <Transactions apiKey={apiKey} />
        </div>
        <div className="flex flex-col gap-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <Card title="API key">
            <div className="flex items-center gap-3">
              <code className="min-w-0 flex-1 truncate font-mono text-sm text-ink">
                {apiKey.slice(0, 13)}
                {"•".repeat(12)}
              </code>
              <CopyButton value={apiKey} />
            </div>
            <p className="mt-3 text-xs text-gray">
              Use it only on your server, as <code className="font-mono">LENDARA_API_KEY</code>.
            </p>
          </Card>
          <TestCards />
        </div>
        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          <Quickstart />
        </div>
      </div>
    </Shell>
  );
}
