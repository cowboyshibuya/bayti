export const SUPPORTED_CURRENCIES = [
  "EUR",
  "USD",
  "GBP",
  "CAD",
  "AUD",
  "CHF",
  "MAD",
  "AED",
  "SAR",
  "JPY",
  "CNY",
  "INR",
  "NZD",
  "SEK",
  "NOK",
  "DKK",
  "PLN",
  "CZK",
  "HUF",
  "RON",
  "TRY",
  "BRL",
  "MXN",
  "ZAR",
  "EGP",
  "TND",
  "DZD",
  "KWD",
  "QAR",
  "BHD",
  "OMR",
  "KRW",
  "SGD",
  "HKD",
  "THB",
  "IDR",
  "PHP",
  "MYR",
  "ILS",
  "VND",
] as const;

export function normalizeCurrency(value: string) {
  const code = value.trim().toUpperCase();
  if (!SUPPORTED_CURRENCIES.some((currency) => currency === code)) {
    throw new Error("Choose a supported currency.");
  }
  return code;
}
