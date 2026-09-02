export const CURRENCIES = [
  { value: "usd", label: "US Dollar (USD)", symbol: "$" },
  { value: "aud", label: "Australian Dollar (AUD)", symbol: "A$" },
  { value: "gbp", label: "British Pound (GBP)", symbol: "£" },
  { value: "eur", label: "Euro (EUR)", symbol: "€" },
  { value: "cad", label: "Canadian Dollar (CAD)", symbol: "C$" },
  { value: "bdt", label: "Bangladeshi Taka (BDT)", symbol: "৳" },
  { value: "inr", label: "Indian Rupee (INR)", symbol: "₹" },
  { value: "sgd", label: "Singapore Dollar (SGD)", symbol: "S$" },
  { value: "aed", label: "UAE Dirham (AED)", symbol: "AED " },
];

const SYMBOL_BY_CODE = Object.fromEntries(CURRENCIES.map((c) => [c.value, c.symbol]));

export function currencySymbol(code) {
  return SYMBOL_BY_CODE[code] || "$";
}

export function formatMoney(amount, code) {
  return `${currencySymbol(code)}${Number(amount || 0).toFixed(2)}`;
}
