import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DepositWidget } from "@/components/widget/deposit-widget";

export const metadata: Metadata = {
  title: "Deposit",
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// SEP-24 interactive flow: /widget/<id>?token=<one-time token>&lang=<code>
export default async function WidgetPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { token, lang } = await searchParams;
  if (!UUID.test(id)) notFound();

  return (
    <DepositWidget
      transactionId={id}
      token={typeof token === "string" ? token : null}
      lang={typeof lang === "string" ? lang : undefined}
    />
  );
}
