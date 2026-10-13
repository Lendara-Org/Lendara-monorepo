import Link from "next/link";
import { A, C, Callout, CodeBlock, H2, H3, List, P, Table } from "@/components/docs/prose";
import type { DocChrome, DocPage, DocSlug } from "@/lib/docs";
import { API_URL, DEMO_URL, HOME_DOMAIN, REPO_URL, USDC_ISSUER } from "@/lib/site";

const COPY: [string, string] = ["Copy", "Copied"];
const Code = ({ code, title }: { code: string; title?: string }) => <CodeBlock code={code} title={title} copy={COPY} />;

export const chrome: DocChrome = {
  docs: "Docs",
  dashboard: "Dashboard",
  demo: "Demo",
  previous: "Previous",
  next: "Next",
  menu: "Menu",
  copy: COPY[0],
  copied: COPY[1],
};

export const pages: Record<DocSlug, DocPage> = {
  "": {
    title: "Lendara sandbox",
    description: "An embeddable fiat → USDC on-ramp on Stellar testnet, for Costa Rica, Argentina and Chile.",
    body: () => (
      <>
        <P>
          Lendara lets your users pay in their local currency (CRC, ARS or CLP) and receive USDC in their Stellar wallet.
          This sandbox runs the whole flow on <strong>Stellar testnet</strong> with simulated fiat rails, so you can
          integrate and test every path without real money.
        </P>
        <H2 id="two-ways">Two ways to integrate</H2>
        <Table
          head={["You are…", "Use", "Auth"]}
          rows={[
            [
              "An app or dApp (not a wallet)",
              <>
                The Lendara API with <C>@lendara/ramp</C> on your server and <C>@lendara/widget</C> in the browser
              </>,
              "Project API key",
            ],
            ["A Stellar wallet", "The standard anchor endpoints: SEP-1, SEP-10 and SEP-24", "SEP-10 (JWT)"],
          ]}
        />
        <P>Both share the same transactions and the same status machine.</P>
        <H2 id="how-it-works">How a deposit works</H2>
        <List ordered>
          <li>Your server creates a session for the user&apos;s Stellar account and gets a one-time widget URL.</li>
          <li>The browser opens the Lendara widget (modal or popup).</li>
          <li>The user picks currency and amount, sees the quote and pays with a test card.</li>
          <li>Lendara sends USDC on testnet to the user&apos;s account and your app is notified.</li>
        </List>
        <H2 id="start">Start here</H2>
        <List>
          <li>
            <Link href="/docs/en/quickstart" className="underline">
              Quickstart
            </Link>
            : integrate in 5 minutes.
          </li>
          <li>
            <Link href="/dashboard" className="underline">
              Dashboard
            </Link>
            : create a project and get your API key.
          </li>
          <li>
            <A href={DEMO_URL}>Live demo</A>: an example app that uses Lendara.
          </li>
          <li>
            <A href={REPO_URL}>Source code</A> on GitHub.
          </li>
        </List>
      </>
    ),
  },

  quickstart: {
    title: "Quickstart",
    description: "From zero to USDC on testnet in five minutes.",
    body: () => (
      <>
        <H2 id="key">1. Get an API key</H2>
        <P>
          Open the{" "}
          <Link href="/dashboard" className="underline">
            dashboard
          </Link>{" "}
          and create a sandbox project. Copy the API key (<C>lnd_test_…</C>): it&apos;s shown only once. Store it on your
          server as <C>LENDARA_API_KEY</C>.
        </P>
        <Callout title="Keep the key on your server" tone="warning">
          The API key gives full access to your project. Never put it in browser code; send only the session URL to the
          browser.
        </Callout>
        <H2 id="install">2. Install</H2>
        <Code code="npm i @lendara/ramp @lendara/widget" />
        <H2 id="session">3. Create a session on your server</H2>
        <Code
          title="app/api/session/route.ts"
          code={`import { LendaraRamp } from "@lendara/ramp";

const lendara = new LendaraRamp({ apiKey: process.env.LENDARA_API_KEY! });

export async function POST(req: Request) {
  const { account, fiat_currency, amount } = await req.json();
  const session = await lendara.createSession({
    account,        // user's Stellar account (G...)
    fiat_currency,  // optional: "CRC", "ARS" or "CLP"
    amount,         // optional: prefills the widget, e.g. "25000"
  });
  return Response.json({ url: session.url });
}`}
        />
        <H2 id="widget">4. Open the widget in the browser</H2>
        <Code
          title="add-funds-button.ts"
          code={`import { Lendara } from "@lendara/widget";

const { url } = await fetch("/api/session", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ account, fiat_currency: "CRC", amount: "25000" }),
}).then((r) => r.json());

Lendara.open({
  url,
  onComplete: (tx) => console.log("USDC sent:", tx.stellar_transaction_id),
  onError: (err) => console.error(err.message),
});`}
        />
        <H2 id="pay">5. Pay with a test card</H2>
        <P>
          In the widget, use <C>4242 4242 4242 4242</C> with any future date and any CVC. In a few seconds the USDC
          arrives and <C>onComplete</C> fires. Other cards force other outcomes: see{" "}
          <Link href="/docs/en/test-cards" className="underline">
            Test cards
          </Link>
          .
        </P>
        <Callout title="The account needs a USDC trustline">
          The user&apos;s account must exist on testnet and trust Lendara&apos;s test USDC (code <C>USDC</C>, issuer{" "}
          <C>{USDC_ISSUER.slice(0, 8)}…</C>). See{" "}
          <Link href="/docs/en/sandbox" className="underline">
            Sandbox vs. production
          </Link>
          .
        </Callout>
      </>
    ),
  },

  "test-cards": {
    title: "Test cards and statuses",
    description: "Force each outcome with a test card, like Stripe's test mode.",
    body: () => (
      <>
        <H2 id="cards">Test cards</H2>
        <P>Use any future expiry date and any 3-digit CVC. Real cards are rejected, and card data never leaves the browser.</P>
        <Table
          head={["Card", "Scenario", "Result"]}
          rows={[
            [<C key="c">4242 4242 4242 4242</C>, "approved", <>USDC sent → <C>completed</C></>],
            [<C key="c">4000 0000 0000 0002</C>, "kyc_rejected", <><C>error</C> with message “KYC rejected”</>],
            [<C key="c">4000 0000 0000 9995</C>, "payment_not_received", <C key="s">expired</C>],
            [<C key="c">4000 0000 0000 0077</C>, "delayed", <>30 s in <C>pending_anchor</C>, then <C>completed</C></>],
          ]}
        />
        <H2 id="statuses">Statuses</H2>
        <P>Transactions follow the SEP-24 statuses:</P>
        <Code
          code={`incomplete → pending_user_transfer_start → pending_anchor → pending_stellar → completed
                                      ↘ expired         ↘ pending_trust
any status → error`}
        />
        <Table
          head={["Status", "Meaning"]}
          rows={[
            [<C key="s">incomplete</C>, "Session created; the user hasn't confirmed the amount."],
            [<C key="s">pending_user_transfer_start</C>, "Amount confirmed; waiting for the (simulated) payment."],
            [<C key="s">pending_anchor</C>, "Payment received; Lendara is preparing the USDC transfer."],
            [<C key="s">pending_trust</C>, "The account has no USDC trustline. Lendara retries for one hour."],
            [<C key="s">pending_stellar</C>, "USDC transaction submitted to Stellar."],
            [<C key="s">completed</C>, <>USDC delivered; <C>stellar_transaction_id</C> has the hash.</>],
            [<C key="s">expired</C>, "The payment never arrived."],
            [<C key="s">error</C>, <>Something failed; read <C>message</C>.</>],
          ]}
        />
        <H2 id="rates">Rates, fee and limits</H2>
        <List>
          <li>Fictitious rates per 1 USDC: CRC 510, ARS 1,000, CLP 950.</li>
          <li>Fixed fee: 0.50 USDC.</li>
          <li>Each deposit: 1 to 10,000 USDC after the fee. Fiat amounts have up to 2 decimals.</li>
        </List>
      </>
    ),
  },

  widget: {
    title: "Widget (@lendara/widget)",
    description: "Open the Lendara checkout over your page and follow the deposit.",
    body: () => (
      <>
        <Code code="npm i @lendara/widget" />
        <H2 id="open">Lendara.open(options)</H2>
        <Table
          head={["Option", "Type", "Description"]}
          rows={[
            [<C key="o">url</C>, "string", <>Session URL from <C>POST /v1/sessions</C> (or a SEP-24 interactive URL). Required.</>],
            [<C key="o">mode</C>, <C key="t">&quot;modal&quot; | &quot;popup&quot;</C>, "Modal (default) shows an iframe over your page; popup opens a window."],
            [<C key="o">onStatus</C>, "(tx) => void", "Every status change."],
            [<C key="o">onComplete</C>, "(tx) => void", "The USDC reached the account."],
            [<C key="o">onError</C>, "(err) => void", <>The deposit failed (<C>err.transaction</C>) or the popup was blocked.</>],
            [<C key="o">onClose</C>, "() => void", "The user closed the widget, or you called close()."],
          ]}
        />
        <P>
          It returns <C>{"{ close() }"}</C>. Only one widget is open at a time. Add <C>&lang=es</C> or <C>&lang=en</C> to
          the URL to choose the language.
        </P>
        <Code
          code={`const widget = Lendara.open({
  url,
  mode: "modal",
  onStatus: (tx) => console.log(tx.status),
  onComplete: (tx) => showReceipt(tx),
  onError: (err) => showError(err.message),
  onClose: () => refreshBalance(),
});

// later
widget.close();`}
        />
        <H2 id="security">Security</H2>
        <List>
          <li>The loader only accepts messages from the widget&apos;s origin and window.</li>
          <li>The session URL token works once and expires after 15 minutes.</li>
          <li>Open the popup from a click, or the browser may block it.</li>
        </List>
      </>
    ),
  },

  sdk: {
    title: "API and SDK (@lendara/ramp)",
    description: "Server-side client and REST endpoints for integrators.",
    body: () => (
      <>
        <Code code="npm i @lendara/ramp" />
        <H2 id="client">Client</H2>
        <Code
          code={`import { LendaraRamp, LendaraError } from "@lendara/ramp";

const lendara = new LendaraRamp({ apiKey: process.env.LENDARA_API_KEY! });

const session = await lendara.createSession({ account: "G...", fiat_currency: "CLP", amount: "25000" });
const tx = await lendara.getTransaction(session.id);
const { data, next_cursor } = await lendara.listTransactions({ limit: 20 });
const project = await lendara.getProject();`}
        />
        <P>
          API errors throw <C>LendaraError</C> with <C>status</C> and <C>message</C>. Types for every request and
          response come from the OpenAPI contract.
        </P>
        <H2 id="rest">REST endpoints</H2>
        <P>
          Base URL: <C>{API_URL}</C>. Send <C>Authorization: Bearer lnd_test_…</C>.
        </P>
        <Table
          head={["Endpoint", "Description"]}
          rows={[
            [<C key="e">POST /v1/projects</C>, "Creates a project and returns its API key once. No auth."],
            [<C key="e">GET /v1/project</C>, "The project of the API key."],
            [<C key="e">POST /v1/sessions</C>, <>Creates a deposit in <C>incomplete</C> and returns <C>{"{ id, url, expires_at }"}</C>.</>],
            [<C key="e">GET /v1/transactions</C>, <>The project&apos;s transactions, newest first. <C>limit</C> (1–100) and <C>cursor</C>.</>],
            [<C key="e">GET /v1/transactions/{"{id}"}</C>, "One transaction (SEP-24 schema)."],
          ]}
        />
        <Code
          title="curl"
          code={`curl -X POST ${API_URL}/v1/sessions \\
  -H "Authorization: Bearer $LENDARA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"account":"G...","fiat_currency":"CRC","amount":"25000"}'`}
        />
        <H3>Errors</H3>
        <P>
          Errors return JSON <C>{'{ "error": "…" }'}</C>: <C>400</C> invalid request, <C>401</C> missing or invalid API key,{" "}
          <C>404</C> not found (also for other projects&apos; transactions).
        </P>
        <Callout title="Webhooks">
          Not available yet in the sandbox. Use the widget callbacks in the browser, and <C>GET /v1/transactions/{"{id}"}</C>{" "}
          on your server to confirm the final status.
        </Callout>
      </>
    ),
  },

  wallets: {
    title: "For wallets (SEP-1, 10, 24)",
    description: "Any SEP-24 wallet can use Lendara without extra code.",
    body: () => (
      <>
        <P>Lendara is a standard Stellar anchor. Point your wallet to its home domain:</P>
        <Table
          head={["", "URL"]}
          rows={[
            ["SEP-1", <C key="u">https://{HOME_DOMAIN}/.well-known/stellar.toml</C>],
            ["SEP-10", <C key="u">{API_URL}/auth</C>],
            ["SEP-24", <C key="u">{API_URL}/sep24</C>],
          ]}
        />
        <H2 id="flow">Flow</H2>
        <List ordered>
          <li>
            Read <C>stellar.toml</C> to find the endpoints, the signing key and the USDC issuer.
          </li>
          <li>
            Authenticate with SEP-10: <C>GET /auth?account=G…</C>, sign the challenge, <C>POST /auth</C>. The JWT lasts 24 h.
          </li>
          <li>
            Start a deposit: <C>POST /sep24/transactions/deposit/interactive</C> with <C>asset_code=USDC</C>.
          </li>
          <li>
            Open the returned <C>url</C> in a popup or iframe. The widget posts <C>{"{ transaction }"}</C> on every status
            change.
          </li>
          <li>
            Poll <C>GET /sep24/transaction?id=…</C> until <C>completed</C>.
          </li>
        </List>
        <H2 id="demo-wallet">Try it with the SDF Demo Wallet</H2>
        <List ordered>
          <li>
            Open <A href="https://demo-wallet.stellar.org">demo-wallet.stellar.org</A> and create or import a testnet
            account.
          </li>
          <li>
            Add the asset <C>USDC</C> with the home domain <C>{HOME_DOMAIN}</C>.
          </li>
          <li>Add the trustline, then choose “SEP-24 deposit” and follow the widget with a test card.</li>
        </List>
        <Callout title="Notes">
          Deposits only (no withdrawals yet). The <C>amount</C> field is a prefill: the user confirms it in the widget.
          Memos (<C>text</C>, <C>id</C>, <C>hash</C>) are supported.
        </Callout>
      </>
    ),
  },

  sandbox: {
    title: "Sandbox vs. production",
    description: "What is simulated, and how the real product would work.",
    body: () => (
      <>
        <H2 id="usdc">Test USDC</H2>
        <P>
          The sandbox issues its own test asset called <C>USDC</C>. On Stellar an asset is identified by its{" "}
          <strong>code and issuer</strong>, so this is not Circle&apos;s USDC (testnet or mainnet) and has no value.
        </P>
        <Table
          head={["Field", "Value"]}
          rows={[
            ["Code", <C key="v">USDC</C>],
            ["Issuer", <C key="v">{USDC_ISSUER}</C>],
            ["Network", "Stellar testnet"],
          ]}
        />
        <P>
          To receive it, an account needs a trustline to this exact issuer. Searching “USDC” in a wallet shows many assets:
          add it manually with the code and issuer above, or verify it on{" "}
          <A href={`https://stellar.expert/explorer/testnet/asset/USDC-${USDC_ISSUER}`}>Stellar Expert</A>.
        </P>
        <H2 id="simulated">What is simulated</H2>
        <List>
          <li>Fiat payments: no bank or card network is involved; the test card decides the outcome.</li>
          <li>Exchange rates and fee are fixed and fictitious.</li>
          <li>KYC is simulated by the “KYC rejected” test card.</li>
        </List>
        <H2 id="production">In production</H2>
        <P>
          Lendara would <strong>not issue USDC</strong>: only Circle does. Lendara would receive local currency through
          local payment rails and deliver Circle USDC from its own inventory (liquidity bought through Circle or exchanges),
          earning a fee. That requires licenses and real KYC, which are outside the sandbox.
        </P>
      </>
    ),
  },
};
