"use client";

import { useEffect } from "react";
import { APP_NAME, messages, type Lang } from "@/lib/i18n";
import { setLang, useLang } from "@/lib/lang";
import { CodePanel } from "./code-panel";
import { Store } from "./store";

type Props = { horizonUrl: string; usdcIssuer: string; dashboardUrl: string };

export function DemoApp({ horizonUrl, usdcIssuer, dashboardUrl }: Props) {
  const lang = useLang();
  const t = messages[lang];

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <div className="min-h-dvh bg-paper">
      <div className="bg-wine px-4 py-2 text-center text-xs text-paper">{t.banner}</div>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-xl font-semibold tracking-tight text-ink">{APP_NAME}</span>
          </div>
          <div role="group" aria-label="Language" className="flex rounded-md border border-line p-0.5 text-xs">
            {(["es", "en"] as Lang[]).map((l) => (
              <button
                key={l}
                type="button"
                aria-pressed={lang === l}
                onClick={() => setLang(l)}
                className={`rounded px-2.5 py-1 font-mono uppercase transition ${
                  lang === l ? "bg-ink text-paper" : "text-gray hover:text-ink"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl items-start gap-8 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:py-14">
        <Store t={t} lang={lang} horizonUrl={horizonUrl} usdcIssuer={usdcIssuer} />
        <CodePanel t={t} dashboardUrl={dashboardUrl} />
      </main>
    </div>
  );
}
