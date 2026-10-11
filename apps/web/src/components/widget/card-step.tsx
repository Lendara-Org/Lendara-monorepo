"use client";

import { useState } from "react";
import { cardNumberError, cvcValid, digitsOnly, expiryValid, formatCardNumber, formatExpiry, TEST_CARDS } from "@/lib/card";
import type { StepProps } from "./draft";
import { Button, errorProps, Field, inputClass, LockIcon, StepActions, VisaMark } from "./ui";

export function CardStep({ t, draft, onChange, onNext, onBack }: StepProps) {
  const [submitted, setSubmitted] = useState(false);
  const numberError = cardNumberError(draft.cardNumber);
  const errors = {
    number: numberError && t.card.errors[numberError],
    expiry: expiryValid(draft.expiry) ? null : t.card.errors.expiry,
    cvc: cvcValid(draft.cvc) ? null : t.card.errors.cvc,
    holder: draft.holder.trim().length < 2 ? t.card.errors.holder : null,
  };
  const show = (error: string | null) => (submitted ? error : null);
  // A complete real-looking card is flagged right away, not only on submit.
  const numberShown = submitted || numberError === "notTestCard" ? errors.number : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    onNext();
  }

  return (
    // autoComplete="off": the browser must not offer to fill in a real card.
    <form onSubmit={submit} noValidate autoComplete="off" className="flex flex-1 flex-col gap-4">
      <section aria-labelledby="test-cards" className="rounded-lg border border-dashed border-line p-3">
        <h2 id="test-cards" className="text-sm font-medium">
          {t.card.testCards}
        </h2>
        <p className="mt-0.5 text-xs text-gray">{t.card.testCardsHelp}</p>
        <ul className="mt-2 grid gap-1">
          {TEST_CARDS.map((card) => {
            const selected = digitsOnly(draft.cardNumber) === card.number;
            return (
              <li key={card.number}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange({ cardNumber: formatCardNumber(card.number) })}
                  className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left transition hover:bg-paper aria-pressed:bg-paper"
                >
                  <span className="font-mono text-xs">{formatCardNumber(card.number)}</span>
                  <span className="flex items-center gap-2 text-xs text-gray">
                    {t.card.scenarios[card.scenario]}
                    <span aria-hidden className={selected ? "text-ink" : "invisible"}>
                      ✓
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <Field id="card-number" label={t.card.number} error={numberShown}>
        <div className="relative">
          <input
            id="card-number"
            inputMode="numeric"
            autoComplete="off"
            placeholder="4242 4242 4242 4242"
            value={draft.cardNumber}
            onChange={(e) => onChange({ cardNumber: formatCardNumber(e.target.value) })}
            className={`${inputClass} pr-16 font-mono`}
            {...errorProps("card-number", numberShown)}
          />
          <span className="absolute inset-y-0 right-3 flex items-center">
            <VisaMark dim={!digitsOnly(draft.cardNumber).startsWith("4")} />
          </span>
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field id="expiry" label={t.card.expiry} error={show(errors.expiry)}>
          <input
            id="expiry"
            inputMode="numeric"
            autoComplete="off"
            placeholder="12/29"
            value={draft.expiry}
            onChange={(e) => onChange({ expiry: formatExpiry(e.target.value) })}
            className={`${inputClass} font-mono`}
            {...errorProps("expiry", show(errors.expiry))}
          />
        </Field>
        <Field id="cvc" label={t.card.cvc} error={show(errors.cvc)}>
          <input
            id="cvc"
            inputMode="numeric"
            autoComplete="off"
            placeholder="123"
            maxLength={3}
            value={draft.cvc}
            onChange={(e) => onChange({ cvc: digitsOnly(e.target.value).slice(0, 3) })}
            className={`${inputClass} font-mono`}
            {...errorProps("cvc", show(errors.cvc))}
          />
        </Field>
      </div>

      <Field id="holder" label={t.card.holder} error={show(errors.holder)}>
        <input
          id="holder"
          autoComplete="off"
          value={draft.holder}
          onChange={(e) => onChange({ holder: e.target.value })}
          className={inputClass}
          {...errorProps("holder", show(errors.holder))}
        />
      </Field>

      <p className="flex items-start gap-2 text-xs text-gray">
        <LockIcon className="mt-px size-3.5 shrink-0" />
        {t.card.note}
      </p>

      <StepActions onBack={onBack} backLabel={t.back}>
        <Button type="submit">{t.continue}</Button>
      </StepActions>
    </form>
  );
}
