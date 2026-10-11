"use client";

import { useState } from "react";
import type { Country, StepProps } from "./draft";
import { Button, errorProps, Field, inputClass, StepActions } from "./ui";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COUNTRIES: readonly Country[] = ["CR", "AR", "CL"];

export function DetailsStep({ t, draft, onChange, onNext, onBack }: StepProps) {
  const [submitted, setSubmitted] = useState(false);
  const errors = {
    name: draft.name.trim().length < 2 ? t.details.nameError : null,
    email: EMAIL.test(draft.email.trim()) ? null : t.details.emailError,
  };
  const show = (error: string | null) => (submitted ? error : null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    if (errors.name || errors.email) return;
    if (!draft.holder) onChange({ holder: draft.name.trim() });
    onNext();
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-1 flex-col gap-4">
      <p className="text-sm text-gray">{t.details.intro}</p>
      <Field id="name" label={t.details.name} error={show(errors.name)}>
        <input
          id="name"
          autoComplete="name"
          autoFocus
          value={draft.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className={inputClass}
          {...errorProps("name", show(errors.name))}
        />
      </Field>
      <Field id="email" label={t.details.email} error={show(errors.email)}>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={draft.email}
          onChange={(e) => onChange({ email: e.target.value })}
          className={inputClass}
          {...errorProps("email", show(errors.email))}
        />
      </Field>
      <Field id="country" label={t.details.country}>
        <select
          id="country"
          value={draft.country}
          onChange={(e) => onChange({ country: e.target.value as Country })}
          className={inputClass}
        >
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {t.details.countries[c]}
            </option>
          ))}
        </select>
      </Field>
      <StepActions onBack={onBack} backLabel={t.back}>
        <Button type="submit">{t.continue}</Button>
      </StepActions>
    </form>
  );
}
