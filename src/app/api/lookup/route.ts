import { NextRequest, NextResponse } from "next/server";

const COMPANY_API =
  "https://data.gcis.nat.gov.tw/od/data/api/5F64D864-61CB-4D0D-8AD9-492047CC1EA6";
const BUSINESS_API =
  "https://data.gcis.nat.gov.tw/od/data/api/F05D1060-7D57-4763-BDCE-0DAF5975AFE0";

async function fetchGCIS(url: string, taxId: string) {
  const res = await fetch(
    `${url}?$format=json&$filter=Business_Accounting_NO eq ${taxId}`,
    { headers: { Accept: "application/json" }, next: { revalidate: 3600 } }
  );
  if (!res.ok) return null;
  const text = await res.text();
  if (!text || text.length === 0) return null;
  try {
    const data = JSON.parse(text);
    return data?.length > 0 ? data[0] : null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const taxId = request.nextUrl.searchParams.get("taxId");

  if (!taxId || !/^\d{8}$/.test(taxId)) {
    return NextResponse.json(
      { error: "請提供 8 位數統一編號" },
      { status: 400 }
    );
  }

  try {
    const [company, business] = await Promise.all([
      fetchGCIS(COMPANY_API, taxId),
      fetchGCIS(BUSINESS_API, taxId),
    ]);

    const record = company || business;
    if (!record) {
      return NextResponse.json(
        { error: "查無此統一編號" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { ...record, _type: company ? "公司" : "行號" },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch {
    return NextResponse.json(
      { error: "查詢服務暫時無法使用" },
      { status: 500 }
    );
  }
}
