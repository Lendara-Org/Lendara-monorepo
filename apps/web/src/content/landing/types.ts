export type LandingCopy = {
  meta: { title: string; description: string };
  nav: { docs: string; dashboard: string; demo: string };
  hero: {
    eyebrow: string;
    title: string;
    lead: string;
    points: string[];
    primary: string;
    secondary: string;
    tertiary: string;
    footnote: string;
  };
  transfer: {
    label: string;
    states: { pending: string; processing: string; sending: string; completed: string; error: string };
    paid: string;
    network: string;
    destination: string;
    hash: string;
    explorer: string;
    caption: string;
    locale: string;
  };
  verifiable: { title: string; items: { title: string; body: string }[]; statesTitle: string };
  integrate: {
    title: string;
    lead: string;
    apps: { title: string; body: string };
    wallets: { title: string; body: string };
    cta: string;
  };
  how: { title: string; steps: string[] };
  status: { title: string; done: string[]; next: string[]; doneLabel: string; nextLabel: string; note: string };
  final: { title: string; body: string; primary: string; secondary: string };
  footer: { sandbox: string; source: string };
};
