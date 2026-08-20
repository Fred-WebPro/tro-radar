// Thin client for the CourtListener v4 RECAP search API.
// Works unauthenticated at low rate; set CL_API_TOKEN for higher limits
// (free token: https://www.courtlistener.com/help/api/rest/).

const BASE = "https://www.courtlistener.com/api/rest/v4/search/";
export const PAGE_DELAY_MS = 1200;
const BACKOFF_MS = [5_000, 20_000, 60_000];

export interface CLCase {
  docket_id: number;
  caseName: string;
  court_id: string;
  court: string;
  docketNumber: string | null;
  dateFiled: string | null;
  dateTerminated: string | null;
  docket_absolute_url: string;
  pacer_case_id: string | null;
  party: string[];
}

export interface CLPage {
  results: CLCase[];
  next: string | null;
  count: number;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export function buildSearchUrl(since?: string): string {
  const params = new URLSearchParams({
    type: "r",
    q: `caseName:"Schedule A"`,
    order_by: "dateFiled desc",
  });
  if (since) params.set("filed_after", since);
  return `${BASE}?${params}`;
}

export async function fetchPage(url: string): Promise<CLPage> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const token = process.env.CL_API_TOKEN;
  if (token) headers.Authorization = `Token ${token}`;

  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, { headers });
    if (res.ok) {
      const data = await res.json();
      return { results: data.results ?? [], next: data.next ?? null, count: data.count ?? 0 };
    }
    if ((res.status === 429 || res.status >= 500) && attempt < BACKOFF_MS.length) {
      const wait = BACKOFF_MS[attempt];
      console.warn(`CourtListener ${res.status}; backing off ${wait / 1000}s...`);
      await sleep(wait);
      continue;
    }
    throw new Error(`CourtListener request failed: ${res.status} ${res.statusText} (${url})`);
  }
}
