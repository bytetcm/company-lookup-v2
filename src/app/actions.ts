"use server";

interface LookupResult {
  data?: {
    taxId: string;
    name: string;
    type: string;
    status: string;
    capital: string;
    address: string;
    representative: string;
    setupDate: string;
  };
  error?: string;
}

// 經濟部商工行政資料開放平臺
const COMPANY_API =
  "https://data.gcis.nat.gov.tw/od/data/api/5F64D864-61CB-4D0D-8AD9-492047CC1EA6";
const BUSINESS_API =
  "https://data.gcis.nat.gov.tw/od/data/api/F05D1060-7D57-4763-BDCE-0DAF5975AFE0";

async function fetchGCIS(url: string, taxId: string) {
  const res = await fetch(
    `${url}?$format=json&$filter=Business_Accounting_NO eq ${taxId}`,
    {
      headers: { Accept: "application/json" },
      next: { revalidate: 3600 },
    }
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

function formatROCDate(rocDate: string): string {
  if (!rocDate || rocDate.length < 5) return "";
  const day = parseInt(rocDate.slice(-2));
  const month = parseInt(rocDate.slice(-4, -2));
  const year = rocDate.slice(0, -4);
  return `民國 ${year} 年 ${month} 月 ${day} 日`;
}

function formatCapital(amount: string | number): string {
  const num = typeof amount === "number" ? amount : parseInt(amount || "0");
  return num > 0 ? `NT$ ${num.toLocaleString()}` : "—";
}

export async function lookup(taxId: string): Promise<LookupResult> {
  try {
    // Query both company (公司) and business (行號) APIs in parallel
    const [company, business] = await Promise.all([
      fetchGCIS(COMPANY_API, taxId),
      fetchGCIS(BUSINESS_API, taxId),
    ]);

    const record = company || business;
    if (!record) {
      return { error: "查無此統一編號" };
    }

    const isCompany = !!company;

    return {
      data: {
        taxId: record.Business_Accounting_NO || taxId,
        name: record.Company_Name || record.Business_Name || "—",
        type: isCompany ? "公司" : "行號",
        status: record.Company_Status_Desc || record.Business_Current_Status_Desc || "—",
        capital: formatCapital(record.Paid_In_Capital_Amount || record.Capital_Stock_Amount || 0),
        address: record.Company_Location || record.Business_Address || "—",
        representative: record.Responsible_Name || "—",
        setupDate: formatROCDate(record.Company_Setup_Date || record.Agency_Setup_Date || ""),
      },
    };
  } catch (err) {
    console.error("Lookup error:", err);
    return { error: "查詢服務暫時無法使用，請稍後再試" };
  }
}
