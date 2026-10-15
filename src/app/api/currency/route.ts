export async function GET() {
  return Response.json({
    country: "US",
    currency: "USD",
    rate: 1,
    audRate: null,
  });
}
