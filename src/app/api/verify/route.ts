import { NextRequest, NextResponse } from "next/server";

/**
 * /api/verify — Multi-source verification with confidence scoring
 * 
 * Queries multiple independent sources in parallel,
 * cross-references fields, and returns a confidence level (0-1)
 * for each data point based on source agreement.
 * 
 * Sources:
 *   1. GCIS Company API (government primary)
 *   2. GCIS Business API (government, 行號)
 *   3. g0v Ronny (community, aggregates gov + 財政部)
 *   4. GLEIF LEI (global, financial entities)
 */

import { fetchCompany, fetchBusiness, isValidTaxId } from "@/lib/gcis";

// --- Source fetchers ---

const G0V_API = "https://company.g0v.ronny.tw/api/show";
const GLEIF_API = "https://api.gleif.org/api/v1/lei-records";

interface SourceResult {
  source: string;
  origin: string; // where the data ultimately comes from
  scope: "taiwan" | "global";
  available: boolean;
  latencyMs: number;
  data: Record<string, unknown> | null;
  error?: string;
}

interface VerifiedField {
  field: string;
  value: unknown;
  confidence: number; // 0-1
  sources: string[];  // which sources agree
  total: number;      // how many sources had this field
  disagreements?: { source: string; value: unknown }[];
}

