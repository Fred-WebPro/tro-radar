// Thin client for the CourtListener v4 RECAP search API.
// Works unauthenticated at low rate; set CL_API_TOKEN for higher limits
// (free token: https://www.courtlistener.com/help/api/rest/).

const BASE = "https://www.courtlistener.com/api/rest/v4/search/";
const PAGE_DELAY_MS = 1200;
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

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchPage(url: string): Promise<{ results: CLCase[]; next: string | null; count: number }> {
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

/**
 * Yield pages of Schedule A dockets, newest-filed first.
 * `since` bounds date_filed; omit for a full crawl.
 */
export async function* searchScheduleA(opts: {
  since?: string;
  maxPages?: number;
}): AsyncGenerator<{ results: CLCase[]; count: number; page: number }> {
  const params = new URLSearchParams({
    type: "r",
    q: `caseName:"Schedule A"`,
    order_by: "dateFiled desc",
  });
  if (opts.since) params.set("filed_after", opts.since);

  let url: string | null = `${BASE}?${params}`;
  let page = 0;
  while (url) {
    const { results, next, count } = await fetchPage(url);
    page++;
    yield { results, count, page };
    if (opts.maxPages && page >= opts.maxPages) return;
    url = next;
    if (url) await sleep(PAGE_DELAY_MS);
  }
}
