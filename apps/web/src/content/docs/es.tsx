import Link from "next/link";
import { A, C, Callout, CodeBlock, H2, H3, List, P, Table } from "@/components/docs/prose";
import type { DocChrome, DocPage, DocSlug } from "@/lib/docs";
import { API_URL, DEMO_URL, REPO_URL, USDC_ISSUER } from "@/lib/site";

const COPY: [string, string] = ["Copiar", "Copiado"];
const Code = ({ code, title }: { code: string; title?: string }) => <CodeBlock code={code} title={title} copy={COPY} />;

export const chrome: DocChrome = {
  docs: "Docs",
  dashboard: "Dashboard",
  demo: "Demo",
  previous: "Anterior",
  next: "Siguiente",
  menu: "Menú",
  copy: COPY[0],
  copied: COPY[1],
};

export const pages: Record<DocSlug, DocPage> = {
  "": {
    title: "Sandbox de Lendara",
    description: "Una rampa fiat → USDC embebible sobre Stellar testnet, para Costa Rica, Argentina y Chile.",
    body: () => (
      <>
        <P>
          Lendara permite que tus usuarios paguen en su moneda local (CRC, ARS o CLP) y reciban USDC en su wallet de
          Stellar. Este sandbox corre todo el flujo en <strong>Stellar testnet</strong> con rieles fiat simulados, así que
          puedes integrar y probar cada camino sin dinero real.
        </P>
        <H2 id="two-ways">Dos formas de integrar</H2>
        <Table
          head={["Eres…", "Usa", "Autenticación"]}
          rows={[
            [
              "Una app o dApp (no una wallet)",
              <>
                La API de Lendara con <C>@lendara/ramp</C> en tu servidor y <C>@lendara/widget</C> en el navegador
              </>,
              "API key del proyecto",
            ],
            ["Una wallet de Stellar", "Los endpoints estándar de anchor: SEP-1, SEP-10 y SEP-24", "SEP-10 (JWT)"],
          ]}
        />
        <P>Ambas comparten las mismas transacciones y la misma máquina de estados.</P>
        <H2 id="how-it-works">Cómo funciona un depósito</H2>
        <List ordered>
          <li>Tu servidor crea una sesión para la cuenta de Stellar del usuario y recibe una URL de un solo uso.</li>
          <li>El navegador abre el widget de Lendara (modal o popup).</li>
          <li>El usuario elige moneda y monto, ve la cotización y paga con una tarjeta de prueba.</li>
          <li>Lendara envía USDC en testnet a la cuenta del usuario y tu app recibe el aviso.</li>
        </List>
        <H2 id="start">Empieza aquí</H2>
        <List>
          <li>
            <Link href="/docs/es/quickstart" className="underline">
              Inicio rápido
            </Link>
            : integra en 5 minutos.
          </li>
          <li>
            <Link href="/dashboard" className="underline">
              Dashboard
            </Link>
            : crea un proyecto y obtén tu API key.
          </li>
          <li>
            <A href={DEMO_URL}>Demo en vivo</A>: una app de ejemplo que usa Lendara.
          </li>
          <li>
            <A href={REPO_URL}>Código fuente</A> en GitHub.
          </li>
        </List>
      </>
    ),
  },

  quickstart: {
    title: "Inicio rápido",
    description: "De cero a USDC en testnet en cinco minutos.",
    body: () => (
      <>
        <H2 id="key">1. Obtén una API key</H2>
        <P>
          Abre el{" "}
          <Link href="/dashboard" className="underline">
            dashboard
          </Link>{" "}
          y crea un proyecto sandbox. Copia la API key (<C>lnd_test_…</C>): se muestra una sola vez. Guárdala en tu
          servidor como <C>LENDARA_API_KEY</C>.
        </P>
        <Callout title="La key se queda en tu servidor" tone="warning">
          La API key da acceso completo a tu proyecto. Nunca la pongas en código del navegador; al navegador solo le
          envías la URL de la sesión.
        </Callout>
        <H2 id="install">2. Instala</H2>
        <Code code="npm i @lendara/ramp @lendara/widget" />
        <H2 id="session">3. Crea una sesión en tu servidor</H2>
        <Code
          title="app/api/session/route.ts"
          code={`import { LendaraRamp } from "@lendara/ramp";

const lendara = new LendaraRamp({ apiKey: process.env.LENDARA_API_KEY! });

export async function POST(req: Request) {
  const { account, fiat_currency, amount } = await req.json();
  const session = await lendara.createSession({
    account,        // cuenta de Stellar del usuario (G...)
    fiat_currency,  // opcional: "CRC", "ARS" o "CLP"
    amount,         // opcional: prellena el widget, p. ej. "25000"
  });
  return Response.json({ url: session.url });
}`}
        />
        <H2 id="widget">4. Abre el widget en el navegador</H2>
        <Code
          title="add-funds-button.ts"
          code={`import { Lendara } from "@lendara/widget";

const { url } = await fetch("/api/session", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ account, fiat_currency: "CRC", amount: "25000" }),
}).then((r) => r.json());

Lendara.open({
  url: url + "&lang=es",
  onComplete: (tx) => console.log("USDC enviados:", tx.stellar_transaction_id),
  onError: (err) => console.error(err.message),
});`}
        />
        <H2 id="pay">5. Paga con una tarjeta de prueba</H2>
        <P>
          En el widget usa <C>4242 4242 4242 4242</C> con cualquier fecha futura y cualquier CVC. En segundos llegan los
          USDC y se dispara <C>onComplete</C>. Otras tarjetas fuerzan otros resultados: mira{" "}
          <Link href="/docs/es/test-cards" className="underline">
            Tarjetas de prueba
          </Link>
          .
        </P>
        <Callout title="La cuenta necesita una trustline a USDC">
          La cuenta del usuario debe existir en testnet y confiar en el USDC de prueba de Lendara (código <C>USDC</C>,
          emisor <C>{USDC_ISSUER.slice(0, 8)}…</C>). Mira{" "}
          <Link href="/docs/es/sandbox" className="underline">
            Sandbox vs. producción
          </Link>
          .
        </Callout>
      </>
    ),
  },

  "test-cards": {
    title: "Tarjetas de prueba y estados",
    description: "Fuerza cada resultado con una tarjeta de prueba, como en el modo test de Stripe.",
    body: () => (
      <>
        <H2 id="cards">Tarjetas de prueba</H2>
        <P>
          Usa cualquier fecha de vencimiento futura y cualquier CVC de 3 dígitos. Las tarjetas reales se rechazan, y los
          datos de la tarjeta nunca salen del navegador.
        </P>
        <Table
          head={["Tarjeta", "Escenario", "Resultado"]}
          rows={[
            [<C key="c">4242 4242 4242 4242</C>, "approved", <>USDC enviados → <C>completed</C></>],
            [<C key="c">4000 0000 0000 0002</C>, "kyc_rejected", <><C>error</C> con el mensaje “KYC rejected”</>],
            [<C key="c">4000 0000 0000 9995</C>, "payment_not_received", <C key="s">expired</C>],
            [<C key="c">4000 0000 0000 0077</C>, "delayed", <>30 s en <C>pending_anchor</C>, luego <C>completed</C></>],
          ]}
        />
        <H2 id="statuses">Estados</H2>
        <P>Las transacciones siguen los estados de SEP-24:</P>
        <Code
          code={`incomplete → pending_user_transfer_start → pending_anchor → pending_stellar → completed
                                      ↘ expired         ↘ pending_trust
cualquier estado → error`}
        />
        <Table
          head={["Estado", "Significado"]}
          rows={[
            [<C key="s">incomplete</C>, "Sesión creada; el usuario no ha confirmado el monto."],
            [<C key="s">pending_user_transfer_start</C>, "Monto confirmado; esperando el pago (simulado)."],
            [<C key="s">pending_anchor</C>, "Pago recibido; Lendara prepara el envío de USDC."],
            [<C key="s">pending_trust</C>, "La cuenta no tiene trustline a USDC. Lendara reintenta durante una hora."],
            [<C key="s">pending_stellar</C>, "Transacción de USDC enviada a Stellar."],
            [<C key="s">completed</C>, <>USDC entregados; <C>stellar_transaction_id</C> tiene el hash.</>],
            [<C key="s">expired</C>, "El pago nunca llegó."],
            [<C key="s">error</C>, <>Algo falló; revisa <C>message</C>.</>],
          ]}
        />
        <H2 id="rates">Tasas, comisión y límites</H2>
        <List>
          <li>Tasas ficticias por 1 USDC: CRC 510, ARS 1.000, CLP 950.</li>
          <li>Comisión fija: 0,50 USDC.</li>
          <li>Cada depósito: de 1 a 10.000 USDC después de la comisión. Los montos fiat tienen hasta 2 decimales.</li>
        </List>
      </>
    ),
  },

  widget: {
    title: "Widget (@lendara/widget)",
    description: "Abre el checkout de Lendara sobre tu página y sigue el depósito.",
    body: () => (
      <>
        <Code code="npm i @lendara/widget" />
        <H2 id="open">Lendara.open(options)</H2>
        <Table
          head={["Opción", "Tipo", "Descripción"]}
          rows={[
            [<C key="o">url</C>, "string", <>URL de la sesión de <C>POST /v1/sessions</C> (o una URL interactiva de SEP-24). Obligatoria.</>],
            [<C key="o">mode</C>, <C key="t">&quot;modal&quot; | &quot;popup&quot;</C>, "Modal (por defecto) muestra un iframe sobre tu página; popup abre una ventana."],
            [<C key="o">onStatus</C>, "(tx) => void", "Cada cambio de estado."],
            [<C key="o">onComplete</C>, "(tx) => void", "Los USDC llegaron a la cuenta."],
            [<C key="o">onError</C>, "(err) => void", <>El depósito falló (<C>err.transaction</C>) o el navegador bloqueó el popup.</>],
            [<C key="o">onClose</C>, "() => void", "El usuario cerró el widget, o llamaste close()."],
          ]}
        />
        <P>
          Devuelve <C>{"{ close() }"}</C>. Solo hay un widget abierto a la vez. Agrega <C>&lang=es</C> o <C>&lang=en</C>{" "}
          a la URL para elegir el idioma.
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

// después
widget.close();`}
        />
        <H2 id="security">Seguridad</H2>
        <List>
          <li>El loader solo acepta mensajes del origen y la ventana del widget.</li>
          <li>El token de la URL de la sesión funciona una vez y vence a los 15 minutos.</li>
          <li>Abre el popup desde un clic; si no, el navegador puede bloquearlo.</li>
        </List>
      </>
    ),
  },

  sdk: {
    title: "API y SDK (@lendara/ramp)",
    description: "Cliente de servidor y endpoints REST para integradores.",
    body: () => (
      <>
        <Code code="npm i @lendara/ramp" />
        <H2 id="client">Cliente</H2>
        <Code
          code={`import { LendaraRamp, LendaraError } from "@lendara/ramp";

const lendara = new LendaraRamp({ apiKey: process.env.LENDARA_API_KEY! });

const session = await lendara.createSession({ account: "G...", fiat_currency: "CLP", amount: "25000" });
const tx = await lendara.getTransaction(session.id);
const { data, next_cursor } = await lendara.listTransactions({ limit: 20 });
const project = await lendara.getProject();`}
        />
        <P>
          Los errores de la API lanzan <C>LendaraError</C> con <C>status</C> y <C>message</C>. Los tipos de cada request y
          response salen del contrato OpenAPI.
        </P>
        <H2 id="rest">Endpoints REST</H2>
        <P>
          URL base: <C>{API_URL}</C>. Envía <C>Authorization: Bearer lnd_test_…</C>.
        </P>
        <Table
          head={["Endpoint", "Descripción"]}
          rows={[
            [<C key="e">POST /v1/projects</C>, "Crea un proyecto y devuelve su API key una sola vez. Sin autenticación."],
            [<C key="e">GET /v1/project</C>, "El proyecto de la API key."],
            [<C key="e">POST /v1/sessions</C>, <>Crea un depósito en <C>incomplete</C> y devuelve <C>{"{ id, url, expires_at }"}</C>.</>],
            [<C key="e">GET /v1/transactions</C>, <>Transacciones del proyecto, las más nuevas primero. <C>limit</C> (1–100) y <C>cursor</C>.</>],
            [<C key="e">GET /v1/transactions/{"{id}"}</C>, "Una transacción (esquema de SEP-24)."],
          ]}
        />
        <Code
          title="curl"
          code={`curl -X POST ${API_URL}/v1/sessions \\
  -H "Authorization: Bearer $LENDARA_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"account":"G...","fiat_currency":"CRC","amount":"25000"}'`}
        />
        <H3>Errores</H3>
        <P>
          Los errores devuelven JSON <C>{'{ "error": "…" }'}</C>: <C>400</C> request inválido, <C>401</C> API key faltante
          o inválida, <C>404</C> no encontrado (también para transacciones de otros proyectos).
        </P>
        <Callout title="Webhooks">
          Todavía no están disponibles en el sandbox. Usa los callbacks del widget en el navegador y{" "}
          <C>GET /v1/transactions/{"{id}"}</C> en tu servidor para confirmar el estado final.
        </Callout>
      </>
    ),
  },

  wallets: {
    title: "Para wallets (SEP-1, 10, 24)",
    description: "Cualquier wallet compatible con SEP-24 puede usar Lendara sin código extra.",
    body: () => (
      <>
        <P>Lendara es un anchor estándar de Stellar. Apunta tu wallet a su dominio:</P>
        <Table
          head={["", "URL"]}
          rows={[
            ["SEP-1", <C key="u">{API_URL}/.well-known/stellar.toml</C>],
            ["SEP-10", <C key="u">{API_URL}/auth</C>],
            ["SEP-24", <C key="u">{API_URL}/sep24</C>],
          ]}
        />
        <H2 id="flow">Flujo</H2>
        <List ordered>
          <li>
            Lee <C>stellar.toml</C> para encontrar los endpoints, la signing key y el emisor de USDC.
          </li>
          <li>
            Autentícate con SEP-10: <C>GET /auth?account=G…</C>, firma el challenge, <C>POST /auth</C>. El JWT dura 24 h.
          </li>
          <li>
            Inicia un depósito: <C>POST /sep24/transactions/deposit/interactive</C> con <C>asset_code=USDC</C>.
          </li>
          <li>
            Abre la <C>url</C> que devuelve en un popup o iframe. El widget publica <C>{"{ transaction }"}</C> en cada
            cambio de estado.
          </li>
          <li>
            Consulta <C>GET /sep24/transaction?id=…</C> hasta <C>completed</C>.
          </li>
        </List>
        <H2 id="demo-wallet">Pruébalo con la Demo Wallet de SDF</H2>
        <List ordered>
          <li>
            Abre <A href="https://demo-wallet.stellar.org">demo-wallet.stellar.org</A> y crea o importa una cuenta de
            testnet.
          </li>
          <li>
            Agrega el activo <C>USDC</C> con el dominio <C>{API_URL.replace(/^https?:\/\//, "")}</C>.
          </li>
          <li>Agrega la trustline, elige “SEP-24 deposit” y sigue el widget con una tarjeta de prueba.</li>
        </List>
        <Callout title="Notas">
          Solo depósitos (todavía no hay retiros). El campo <C>amount</C> es un prellenado: el usuario lo confirma en el
          widget. Se aceptan memos (<C>text</C>, <C>id</C>, <C>hash</C>).
        </Callout>
      </>
    ),
  },

  sandbox: {
    title: "Sandbox vs. producción",
    description: "Qué está simulado y cómo funcionaría el producto real.",
    body: () => (
      <>
        <H2 id="usdc">USDC de prueba</H2>
        <P>
          El sandbox emite su propio activo de prueba llamado <C>USDC</C>. En Stellar un activo se identifica por su{" "}
          <strong>código y su emisor</strong>, así que este no es el USDC de Circle (ni de testnet ni de mainnet) y no
          tiene valor.
        </P>
        <Table
          head={["Campo", "Valor"]}
          rows={[
            ["Código", <C key="v">USDC</C>],
            ["Emisor", <C key="v">{USDC_ISSUER}</C>],
            ["Red", "Stellar testnet"],
          ]}
        />
        <P>
          Para recibirlo, la cuenta necesita una trustline a este emisor exacto. Si buscas “USDC” en una wallet vas a ver
          muchos activos: agrégalo a mano con el código y el emisor de arriba, o verifícalo en{" "}
          <A href={`https://stellar.expert/explorer/testnet/asset/USDC-${USDC_ISSUER}`}>Stellar Expert</A>.
        </P>
        <H2 id="simulated">Qué está simulado</H2>
        <List>
          <li>Los pagos fiat: no interviene ningún banco ni red de tarjetas; la tarjeta de prueba decide el resultado.</li>
          <li>Las tasas de cambio y la comisión son fijas y ficticias.</li>
          <li>El KYC se simula con la tarjeta de prueba “KYC rejected”.</li>
        </List>
        <H2 id="production">En producción</H2>
        <P>
          Lendara <strong>no emitiría USDC</strong>: solo Circle lo hace. Lendara recibiría moneda local por rieles de pago
          locales y entregaría USDC de Circle desde su propio inventario (liquidez comprada a Circle o en exchanges),
          cobrando una comisión. Eso requiere licencias y KYC real, que quedan fuera del sandbox.
        </P>
      </>
    ),
  },
};
