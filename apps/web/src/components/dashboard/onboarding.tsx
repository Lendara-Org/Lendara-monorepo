"use client";

import { useState, type FormEvent } from "react";
import { createProject, lendaraClient, type ProjectCreated } from "@/lib/dashboard-api";
import { Button, ErrorText, inputClass } from "../widget/ui";
import { Card } from "./shell";

type Props = { onCreated: (created: ProjectCreated) => void; onSignIn: (apiKey: string) => void };

export function Onboarding({ onCreated, onSignIn }: Props) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Start testing Lendara</h1>
        <p className="mt-1 text-sm text-gray">
          A sandbox project gives you an API key to create on-ramp sessions on Stellar testnet. No account needed.
        </p>
      </div>
      <CreateProject onCreated={onCreated} />
      <SignIn onSignIn={onSignIn} />
    </div>
  );
}

function CreateProject({ onCreated }: Pick<Props, "onCreated">) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onCreated(await createProject(name.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the project.");
      setBusy(false);
    }
  }

  return (
    <Card title="Create a sandbox project">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <label htmlFor="project-name" className="text-sm text-gray">
          Project name
        </label>
        <input
          id="project-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          placeholder="My Stellar app"
          className={inputClass}
        />
        {error && <ErrorText>{error}</ErrorText>}
        <Button type="submit" loading={busy} disabled={name.trim() === ""}>
          Create project
        </Button>
      </form>
    </Card>
  );
}

function SignIn({ onSignIn }: Pick<Props, "onSignIn">) {
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await lendaraClient(key.trim()).getProject();
      onSignIn(key.trim());
    } catch {
      setError("This API key is not valid.");
      setBusy(false);
    }
  }

  return (
    <Card title="Already have an API key?">
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="api-key" className="sr-only">
          API key
        </label>
        <input
          id="api-key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="lnd_test_…"
          spellCheck={false}
          autoComplete="off"
          className={`${inputClass} font-mono text-sm sm:flex-1`}
        />
        <Button type="submit" variant="secondary" loading={busy} disabled={!key.trim().startsWith("lnd_test_")}>
          Open dashboard
        </Button>
      </form>
      {error && (
        <div className="mt-3">
          <ErrorText>{error}</ErrorText>
        </div>
      )}
    </Card>
  );
}
