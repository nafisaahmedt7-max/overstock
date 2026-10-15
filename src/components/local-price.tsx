"use client";

import { useCurrency } from "./currency-provider";

export function LocalPrice({ amountUsd }: { amountUsd: number }) {
  const { quote, locale } = useCurrency();
  const currency = quote?.currency || "USD";
  const amount = amountUsd * (quote?.rate || 1);
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
  return <>{formatted}</>;
}
