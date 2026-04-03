/**
 * GCIS API client — single source of truth for government data fetching.
 * Used by /api/lookup, /api/verify, and server actions.
 */

const GCIS_COMPANY =
  "https://data.gcis.nat.gov.tw/od/data/api/5F64D864-61CB-4D0D-8AD9-492047CC1EA6";
const GCIS_BUSINESS =
  "https://data.gcis.nat.gov.tw/od/data/api/F05D1060-7D57-4763-BDCE-0DAF5975AFE0";

export function isValidTaxId(input: string): boolean {
  return /^\d{8}$/.test(input);
}

export function sanitizeTaxId(input: string): string | null {
  const cleaned = input.replace(/\D/g, "");
  return isValidTaxId(cleaned) ? cleaned : null;
}

async function fetchGCISEndpoint(
  url: string,
  taxId: string
): Promise<Record<string, unknown> | null> {
  const filter = encodeURIComponent(`Business_Accounting_NO eq ${taxId}`);
  const res = await fetch(`${url}?$format=json&$filter=${filter}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  const text = await res.text();
  if (!text || text.length === 0) return null;
  try {
    const data = JSON.parse(text);
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}

export async function fetchCompany(
  taxId: string
): Promise<Record<string, unknown> | null> {
  return fetchGCISEndpoint(GCIS_COMPANY, taxId);
}

export async function fetchBusiness(
  taxId: string
): Promise<Record<string, unknown> | null> {
  return fetchGCISEndpoint(GCIS_BUSINESS, taxId);
}

export async function fetchBoth(taxId: string): Promise<{
  company: Record<string, unknown> | null;
  business: Record<string, unknown> | null;
}> {
  const [company, business] = await Promise.all([
    fetchCompany(taxId),
    fetchBusiness(taxId),
  ]);
  return { company, business };
}

export function formatCapital(amount: unknown): string {
  if (amount === null || amount === undefined || amount === "") return "—";
  const num = typeof amount === "number" ? amount : Number(String(amount).replace(/,/g, ""));
  if (isNaN(num) || num <= 0) return "—";
  return `NT$ ${num.toLocaleString()}`;
}

export function formatROCDate(rocDate: string | null | undefined): string {
  if (!rocDate) return "";
  const match = rocDate.match(/^(\d{2,3})(\d{2})(\d{2})$/);
  if (!match) return "";
  const [, year, monthStr, dayStr] = match;
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  return `民國 ${year} 年 ${month} 月 ${day} 日`;
}
