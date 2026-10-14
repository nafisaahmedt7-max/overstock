export type ExchangeRates = Record<string, number>;

export async function getUsdRates(): Promise<ExchangeRates> {
  const response = await fetch("https://open.er-api.com/v6/latest/USD", {
    next: { revalidate: 3600 },
  });
  if (!response.ok) throw new Error("Exchange-rate service is unavailable.");
  const result = (await response.json()) as {
    result?: string;
    rates?: Record<string, number>;
  };
  if (result.result !== "success" || !result.rates?.AUD) {
    throw new Error("Exchange-rate response did not include AUD.");
  }
  return result.rates;
}
