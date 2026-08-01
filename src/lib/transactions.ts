import { supabase } from "@/lib/supabase";

/**
 * Fetching payments/disbursements used to pass every quote id into `.in("quote_id", [...])`.
 * Once an operator passed a few hundred quotes that querystring grew past the gateway's
 * URI limit and the request was rejected with a plain-text 400 before it ever reached
 * PostgREST — so the ledger silently rendered as "no transactions".
 *
 * Preferred path: filter server-side through the quote relationship, so no id list is ever
 * placed in the URL. If that embed isn't available we fall back to chunked id batches,
 * which keeps every URL short regardless of how many quotes exist.
 */

/** Ids per request in the fallback path. 100 uuids ≈ 3.7KB of querystring — well under any limit. */
const CHUNK_SIZE = 100;

type TxnTable = "payments" | "disbursements";

export interface TxnFetchResult<T = any> {
  data: T[];
  /** Set when the data could not be loaded at all, so callers can surface it instead of showing an empty list. */
  error: string | null;
}

function stripJoin<T extends Record<string, any>>(rows: T[]): T[] {
  // The inner-join adds a `quotes` key purely for filtering; drop it so rows keep their original shape.
  return rows.map((row) => {
    const copy = { ...row };
    delete copy.quotes;
    return copy;
  });
}

async function fetchChunked(
  table: TxnTable,
  select: string,
  quoteIds: string[],
  orderBy?: string,
): Promise<TxnFetchResult> {
  const out: any[] = [];
  for (let i = 0; i < quoteIds.length; i += CHUNK_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .in("quote_id", quoteIds.slice(i, i + CHUNK_SIZE));
    if (error) return { data: [], error: error.message };
    if (data) out.push(...data);
  }
  if (orderBy) {
    out.sort((a, b) => new Date(b[orderBy] || 0).getTime() - new Date(a[orderBy] || 0).getTime());
  }
  return { data: out, error: null };
}

/**
 * Load an operator's transactions without ever putting quote ids in the URL.
 *
 * @param quoteIds Ids already loaded by the caller, used only by the fallback path.
 * @param orderBy  Column to sort by, descending. Applied client-side in the fallback.
 */
export async function fetchOperatorTransactions(
  table: TxnTable,
  operatorId: string,
  quoteIds: string[],
  select = "*",
  orderBy?: string,
): Promise<TxnFetchResult> {
  if (!operatorId || quoteIds.length === 0) return { data: [], error: null };

  // 1. Single request, filtered through the quote relationship — no id list, no URL ceiling.
  let joined = supabase
    .from(table)
    .select(`${select}, quotes!inner(operator_id)`)
    .eq("quotes.operator_id", operatorId);
  if (orderBy) joined = joined.order(orderBy, { ascending: false });

  const { data, error } = await joined;
  if (!error) return { data: stripJoin(data || []), error: null };

  // 2. The relationship embed wasn't usable — retry with short, chunked id batches.
  console.warn(`[${table}] relationship filter failed, falling back to chunked ids:`, error.message);
  return fetchChunked(table, select, quoteIds, orderBy);
}

/** Sum of payments per quote id, for the dashboard quote cards. */
export async function fetchPaymentTotals(
  operatorId: string,
  quoteIds: string[],
): Promise<{ totals: Record<string, number>; error: string | null }> {
  const { data, error } = await fetchOperatorTransactions("payments", operatorId, quoteIds, "quote_id, amount");
  const totals: Record<string, number> = {};
  data.forEach((p: any) => {
    totals[p.quote_id] = (totals[p.quote_id] || 0) + (p.amount || 0);
  });
  return { totals, error };
}
