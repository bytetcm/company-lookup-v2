# Taiwan Business Graph — API Index & Schema

## Data Sources (tested, confirmed working)

### Tier 1: No Auth Required
| Source | URL | Data | Latency |
|--------|-----|------|---------|
| **GCIS Company (App-1)** | `data.gcis.nat.gov.tw/.../5F64D864-...` | Basic: name, status, capital, address, rep, dates | ~200ms |
| **GCIS Business (App-1)** | `data.gcis.nat.gov.tw/.../F05D1060-...` | Same fields for 行號 (sole proprietorships) | ~200ms |
| **g0v Ronny** | `company.g0v.ronny.tw/api/show/{taxId}` | **BEST**: company + directors + business items + 財政部 tax data + industry codes | ~300ms |

### Tier 2: IP Whitelist Required (free, need to email opendata.gcis@gmail.com)
| Source | URL | Data |
|--------|-----|------|
| GCIS App-2 (28 fields) | `data.gcis.nat.gov.tw/.../236BF797-...` | Extended company details |
| GCIS App-3 | `data.gcis.nat.gov.tw/.../6BBA2268-...` | Branch offices, foreign companies |
| GCIS Directors | `data.gcis.nat.gov.tw/.../DB290D1A-...` | 董監事 by tax ID |
| GCIS Company Search | `data.gcis.nat.gov.tw/.../...` | Search by name + status |
| GCIS Capital Search | `data.gcis.nat.gov.tw/.../...` | Filter by capital range |
| GCIS Change Log | `data.gcis.nat.gov.tw/.../...` | Companies changed on date |

### Tier 3: Web Scraping (no API)
| Source | URL | Data |
|--------|-----|------|
| Findbiz (gov portal) | `findbiz.nat.gov.tw` | Unified search, most complete |
| comptw.com | `comptw.com` | 18 data sources aggregated, risk scoring |
| MOPS (公開資訊觀測站) | `mops.twse.com.tw` | Public company financials (listed only) |

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
