import type { LandingCopy } from "./types";

export const en: LandingCopy = {
  meta: {
    title: "Lendara · Local currency to USDC on-ramp on Stellar",
    description:
      "The Costa Rican colón, Argentine peso and Chilean peso to USDC rail your app doesn't have to build from scratch. Sandbox on Stellar testnet.",
  },
  nav: { docs: "Docs", dashboard: "Dashboard", demo: "Demo" },
  hero: {
    eyebrow: "Lendara Anchor · Sandbox",
    title: "The local currency to USDC rail your app doesn't have to build from scratch",
    lead: "Your users pay in Costa Rican colones, Argentine pesos or Chilean pesos and receive USDC in their Stellar wallet.",
    points: [
      "A quote that doesn't change between asking and confirming.",
      "The real status of every transfer: never a silence wondering if it arrived.",
    ],
    primary: "Try the sandbox",
    secondary: "Technical docs",
    tertiary: "See the demo",
    footnote: "Testnet today. Costa Rica, Argentina and Chile from day one.",
  },
  transfer: {
    label: "Transfer",
    states: {
      pending: "Pending",
      processing: "Processing",
      sending: "Sending on Stellar",
      completed: "Completed",
      error: "Error",
    },
    paid: "You paid",
    network: "Network",
    destination: "Destination",
    hash: "Hash",
    explorer: "View on explorer",
    caption: "A real payment on Stellar testnet, made from the demo.",
    locale: "en-US",
  },
  verifiable: {
    title: "You always know where the money is",
    items: [
      { title: "Frozen quote", body: "The rate your user sees is the rate applied on confirmation, not a promise that changes." },
      { title: "Real-time status", body: "Every step of the transfer reaches your app as an event, not a generic spinner." },
      { title: "Verifiable confirmation", body: "At the end you get the Stellar transaction hash: anyone can check it on the explorer." },
    ],
    statesTitle: "The statuses your app sees",
  },
  integrate: {
    title: "What you integrate",
    lead: "You bring the wallet or the app; Lendara brings the rail.",
    apps: {
      title: "If you have an app or dApp",
      body: "An SDK for your server and a widget for the browser. Create a session, open the widget and get the result.",
    },
    wallets: {
      title: "If you have a Stellar wallet",
      body: "Standard anchor endpoints: SEP-1, SEP-10 and SEP-24 deposits. Any compatible wallet works with no extra code.",
    },
    cta: "Read the quickstart",
  },
  how: {
    title: "How it works",
    steps: [
      "Your server creates a session for the user's Stellar account.",
      "The user picks currency and amount in the Lendara widget and sees the quote.",
      "They pay with their local method. In the sandbox, with a test card.",
      "Lendara sends USDC to their wallet and your app gets the final status with the hash.",
    ],
  },
  status: {
    title: "Current status",
    doneLabel: "Working today on testnet",
    done: [
      "SEP-24 deposits from CRC, ARS and CLP to USDC.",
      "Integrator API, SDK and widget published on npm.",
      "Test scenarios: approved, KYC rejected, payment not received and delayed.",
      "Dashboard to create projects and see transactions.",
    ],
    nextLabel: "In development",
    next: ["USDC withdrawals to local currency.", "SEP-31 for anchor-to-anchor payments.", "Webhooks for integrators."],
    note: "In the sandbox, fiat payments are simulated and the USDC is a test asset with no value. Operating with real money requires licenses and banking rails that are not connected yet.",
  },
  final: {
    title: "Try it in five minutes",
    body: "Create a project, copy your API key and make your first testnet deposit with a test card.",
    primary: "Create a project",
    secondary: "Read the quickstart",
  },
  footer: { sandbox: "Sandbox on Stellar testnet. No real money moves.", source: "Source code" },
};
