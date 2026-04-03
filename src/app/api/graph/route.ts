import { NextRequest, NextResponse } from "next/server";

// g0v Ronny API — richest single source, no auth needed
const G0V_API = "https://company.g0v.ronny.tw/api/show";

interface Director {
  name: string;
  role: string;
  shares: string;
  representative: string;
}

interface IndustryCode {
  code: string;
  name: string;
}

interface CompanyNode {
  taxId: string;
  name: string;
  type: "公司" | "行號";
  status: string;
  capital: number;
  address: string;
  representative: string;
  setupDate: { year: number; month: number; day: number } | null;
  directors: Director[];
  industries: IndustryCode[];
  taxIndustries: IndustryCode[];
}

interface GraphResponse {
  company: CompanyNode;
  edges: {
    directors: { person: string; role: string; shares: string }[];
    industries: { code: string; name: string }[];
  };
}

function parseG0vData(data: Record<string, unknown>, taxId: string): CompanyNode {
  const directors = (data["董監事名單"] as Array<Record<string, string>> || []).map((d) => ({
    name: d["姓名"] || "",
    role: d["職稱"] || "",
    shares: d["出資額"] || "0",
    representative: d["所代表法人"] || "",
  }));

  const industries = (data["所營事業資料"] as Array<[string, string]> || []).map(([code, name]) => ({
    code,
    name,
  }));

  const taxData = data["財政部"] as Record<string, unknown> | undefined;
  const taxIndustries = (taxData?.["行業"] as Array<[string, string]> || []).map(([code, name]) => ({
    code,
    name,
  }));

  const setupDate = data["核准設立日期"] as { year: number; month: number; day: number } | null;
  const capitalStr = (data["實收資本額(元)"] as string || "0").replace(/,/g, "");

  return {
    taxId,
    name: (data["公司名稱"] as string) || "",
    type: "公司",
    status: (data["登記現況"] as string) || "",
    capital: parseInt(capitalStr) || 0,
    address: (data["公司所在地"] as string) || "",
    representative: (data["代表人姓名"] as string) || "",
    setupDate,
    directors,
    industries,
    taxIndustries,
  };
}

export async function GET(request: NextRequest) {
  const taxId = request.nextUrl.searchParams.get("taxId");

  if (!taxId || !/^\d{8}$/.test(taxId)) {
    return NextResponse.json({ error: "請提供 8 位數統一編號" }, { status: 400 });
  }

  try {
    const res = await fetch(`${G0V_API}/${taxId}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: "查無此統一編號" }, { status: 404 });
    }

    const json = await res.json();
    const data = json.data;

    if (!data || !data["公司名稱"]) {
      return NextResponse.json({ error: "查無此統一編號" }, { status: 404 });
    }

    const company = parseG0vData(data, taxId);

    const response: GraphResponse = {
      company,
      edges: {
        directors: company.directors.map((d) => ({
          person: d.name,
          role: d.role,
          shares: d.shares,
        })),
        industries: company.industries,
      },
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "查詢服務暫時無法使用" }, { status: 500 });
  }
}
