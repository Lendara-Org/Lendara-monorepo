import { LendaraRamp, type components } from "@lendara/ramp";
import { API_BASE_URL, ApiError } from "./widget-api";

export type ProjectCreated = components["schemas"]["ProjectCreated"];

/** Creates a sandbox project. The response holds the only copy of its API key. */
export async function createProject(name: string): Promise<ProjectCreated> {
  const res = await fetch(`${API_BASE_URL}/v1/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string } | null)?.error ?? res.statusText);
  return data as ProjectCreated;
}

/** The dashboard is the key owner's own browser, so it calls /v1 directly. */
export const lendaraClient = (apiKey: string) => new LendaraRamp({ apiKey, baseUrl: API_BASE_URL });
