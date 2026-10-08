import type { components } from "./schema.gen.ts";

export type { components, paths, operations } from "./schema.gen.ts";

type Schemas = components["schemas"];

export type Sep24Transaction = Schemas["Sep24Transaction"];
export type Sep24TransactionStatus = Schemas["Sep24TransactionStatus"];
export type Sep24InteractiveResponse = Schemas["Sep24InteractiveResponse"];
