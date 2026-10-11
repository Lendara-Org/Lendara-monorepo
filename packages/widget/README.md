# @lendara/widget

Opens the [Lendara](https://lendara-monorepo-fixh.vercel.app) sandbox on-ramp in a modal (or popup) and reports the deposit status. Stellar **testnet** only; fiat rails are simulated.

```sh
npm install @lendara/widget
```

```ts
import { Lendara } from "@lendara/widget";

// `url` comes from POST /v1/sessions on your server (see @lendara/ramp).
Lendara.open({
  url,
  mode: "modal", // or "popup"
  onStatus: (tx) => console.log(tx.status),
  onComplete: (tx) => console.log("USDC sent", tx.stellar_transaction_id),
  onError: (err) => console.error(err.message, err.transaction),
  onClose: () => {},
});
```

Only messages from the widget's origin and window are accepted. Test cards: `4242 4242 4242 4242` approved, `4000 0000 0000 0002` KYC rejected, `4000 0000 0000 9995` payment not received, `4000 0000 0000 0077` delayed 30 s.
