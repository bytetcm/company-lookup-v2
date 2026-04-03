"use server";

interface LookupResult {
  data?: {
    taxId: string;
    name: string;
    status: string;
    capital: string;
    address: string;
    representative: string;
    setupDate: string;
  };
  error?: string;
}

// 經濟部商工行政資料開放平臺
const MOEA_URL =
  "https://data.gcis.nat.gov.tw/od/data/api/5F64D864-61CB-4D0D-8AD9-492047CC1EA6";

export async function lookup(taxId: string): Promise<LookupResult> {
  try {
    const res = await fetch(
      `${MOEA_URL}?$format=json&$filter=Business_Accounting_NO eq ${taxId}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 }, // cache 1 hour
      }
    );

    if (!res.ok) {
      return { error: `查詢失敗 (${res.status})` };
    }

    const data = await res.json();

    if (!data || data.length === 0) {
      return { error: "查無此統一編號" };
    }

    const company = data[0];

    // Format ROC date (YYYMMDD) to readable
    const rocDate = company.Company_Setup_Date || "";
    const setupDate = rocDate
      ? `民國 ${rocDate.slice(0, -4)} 年 ${parseInt(rocDate.slice(-4, -2))} 月 ${parseInt(rocDate.slice(-2))} 日`
      : "";

    // Format capital
    const capitalNum = parseInt(company.Paid_In_Capital_Amount || "0");
    const capital = capitalNum > 0
      ? `NT$ ${capitalNum.toLocaleString()}`
      : "—";

    return {
      data: {
        taxId: company.Business_Accounting_NO || taxId,
        name: company.Company_Name || "—",
        status: company.Company_Status_Desc || "—",
        capital,
        address: company.Company_Location || "—",
        representative: company.Responsible_Name || "—",
        setupDate,
      },
    };
  } catch (err) {
    console.error("Lookup error:", err);
    return { error: "查詢服務暫時無法使用，請稍後再試" };
  }
}