async function fetchWithTiming(
  name: string,
  origin: string,
  scope: "taiwan" | "global",
  fetcher: () => Promise<Record<string, unknown> | null>
): Promise<SourceResult> {
  const start = Date.now();
  try {
    const data = await fetcher();
    return {
      source: name,
      origin,
      scope,
      available: data !== null,
      latencyMs: Date.now() - start,
      data,
    };
  } catch (err) {
    return {
      source: name,
      origin,
      scope,
      available: false,
      latencyMs: Date.now() - start,
      data: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}



async function fetchG0v(taxId: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${G0V_API}/${taxId}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json?.data || null;
}

async function fetchGLEIF(name: string): Promise<Record<string, unknown> | null> {
  if (!name) return null;
  const res = await fetch(
    `${GLEIF_API}?filter[entity.legalName]=${encodeURIComponent(name)}&page[size]=3`,
    { next: { revalidate: 86400 } }
  );
  if (!res.ok) return null;
  const json = await res.json();
  if (!json?.data?.length) return null;
  // Return best match
  const entity = json.data[0]?.attributes?.entity;
  if (!entity) return null;
  return {
    lei: json.data[0].attributes.lei,
    name: entity.legalName?.name,
    country: entity.legalAddress?.country,
    status: entity.status,
    category: entity.category,
    registeredAt: entity.legalAddress?.addressLines,
  };
}

// --- Confidence calculation ---

function normalizeValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  return String(v).replace(/\s+/g, " ").trim().toLowerCase();
}

function calculateConfidence(
  fieldName: string,
  extractions: { source: string; value: unknown }[]
): VerifiedField {
  const nonEmpty = extractions.filter((e) => normalizeValue(e.value) !== "");
  if (nonEmpty.length === 0) {
    return {
      field: fieldName,
      value: null,
      confidence: 0,
      sources: [],
      total: 0,
    };
  }

  // Group by normalized value
  const groups = new Map<string, { source: string; value: unknown }[]>();
  for (const e of nonEmpty) {
    const key = normalizeValue(e.value);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }

  // Find majority value
  let bestGroup: { source: string; value: unknown }[] = [];
  for (const group of groups.values()) {
    if (group.length > bestGroup.length) bestGroup = group;
  }

  const confidence = nonEmpty.length === 1
    ? 0.5  // single source = 50% confidence
    : bestGroup.length / nonEmpty.length; // agreement ratio

  const disagreements = nonEmpty
    .filter((e) => normalizeValue(e.value) !== normalizeValue(bestGroup[0].value))
    .map((e) => ({ source: e.source, value: e.value }));

  return {
    field: fieldName,
    value: bestGroup[0].value, // use original (non-normalized) value
    confidence: Math.round(confidence * 100) / 100,
    sources: bestGroup.map((e) => e.source),
    total: nonEmpty.length,
    ...(disagreements.length > 0 ? { disagreements } : {}),
  };
}

// --- Main handler ---

export async function GET(request: NextRequest) {
  const taxId = request.nextUrl.searchParams.get("taxId");

  if (!taxId || !isValidTaxId(taxId)) {
    return NextResponse.json({ error: "請提供 8 位數統一編號" }, { status: 400 });
  }

  // Query ALL sources in parallel
  const sources = await Promise.all([
    fetchWithTiming("gcis_company", "經濟部商業發展署", "taiwan", () => fetchCompany(taxId)),
    fetchWithTiming("gcis_business", "經濟部商業發展署", "taiwan", () => fetchBusiness(taxId)),
    fetchWithTiming("g0v_ronny", "g0v.tw (community aggregator)", "taiwan", () => fetchG0v(taxId)),
    // GLEIF needs company name — we'll chain it after first results
  ]);

  // Extract company name from first available source for GLEIF lookup
  const companyName =
    (sources[0].data?.Company_Name as string) ||
    (sources[2].data?.["公司名稱"] as string) ||
    null;

  // Now fetch GLEIF with the name
  const gleifResult = await fetchWithTiming(
    "gleif_lei", "GLEIF (Global LEI Foundation)", "global",
    () => fetchGLEIF(companyName || "")
  );
  const allSources = [...sources, gleifResult];

  // Check if ANY source returned data
  const anySources = allSources.some((s) => s.available);
  if (!anySources) {
    return NextResponse.json({ error: "查無此統一編號" }, { status: 404 });
  }

  // Extract and cross-reference fields
  const gcisC = allSources[0].data;
  const gcisB = allSources[1].data;
  const g0v = allSources[2].data;
  const gleif = gleifResult.data;

  const verified: VerifiedField[] = [
    calculateConfidence("name", [
      { source: "gcis_company", value: gcisC?.Company_Name },
      { source: "gcis_business", value: gcisB?.Business_Name },
      { source: "g0v_ronny", value: g0v?.["公司名稱"] },
      { source: "gleif_lei", value: gleif?.name },
    ]),
    calculateConfidence("status", [
      { source: "gcis_company", value: gcisC?.Company_Status_Desc },
      { source: "gcis_business", value: gcisB?.Business_Current_Status_Desc },
      { source: "g0v_ronny", value: g0v?.["登記現況"] },
    ]),
    calculateConfidence("representative", [
      { source: "gcis_company", value: gcisC?.Responsible_Name },
      { source: "g0v_ronny", value: g0v?.["代表人姓名"] },
    ]),
    calculateConfidence("capital", [
      { source: "gcis_company", value: gcisC?.Paid_In_Capital_Amount },
      { source: "g0v_ronny", value: g0v?.["實收資本額(元)"]?.toString().replace(/,/g, "") },
    ]),
    calculateConfidence("address", [
      { source: "gcis_company", value: gcisC?.Company_Location },
      { source: "gcis_business", value: gcisB?.Business_Address },
      { source: "g0v_ronny", value: g0v?.["公司所在地"] },
    ]),
  ];

  // Overall confidence = average of all field confidences (only fields with data)
  const fieldsWithData = verified.filter((v) => v.confidence > 0);
  const overallConfidence = fieldsWithData.length > 0
    ? Math.round(
        (fieldsWithData.reduce((sum, v) => sum + v.confidence, 0) / fieldsWithData.length) * 100
      ) / 100
    : 0;

  const activeSources = allSources.filter((s) => s.available).length;
  const totalSources = allSources.length;

  return NextResponse.json({
    taxId,
    confidence: overallConfidence,
    sourceCoverage: `${activeSources}/${totalSources}`,
    verified,
    sources: allSources.map((s) => ({
      name: s.source,
      origin: s.origin,
      scope: s.scope,
      available: s.available,
      latencyMs: s.latencyMs,
      ...(s.error ? { error: s.error } : {}),
    })),
  }, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
