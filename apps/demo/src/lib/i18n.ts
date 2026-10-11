export type Lang = "es" | "en";

// Fictitious app that integrates Lendara.
export const APP_NAME = "Demo";

const en = {
  copy: "Copy",
  copied: "Copied",
  banner: "Demo app on Stellar testnet. Payments are simulated by the Lendara sandbox; no real money moves.",
  title: "Add dollars to your wallet",
  subtitle: "Pay in your local currency and receive USDC on Stellar in seconds.",
  wallet: {
    step: "Your Stellar wallet",
    create: "Create a test wallet",
    creating: "Creating your test wallet…",
    createHint: "Recommended: ready to receive USDC in one click.",
    or: "or",
    pasteLabel: "Use your own testnet address",
    invalid: "Enter a valid Stellar address (starts with G, 56 characters).",
    createError: "Could not create a test wallet. Try again in a few seconds.",
    balance: "Balance",
    explorer: "View on explorer",
    change: "Change",
    notFound: "This account doesn't exist on testnet yet. Fund it with Friendbot first.",
    checking: "Checking…",
  },
  trust: {
    title: "Your account can't receive Lendara's test USDC yet",
    why: "On Stellar, an asset is identified by its code and its issuer. Many tokens are called “USDC” (Circle's testnet USDC, for example), but each issuer is a different asset. The Lendara sandbox sends its own test USDC, so your account needs a trustline to this exact issuer:",
    code: "Asset code",
    issuer: "Issuer",
    verify: "Verify the asset on Stellar Expert",
    howTo: "How to add it",
    steps: [
      "In your wallet (Freighter, Lobstr…), switch to Testnet.",
      "Open “Manage assets” → “Add manually” (don't search by name: there are many USDC).",
      "Paste the code USDC and the issuer above, then confirm.",
    ],
    recheck: "I added it, check again",
    shortcut: "Or create a test wallet: it already has the trustline.",
  },
  amount: {
    step: "Amount",
    youPay: "You pay",
    estimate: "You receive approx.",
    note: "Fictitious sandbox rate. The exact quote is shown in the next step.",
  },
  pay: (amount: string) => `Add funds · ${amount}`,
  opening: "Opening…",
  testCard: "Test card",
  testCardRest: "any future date and CVC.",
  startError: "Could not start the payment.",
  result: {
    received: (usdc: string) => `${usdc} USDC received`,
    viewTx: "See the Stellar transaction",
  },
  events: "Widget events",
  code: {
    eyebrow: "How this app integrates Lendara",
    title: "Two snippets: one on your server, one in the browser",
    server: "Server",
    browser: "Browser",
    install: "Install",
    keyHint: "Get an API key in the Lendara dashboard.",
    dashboard: "Open the dashboard",
  },
};

export type Messages = typeof en;

const es: Messages = {
  copy: "Copiar",
  copied: "Copiado",
  banner: "App de demostración en Stellar testnet. Los pagos los simula el sandbox de Lendara; no se mueve dinero real.",
  title: "Agrega dólares a tu wallet",
  subtitle: "Paga en tu moneda local y recibe USDC en Stellar en segundos.",
  wallet: {
    step: "Tu wallet de Stellar",
    create: "Crear una wallet de prueba",
    creating: "Creando tu wallet de prueba…",
    createHint: "Recomendado: lista para recibir USDC con un clic.",
    or: "o",
    pasteLabel: "Usa tu propia dirección de testnet",
    invalid: "Ingresa una dirección de Stellar válida (empieza con G, 56 caracteres).",
    createError: "No se pudo crear la wallet de prueba. Intenta de nuevo en unos segundos.",
    balance: "Saldo",
    explorer: "Ver en el explorador",
    change: "Cambiar",
    notFound: "Esta cuenta todavía no existe en testnet. Fondéala primero con Friendbot.",
    checking: "Revisando…",
  },
  trust: {
    title: "Tu cuenta todavía no puede recibir el USDC de prueba de Lendara",
    why: "En Stellar, un activo se identifica por su código y su emisor. Hay muchos tokens llamados “USDC” (por ejemplo, el USDC de testnet de Circle), pero cada emisor es un activo distinto. El sandbox de Lendara envía su propio USDC de prueba, así que tu cuenta necesita una trustline a este emisor exacto:",
    code: "Código del activo",
    issuer: "Emisor",
    verify: "Verificar el activo en Stellar Expert",
    howTo: "Cómo agregarla",
    steps: [
      "En tu wallet (Freighter, Lobstr…), cambia la red a Testnet.",
      "Abre “Manage assets” → “Add manually” (no busques por nombre: hay muchos USDC).",
      "Pega el código USDC y el emisor de arriba, y confirma.",
    ],
    recheck: "Ya la agregué, revisar de nuevo",
    shortcut: "O crea una wallet de prueba: ya trae la trustline.",
  },
  amount: {
    step: "Monto",
    youPay: "Pagas",
    estimate: "Recibes aprox.",
    note: "Tasa ficticia del sandbox. La cotización exacta se muestra en el siguiente paso.",
  },
  pay: (amount: string) => `Agregar fondos · ${amount}`,
  opening: "Abriendo…",
  testCard: "Tarjeta de prueba",
  testCardRest: "cualquier fecha futura y CVC.",
  startError: "No se pudo iniciar el pago.",
  result: {
    received: (usdc: string) => `Recibiste ${usdc} USDC`,
    viewTx: "Ver la transacción en Stellar",
  },
  events: "Eventos del widget",
  code: {
    eyebrow: "Cómo integra Lendara esta app",
    title: "Dos fragmentos: uno en tu servidor y otro en el navegador",
    server: "Servidor",
    browser: "Navegador",
    install: "Instalación",
    keyHint: "Consigue una API key en el dashboard de Lendara.",
    dashboard: "Abrir el dashboard",
  },
};

export const messages: Record<Lang, Messages> = { es, en };
export const locales: Record<Lang, string> = { es: "es-CR", en: "en-US" };
