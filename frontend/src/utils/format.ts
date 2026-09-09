import dayjs from "dayjs";

export function fmtDate(iso?: string): string {
  if (!iso) return "-";
  return dayjs(iso).format("DD MMM YYYY");
}

export function fmtDateTime(iso?: string): string {
  if (!iso) return "-";
  return dayjs(iso).format("DD MMM YYYY · HH:mm");
}

export function num(v: number | undefined | null, digits = 1): string {
  if (v === undefined || v === null || isNaN(v)) return "-";
  return Number(v).toFixed(digits);
}
