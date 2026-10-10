const en = {
  locale: "en-US",
  title: "Deposit USDC",
  sandbox: "Sandbox · Stellar testnet. No real money moves.",
  steps: ["Amount", "Payment", "Status"],
  loading: "Loading…",
  amount: {
    currency: "You pay in",
    amount: "Amount",
    rate: "Rate",
    fee: "Fee",
    receive: "You receive",
    hint: "Enter an amount to see the quote.",
    invalid: "Use a number with up to 2 decimals.",
    scenarios:
      "Sandbox scenarios by decimals: .13 is rejected (KYC), .99 expires, .50 is delayed 30 s. Any other amount is approved.",
    submit: "Continue",
  },
  payment: {
    title: "Transfer instructions",
    reference: "Reference",
    amount: "Amount to transfer",
    note: "Simulated bank transfer: no real payment is made.",
    submit: "Simulate payment",
  },
  status: {
    processing: "Processing",
    completed: "Completed",
    failed: "Failed",
    expired: "Expired",
    trustline: "Waiting for trustline",
    trustlineHelp: "Add a USDC trustline in your wallet to receive the deposit.",
    amount: "Amount",
    destination: "Destination",
    transaction: "Stellar transaction",
    network: "Network",
    explorer: "View on explorer",
    close: "You can close this window.",
  },
  errors: {
    invalidLink: "This link is invalid, expired or was already used. Start the deposit again from your wallet.",
    sessionExpired: "Your session expired. Start the deposit again from your wallet.",
    generic: "Something went wrong. Try again.",
    retry: "Try again",
  },
};

export type Messages = typeof en;

const es: Messages = {
  locale: "es-419",
  title: "Depositar USDC",
  sandbox: "Sandbox · testnet de Stellar. No se mueve dinero real.",
  steps: ["Monto", "Pago", "Estado"],
  loading: "Cargando…",
  amount: {
    currency: "Pagas en",
    amount: "Monto",
    rate: "Tasa",
    fee: "Comisión",
    receive: "Recibes",
    hint: "Ingresa un monto para ver la cotización.",
    invalid: "Usa un número con hasta 2 decimales.",
    scenarios:
      "Escenarios del sandbox según los decimales: .13 se rechaza (KYC), .99 vence, .50 se demora 30 s. Cualquier otro monto se aprueba.",
    submit: "Continuar",
  },
  payment: {
    title: "Instrucciones de transferencia",
    reference: "Referencia",
    amount: "Monto a transferir",
    note: "Transferencia bancaria simulada: no se hace ningún pago real.",
    submit: "Simular pago",
  },
  status: {
    processing: "Procesando",
    completed: "Completada",
    failed: "Fallida",
    expired: "Vencida",
    trustline: "Esperando trustline",
    trustlineHelp: "Agrega una trustline de USDC en tu wallet para recibir el depósito.",
    amount: "Monto",
    destination: "Destino",
    transaction: "Transacción en Stellar",
    network: "Red",
    explorer: "Ver en el explorador",
    close: "Ya puedes cerrar esta ventana.",
  },
  errors: {
    invalidLink: "Este enlace no es válido, venció o ya se usó. Vuelve a iniciar el depósito desde tu wallet.",
    sessionExpired: "Tu sesión venció. Vuelve a iniciar el depósito desde tu wallet.",
    generic: "Algo salió mal. Inténtalo de nuevo.",
    retry: "Reintentar",
  },
};

/** Picks the messages for an RFC 4646 code. SEP-24 defaults to English. */
export function getMessages(lang: string | undefined): { lang: "en" | "es"; t: Messages } {
  return lang?.toLowerCase().startsWith("es") ? { lang: "es", t: es } : { lang: "en", t: en };
}
