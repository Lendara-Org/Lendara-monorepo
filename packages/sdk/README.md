# @lendara/ramp

Server-side client for the [Lendara](https://lendara-monorepo-fixh.vercel.app) sandbox: an embeddable fiat → USDC on-ramp on Stellar **testnet**. Fiat rails are simulated; no real money moves.

```sh
npm install @lendara/ramp
```

```ts
import { LendaraRamp } from "@lendara/ramp";

// On your server: the API key gives full access to your project.
const lendara = new LendaraRamp({ apiKey: process.env.LENDARA_API_KEY! });

const session = await lendara.createSession({
  account: "G...", // Stellar account that receives the USDC
  fiat_currency: "CRC", // optional: CRC, ARS or CLP
  amount: "20000", // optional: prefills the widget
});
// Send session.url to the browser and open it with @lendara/widget.

const tx = await lendara.getTransaction(session.id);
const { data, next_cursor } = await lendara.listTransactions({ limit: 20 });
```

Errors throw `LendaraError` with the HTTP `status` and the API `message`.
