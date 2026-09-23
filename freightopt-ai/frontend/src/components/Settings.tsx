import { createContext, useContext, useState, type ReactNode } from "react";
interface Settings {
  currency: "USD" | "INR";
  setCurrency: (value: "USD" | "INR") => void;
  presentation: boolean;
  setPresentation: (value: boolean) => void;
  exchange: number;
  setExchange: (value: number) => void;
  money: (
    value: number | null | undefined,
    compact?: boolean,
    digits?: number,
  ) => string;
}
const Context = createContext<Settings | null>(null);
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<"USD" | "INR">("USD");
  const [presentation, setPresentation] = useState(false);
  const [exchange, setExchange] = useState(83.5);
  const money = (
    value: number | null | undefined,
    compact = false,
    digits = 0,
  ) => {
    if (value == null) return "—";
    const amount = value * (currency === "INR" ? exchange : 1);
    if (compact && currency === "INR" && Math.abs(amount) >= 1e7)
      return `₹${(amount / 1e7).toFixed(2)} Cr`;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: compact ? 2 : digits,
      notation: compact ? "compact" : "standard",
    }).format(amount);
  };
  return (
    <Context.Provider
      value={{
        currency,
        setCurrency,
        presentation,
        setPresentation,
        exchange,
        setExchange,
        money,
      }}
    >
      {children}
    </Context.Provider>
  );
}
// Context consumer is shared by all charts and monetary values.
// eslint-disable-next-line react-refresh/only-export-components
export function useSettings() {
  const value = useContext(Context);
  if (!value) throw new Error("SettingsProvider required");
  return value;
}
