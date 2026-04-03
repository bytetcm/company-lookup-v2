/**
 * API Integration Tests — TDD atoms
 * 
 * These are falsifiable claims about behavior.
 * Each test has been seen to FAIL before passing.
 * 
 * Run: npx jest (or vitest)
 */

const BASE = process.env.TEST_URL || "http://localhost:3333";

describe("/api/lookup", () => {
  // CLAIM 1: Valid 公司 tax ID → returns company data
  test("valid company taxId returns company data", async () => {
    const res = await fetch(`${BASE}/api/lookup?taxId=13186900`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.Company_Name).toBe("京茂機電科技股份有限公司");
    expect(data._type).toBe("公司");
  });

  // CLAIM 2: Valid 公司 (TSMC) → returns correct representative
  test("TSMC returns 魏哲家 as representative", async () => {
    const res = await fetch(`${BASE}/api/lookup?taxId=22099131`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.Company_Name).toBe("台灣積體電路製造股份有限公司");
    expect(data.Responsible_Name).toBe("魏哲家");
  });

  // CLAIM 3: Non-existent tax ID → 404
  test("non-existent taxId returns 404", async () => {
    const res = await fetch(`${BASE}/api/lookup?taxId=00000000`);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  // CLAIM 4: Invalid input → 400
  test("invalid taxId returns 400", async () => {
    const res = await fetch(`${BASE}/api/lookup?taxId=abc`);
    expect(res.status).toBe(400);
  });

  // CLAIM 5: Missing param → 400
  test("missing taxId returns 400", async () => {
    const res = await fetch(`${BASE}/api/lookup`);
    expect(res.status).toBe(400);
  });
});

describe("/api/graph", () => {
  // CLAIM 6: Graph returns directors
  test("ByteTCM graph includes directors", async () => {
    const res = await fetch(`${BASE}/api/graph?taxId=13186900`);
    expect(res.status).toBe(200);
    const data = await res.json();
    
    expect(data.company.name).toBe("京茂機電科技股份有限公司");
    expect(data.company.directors.length).toBeGreaterThan(0);
    
    const chairperson = data.company.directors.find(
      (d: { role: string }) => d.role === "董事長"
    );
    expect(chairperson).toBeDefined();
    expect(chairperson.name).toBe("李瑛芳");
  });

  // CLAIM 7: Graph returns industry codes
  test("ByteTCM graph includes industry codes", async () => {
    const res = await fetch(`${BASE}/api/graph?taxId=13186900`);
    const data = await res.json();

    expect(data.company.industries.length).toBeGreaterThan(0);
    
    // Must include 模具製造業
    const hasMold = data.company.industries.some(
      (i: { code: string }) => i.code === "CQ01010"
    );
    expect(hasMold).toBe(true);
  });

  // CLAIM 8: Graph returns tax bureau industries (the real atom)
  test("ByteTCM tax industries include aerospace", async () => {
    const res = await fetch(`${BASE}/api/graph?taxId=13186900`);
    const data = await res.json();

    expect(data.company.taxIndustries.length).toBeGreaterThan(0);
    
    // 319014 = 航空器及其零件製造 — this is the aerospace play
    const hasAerospace = data.company.taxIndustries.some(
      (i: { code: string }) => i.code === "319014"
    );
    expect(hasAerospace).toBe(true);
  });

  // CLAIM 9: Non-existent → 404
  test("non-existent taxId returns 404", async () => {
    const res = await fetch(`${BASE}/api/graph?taxId=00000000`);
    expect(res.status).toBe(404);
  });

  // CLAIM 10: Invalid → 400
  test("invalid taxId returns 400", async () => {
    const res = await fetch(`${BASE}/api/graph?taxId=nope`);
    expect(res.status).toBe(400);
  });
});

describe("/api/graph — GLEIF integration", () => {
  // CLAIM 11: GLEIF LEI API is accessible (global bridge)
  test("GLEIF API returns data for TSMC-related entities", async () => {
    const res = await fetch(
      "https://api.gleif.org/api/v1/lei-records?filter%5Bentity.legalName%5D=Taiwan%20Semiconductor&page%5Bsize%5D=1"
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.length).toBeGreaterThan(0);
  });
});
