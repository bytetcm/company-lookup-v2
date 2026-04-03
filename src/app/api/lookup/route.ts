import { NextRequest, NextResponse } from "next/server";
import { isValidTaxId, fetchBoth } from "@/lib/gcis";

export async function GET(request: NextRequest) {
  const taxId = request.nextUrl.searchParams.get("taxId");

  if (!taxId || !isValidTaxId(taxId)) {
    return NextResponse.json(
      { error: "請提供 8 位數統一編號" },
      { status: 400 }
    );
  }

  try {
    const { company, business } = await fetchBoth(taxId);
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
  } catch (err) {
    console.error("Lookup route error:", err);
    return NextResponse.json(
      { error: "查詢服務暫時無法使用" },
      { status: 500 }
    );
  }
}
