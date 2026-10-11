import type { LandingCopy } from "./types";

export const es: LandingCopy = {
  meta: {
    title: "Lendara · Rampa de moneda local a USDC sobre Stellar",
    description:
      "El riel de colones, pesos argentinos y pesos chilenos a USDC que tu app no tiene que construir desde cero. Sandbox en Stellar testnet.",
  },
  nav: { docs: "Docs", dashboard: "Dashboard", demo: "Demo" },
  hero: {
    eyebrow: "Lendara Anchor · Sandbox",
    title: "El riel de moneda local a USDC que tu app no tiene que construir desde cero",
    lead: "Tus usuarios pagan en colones, pesos argentinos o pesos chilenos y reciben USDC en su wallet de Stellar.",
    points: [
      "Cotización que no cambia entre que pides y confirmas.",
      "Estado real de cada transferencia: nunca un silencio preguntándote si llegó.",
    ],
    primary: "Probar el sandbox",
    secondary: "Documentación técnica",
    tertiary: "Ver la demo",
    footnote: "Testnet hoy. Costa Rica, Argentina y Chile desde el primer día.",
  },
  transfer: {
    label: "Transferencia",
    states: {
      pending: "Pendiente",
      processing: "Procesando",
      sending: "Enviando en Stellar",
      completed: "Completada",
      error: "Error",
    },
    paid: "Pagaste",
    network: "Red",
    destination: "Destino",
    hash: "Hash",
    explorer: "Ver en el explorador",
    caption: "Pago real en Stellar testnet, hecho desde la demo.",
    locale: "es-CR",
  },
  verifiable: {
    title: "Sabes dónde está tu plata, siempre",
    items: [
      { title: "Cotización congelada", body: "La tasa que ve tu usuario es la que se aplica al confirmar, no una promesa que cambia." },
      { title: "Estado en tiempo real", body: "Cada paso de la transferencia llega a tu app como evento, no como una rueda de carga genérica." },
      { title: "Confirmación verificable", body: "Al terminar recibes el hash de la transacción en Stellar: cualquiera puede comprobarla en el explorador." },
    ],
    statesTitle: "Los estados que ve tu app",
  },
  integrate: {
    title: "Qué vas a integrar",
    lead: "Tú pones la wallet o la app; Lendara pone el riel.",
    apps: {
      title: "Si tienes una app o dApp",
      body: "Un SDK para tu servidor y un widget para el navegador. Creas una sesión, abres el widget y recibes el resultado.",
    },
    wallets: {
      title: "Si tienes una wallet de Stellar",
      body: "Endpoints estándar de anchor: SEP-1, SEP-10 y depósitos SEP-24. Cualquier wallet compatible funciona sin código extra.",
    },
    cta: "Ver el inicio rápido",
  },
  how: {
    title: "Cómo funciona",
    steps: [
      "Tu servidor crea una sesión para la cuenta de Stellar del usuario.",
      "El usuario elige moneda y monto en el widget de Lendara y ve la cotización.",
      "Paga con su medio local. En el sandbox, con una tarjeta de prueba.",
      "Lendara envía USDC a su wallet y tu app recibe el estado final con el hash.",
    ],
  },
  status: {
    title: "Estado actual",
    doneLabel: "Funciona hoy en testnet",
    done: [
      "Depósitos SEP-24 de CRC, ARS y CLP a USDC.",
      "API para integradores, SDK y widget publicados en npm.",
      "Escenarios de prueba: aprobado, KYC rechazado, pago no recibido y demorado.",
      "Dashboard para crear proyectos y ver transacciones.",
    ],
    nextLabel: "En desarrollo",
    next: ["Retiros de USDC a moneda local.", "SEP-31 para pagos entre anchors.", "Webhooks para integradores."],
    note: "En el sandbox los pagos fiat están simulados y el USDC es un activo de prueba sin valor. Operar con dinero real requiere licencias y rieles bancarios que todavía no están conectados.",
  },
  final: {
    title: "Pruébalo en cinco minutos",
    body: "Crea un proyecto, copia tu API key y haz tu primer depósito en testnet con una tarjeta de prueba.",
    primary: "Crear un proyecto",
    secondary: "Leer el inicio rápido",
  },
  footer: { sandbox: "Sandbox en Stellar testnet. No se mueve dinero real.", source: "Código fuente" },
};
