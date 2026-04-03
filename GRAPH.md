# Business Entity Graph — API Index & Schema (TW + Global)

## Data Sources (all tested 2026-04-04)

### 🇹🇼 Taiwan — Tier 1: No Auth, Working NOW
| Source | Endpoint | Data | Status |
|--------|----------|------|--------|
| **g0v Ronny** | `company.g0v.ronny.tw/api/show/{taxId}` | **RICHEST**: company + 董監事 + 營業項目 + 財政部稅籍 + 行業代碼 | ✅ ~300ms |
| **GCIS Company (App-1)** | `data.gcis.nat.gov.tw/.../5F64D864-...` | Basic: name, status, capital, address, rep, dates | ✅ ~200ms |
| **GCIS Business (App-1)** | `data.gcis.nat.gov.tw/.../F05D1060-...` | Same fields for 行號 (sole proprietorships) | ✅ ~200ms |

### 🇹🇼 Taiwan — Tier 2: IP Whitelist (free, email opendata.gcis@gmail.com)
| Source | Endpoint | Data | Status |
|--------|----------|------|--------|
| GCIS App-2 (28 fields) | `data.gcis.nat.gov.tw/.../236BF797-...` | Extended company details | ⚠️ Need IP whitelist |
| GCIS App-3 | `data.gcis.nat.gov.tw/.../6BBA2268-...` | Branch offices, foreign companies | ⚠️ Need IP whitelist |
| GCIS Directors | `data.gcis.nat.gov.tw/.../DB290D1A-...` | 董監事 by tax ID | ⚠️ Need IP whitelist |
| GCIS Company Search | By name + status code | Name search | ⚠️ Need IP whitelist |
| GCIS Capital Search | By capital range code (A-G) | Filter by capital | ⚠️ Need IP whitelist |
| **GCIS Change Log** | `Change_Of_Approval_Data={YYYMMDD}` | **EVENT STREAM**: companies changed on date | ⚠️ Need IP whitelist |

### 🇹🇼 Taiwan — Tier 3: Competitors / Partners (same concept, different source)
| Source | URL | Data | Type | Status |
|--------|-----|------|------|--------|
| **comptw.com** | `comptw.com/{taxId}` | 18 gov sources aggregated, risk score, 關係圖譜 | 🟥 Competitor (web scrape) | ✅ Web only |
| **twincn.com** | `twincn.com/item.aspx?no={taxId}` | 7M entities, directors, history | 🟥 Competitor (web scrape) | ✅ Web only |
| **twinc.com.tw** | `twinc.com.tw` | Similar to twincn, separate operator | 🟥 Competitor (web scrape) | ✅ Web only |
| **opendata.vip** | `opendata.vip/tool/company` | API integration layer over GCIS | 🟧 Partner concept | ✅ |
| **data.zhupiter.com** | `poi.zhupiter.com/taxid-{taxId}.html` | Open data browser | 🟧 Adjacent | ✅ Web only |
| **findcompany.com.tw** | `findcompany.com.tw/{company_name}` | Name-based search | 🟥 Competitor (web scrape) | ✅ Web only |
| **TEJ (KYC platform)** | `kyc.tej.com.tw/web_p/data_rest.php` | Commercial-grade REST API | 🟥 Premium competitor | ⚠️ Paid API key |
| **Findbiz** | `findbiz.nat.gov.tw` | Gov unified portal, most complete UI | 🟩 Gov source | ✅ Web only |
| **MOPS** | `mops.twse.com.tw` | Public company financials (上市櫃 only) | 🟩 Gov source | ✅ Web only |

### 🌍 Global — Tier 1: No Auth, Working NOW
| Source | Endpoint | Data | Status |
|--------|----------|------|--------|
| **GLEIF LEI** | `api.gleif.org/api/v1/lei-records` | Legal Entity Identifiers, 3M+ entities worldwide | ✅ Free, no key |
| **OpenCorporates** | `api.opencorporates.com/v0.4/companies/search` | 200M+ companies, 140 jurisdictions | ⚠️ Free tier limited, paid API key for full |

### 🌍 Global — Aerospace / Defense Supply Chain
| Source | Endpoint | Data | Status |
|--------|----------|------|--------|
| **SAM.gov Entity API** | `api.sam.gov/entity-information/v3/entities` | US gov supplier registry, CAGE codes, NAICS | ⚠️ Free API key required (register at sam.gov) |
| **DLA CAGE** | `cage.dla.mil` | Commercial & Government Entity codes (defense) | ⚠️ Web search only, no public API |
| **EASA** | `easa.europa.eu` | EU aviation safety, approved orgs | 🟨 No public API |
| **FAA** | `api.faa.gov` | US aviation registrations, airworthiness | ⚠️ Some APIs public |

### 📄 Formal Application Needed (正規申請流)
| Source | How to Apply | Priority |
|--------|-------------|----------|
| **GCIS IP Whitelist** | Email opendata.gcis@gmail.com with [告知書](https://data.gcis.nat.gov.tw/resources/doc/apply.doc), include server IP | HIGH — unlocks directors API + change log event stream |
| **SAM.gov API Key** | Register at sam.gov, request API key | MEDIUM — unlocks US defense supplier graph |
| **OpenCorporates API** | Apply at opencorporates.com/api_accounts | LOW — paid, but cross-jurisdiction graph |

## The Graph

```
                    ┌─────────────┐
                    │   Person    │
                    │  (董監事)    │
                    └──────┬──────┘
                           │ SERVES_AS (職稱, 出資額)
                           ▼
┌──────────┐  OPERATES_IN  ┌─────────────┐  REGISTERED_AT  ┌──────────┐
│ Industry │◄──────────────│   Company   │────────────────►│ Address  │
│ (營業項目) │               │  (公司/行號)  │                 │  (地址)   │
└──────────┘               └──────┬──────┘                 └──────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼              ▼
             ┌───────────┐ ┌──────────┐  ┌────────────┐
             │ Tax Data  │ │ Status   │  │  Capital   │
             │ (財政部)   │ │ (登記狀態) │  │  (資本額)   │
             └───────────┘ └──────────┘  └────────────┘
```

### Nodes
- **Company** — taxId (PK), name, type (公司|行號), setupDate
- **Person** — name (+ potentially national ID hash for dedup)
- **Industry** — code (e.g. CP01010), name (e.g. 手工具製造業)
- **Address** — full address, could decompose to city/district

### Edges
- **SERVES_AS** — Person → Company (role: 董事長|董事|監察人|經理人, shares: amount)
- **OPERATES_IN** — Company → Industry (many-to-many)
- **REGISTERED_AT** — Company → Address

### The Power Query (what comptw.com charges for)
```
Given Person X:
  → Find all companies where X serves as director/supervisor
  → For each company, find all OTHER directors/supervisors
  → For each of THOSE people, find THEIR other companies
  → Result: X's entire business network, 2 hops deep
```

This is the relationship graph Wayne sees naturally. We're making it queryable.

## Business Atom

The deepest atom: **People connect companies. Companies don't connect to each other directly.**

Every "business relationship" between two companies is actually a person who sits on both boards. The SERVES_AS edge is the only real edge. Everything else is derived.

comptw.com figured this out — they charge for the relationship graph. g0v Ronny built it open source. We can build it better because we have the event-driven insight: **monitor the GCIS change log API, and every time a director changes, update the graph in real-time.**

The change log API: `data.gcis.nat.gov.tw/.../Change_Of_Approval_Data={YYYMMDD}`

That's the event stream. The graph is the materialized view.
