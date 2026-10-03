import axios from "axios";
import type { Decision, Forecast, Simulation, Voyage } from "../types";
export const api = axios.create({
  // Production API is deployed alongside this site; old Render env values are ignored.
  baseURL: import.meta.env.PROD ? "/api" : import.meta.env.VITE_API_URL || "/api",
  timeout: 15000,
});
export const optimizeVoyage = async (voyage: Voyage) =>
  (await api.post<Decision>("/optimize", voyage)).data;
export const simulateVoyage = async (
  voyage: Simulation,
  signal?: AbortSignal,
) => (await api.post<Decision>("/simulate", voyage, { signal })).data;
export const forecastVoyage = async (voyage: Voyage) =>
  (await api.post<Forecast>("/forecast", voyage)).data;
export function errorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (Array.isArray(detail))
      return detail
        .map(
          (d: { msg: string; loc: string[] }) =>
            `${d.loc.slice(1).join(" ")}: ${d.msg.replace("Value error, ", "")}`,
        )
        .join(". ");
    if (typeof detail === "string") return detail;
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT")
      return "The server did not respond within 15 seconds. It may be waking up or temporarily busy. Please retry shortly.";
    return error.response
      ? `Request failed (${error.response.status}). Please try again.`
      : "The forecasting server is temporarily unreachable. Check your connection and retry shortly.";
  }
  return error instanceof Error
    ? error.message
    : "An unexpected error occurred.";
}
