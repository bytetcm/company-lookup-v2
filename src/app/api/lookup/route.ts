import { NextRequest, NextResponse } from "next/server";

const MOEA_URL =
  "https://data.gcis.nat.gov.tw/od/data/api/5F64D864-61CB-4D0D-8AD9-492047CC1EA6";

export async function GET(request: NextRequest) {
  const taxId = request.nextUrl.searchParams.get("taxId");

  if (!taxId || !/^\d{8}$/.test(taxId)) {
    return NextResponse.json(
      { error: "請提供 8 位數統一編號" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `${MOEA_URL}?$format=json&$filter=Business_Accounting_NO eq ${taxId}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: `上游查詢失敗 (${res.status})` },
        { status: 502 }
      );
    }

    const data = await res.json();

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: "查無此統一編號" },
        { status: 404 }
      );
    }

    return NextResponse.json(data[0], {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "查詢服務暫時無法使用" },
      { status: 500 }
    );
  }
}
