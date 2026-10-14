import { headers } from "next/headers";
import { getUsdRates } from "@/lib/exchange-rates";

export const dynamic = "force-dynamic";

function countryFromLocale(value: string | null) {
  const firstLocale = value?.split(",")[0]?.trim() || "";
  const region = firstLocale.match(/[-_]([A-Za-z]{2})$/)?.[1];
  return region?.toUpperCase() || "US";
}

export async function GET() {
  try {
    const requestHeaders = await headers();
    const country =
      requestHeaders.get("x-vercel-ip-country") ||
      countryFromLocale(requestHeaders.get("accept-language"));
    const countryResponse = await fetch(
      "https://restcountries.com/v3.1/alpha/" +
        encodeURIComponent(country) +
        "?fields=currencies",
      { next: { revalidate: 86400 } },
    );
    const countryData = countryResponse.ok
      ? ((await countryResponse.json()) as Array<{ currencies?: Record<string, unknown> }>)
      : [];
    const currency = Object.keys(countryData[0]?.currencies ?? {})[0] || "USD";
    const rates = await getUsdRates();
    return Response.json({
      country,
      currency: rates[currency] ? currency : "USD",
      rate: rates[currency] || 1,
      audRate: rates.AUD,
    });
  } catch {
    return Response.json(
      { country: "US", currency: "USD", rate: 1, audRate: null },
      { status: 200 },
    );
  }
}
