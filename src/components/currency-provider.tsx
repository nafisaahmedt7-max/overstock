"use client";

import { createContext, useContext, useEffect, useState } from "react";

type CurrencyQuote = {
  country: string;
  currency: string;
  rate: number;
  audRate: number | null;
};
const CurrencyContext = createContext<{
  quote: CurrencyQuote | null;
  locale: string;
}>({ quote: null, locale: "en-US" });

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [quote, setQuote] = useState<CurrencyQuote | null>(null);
  const [locale, setLocale] = useState("en-US");

  useEffect(() => {
    setLocale(navigator.language || "en-US");
    fetch("/api/currency")
      .then((response) => response.json())
      .then((value: CurrencyQuote) => setQuote(value))
      .catch(() =>
        setQuote({ country: "US", currency: "USD", rate: 1, audRate: null }),
      );
  }, []);

  return (
    <CurrencyContext.Provider value={{ quote, locale }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
