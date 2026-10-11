import type { components } from "./schema.gen.ts";

export type { components, paths, operations } from "./schema.gen.ts";

type Schemas = components["schemas"];

export type Sep24Transaction = Schemas["Sep24Transaction"];
export type Sep24TransactionStatus = Schemas["Sep24TransactionStatus"];
export type Sep24InteractiveResponse = Schemas["Sep24InteractiveResponse"];
export type FiatCurrency = Schemas["FiatCurrency"];
export type Session = Schemas["Session"];
export type SessionCreateRequest = Schemas["SessionCreateRequest"];
export type TransactionList = Schemas["TransactionList"];
export type Quote = Schemas["Quote"];
export type Project = Schemas["Project"];

export { LendaraError, LendaraRamp, SANDBOX_BASE_URL, type LendaraRampOptions } from "./client.ts";
