"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from "react";

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

const subscribeToLocale = () => () => {};
const getBrowserLocale = () => navigator.language || "en-US";
const getServerLocale = () => "en-US";

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [quote, setQuote] = useState<CurrencyQuote | null>(null);
  const locale = useSyncExternalStore(subscribeToLocale, getBrowserLocale, getServerLocale);

  useEffect(() => {
    let active = true;
    fetch("/api/currency")
      .then((response) => response.json())
      .then((value: CurrencyQuote) => {
        if (active) setQuote(value);
      })
      .catch(() => {
        if (active) setQuote({ country: "US", currency: "USD", rate: 1, audRate: null });
      });
    return () => {
      active = false;
    };
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
