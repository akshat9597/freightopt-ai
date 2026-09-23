export const number = (v: number, digits = 0) =>
  v.toLocaleString("en-US", { maximumFractionDigits: digits });
export const shortDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
export const fullDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
export const addDays = (value: string, days: number) => {
  const d = new Date(`${value}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};
export const terms: Record<string, string> = {
  DWT: "Deadweight tonnage — total carrying capacity of the vessel.",
  LOA: "Length Overall — total length of the vessel.",
  Draft: "Vertical distance between waterline and vessel keel.",
  Beam: "Maximum vessel width.",
  "Freight Rate": "Transportation price, commonly expressed per tonne.",
  "Port Congestion": "Delay caused by vessel queues and berth availability.",
  "Spot Charter":
    "Vessel chartered for an individual voyage or immediate requirement.",
  "Time Charter": "Vessel hired for an agreed period.",
};
