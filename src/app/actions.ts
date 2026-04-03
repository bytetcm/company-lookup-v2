"use server";

import { sanitizeTaxId, fetchBoth, formatCapital, formatROCDate } from "@/lib/gcis";

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

export async function lookup(rawTaxId: string): Promise<LookupResult> {
  // CRITICAL: validate input — server actions are callable by anyone
  const taxId = sanitizeTaxId(rawTaxId);
  if (!taxId) {
    return { error: "請輸入 8 位數統一編號" };
  }

  try {
    const { company, business } = await fetchBoth(taxId);
    const record = company || business;

    if (!record) {
      return { error: "查無此統一編號" };
    }

    const isCompany = !!company;

    return {
      data: {
        taxId: (record.Business_Accounting_NO as string) || taxId,
        name: (record.Company_Name as string) || (record.Business_Name as string) || "—",
        type: isCompany ? "公司" : "行號",
        status: (record.Company_Status_Desc as string) || (record.Business_Current_Status_Desc as string) || "—",
        capital: formatCapital(record.Paid_In_Capital_Amount || record.Capital_Stock_Amount),
        address: (record.Company_Location as string) || (record.Business_Address as string) || "—",
        representative: (record.Responsible_Name as string) || "—",
        setupDate: formatROCDate((record.Company_Setup_Date as string) || (record.Agency_Setup_Date as string)),
      },
    };
  } catch (err) {
    console.error("Server action lookup error:", err);
    return { error: "查詢服務暫時無法使用，請稍後再試" };
  }
}
