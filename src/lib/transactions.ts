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

/**
 * `created_by`/`updated_by` are FKs to auth.users, not profiles, so PostgREST can't embed
 * `creator:created_by(full_name)` on every table. When we fall back to an embed-free select we
 * attach the names here instead, matching the pattern already used in the desktop builder.
 */
async function hydrateNames(rows: any[]): Promise<any[]> {
  const ids = Array.from(
    new Set(rows.flatMap((r) => [r.created_by, r.updated_by]).filter(Boolean)),
  );
  if (ids.length === 0) return rows;

  const { data, error } = await supabase.from("profiles").select("id, full_name").in("id", ids);
  if (error) return rows; // names are cosmetic — never fail the fetch over them

  const nameById: Record<string, string> = {};
  (data || []).forEach((p: any) => { nameById[p.id] = p.full_name; });

  return rows.map((r) => ({
    ...r,
    creator: r.created_by ? { full_name: nameById[r.created_by] || "System" } : null,
    modifier: r.updated_by ? { full_name: nameById[r.updated_by] || "System" } : null,
  }));
}

function sortDesc(rows: any[], orderBy?: string) {
  if (!orderBy) return rows;
  return rows.sort((a, b) => new Date(b[orderBy] || 0).getTime() - new Date(a[orderBy] || 0).getTime());
}

/** One request, filtered through the quote relationship — no id list in the URL. */
async function fetchJoined(
  table: TxnTable,
  operatorId: string,
  select: string,
  orderBy?: string,
): Promise<{ data: any[] | null; error: string | null }> {
  let q = supabase
    .from(table)
    .select(`${select}, quotes!inner(operator_id)`)
    .eq("quotes.operator_id", operatorId);
  if (orderBy) q = q.order(orderBy, { ascending: false });

  const { data, error } = await q;
  if (error) return { data: null, error: error.message };
  return { data: stripJoin(data || []), error: null };
}

/** Short, batched id lists — used when the quote relationship isn't available. */
async function fetchChunked(
  table: TxnTable,
  select: string,
  quoteIds: string[],
  orderBy?: string,
): Promise<{ data: any[] | null; error: string | null }> {
  const out: any[] = [];
  for (let i = 0; i < quoteIds.length; i += CHUNK_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .in("quote_id", quoteIds.slice(i, i + CHUNK_SIZE));
    if (error) return { data: null, error: error.message };
    if (data) out.push(...data);
  }
  return { data: sortDesc(out, orderBy), error: null };
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

  // Degrade one capability at a time so a single unavailable relationship can't blank the ledger.
  // `disbursements.created_by` has no FK to profiles, for instance, which makes the creator/modifier
  // embeds invalid on that table — dropping them still yields complete rows, just without names.
  const wantsNames = select.includes("created_by") || select.includes("updated_by");
  const attempts: {
    why: string;
    embedFree?: boolean;
    run: () => Promise<{ data: any[] | null; error: string | null }>;
  }[] = [
    { why: "relationship filter", run: () => fetchJoined(table, operatorId, select, orderBy) },
    { why: "relationship filter without embeds", embedFree: true, run: () => fetchJoined(table, operatorId, "*", orderBy) },
    { why: "chunked ids", run: () => fetchChunked(table, select, quoteIds, orderBy) },
    { why: "chunked ids without embeds", embedFree: true, run: () => fetchChunked(table, "*", quoteIds, orderBy) },
  ];

  let lastError: string | null = null;
  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    const { data, error } = await attempt.run();
    if (!error) {
      if (i > 0) console.warn(`[${table}] loaded via ${attempt.why} (previous attempt failed: ${lastError})`);
      let rows = data || [];
      // The embeds were dropped to get here, so attach creator/modifier names separately.
      if (attempt.embedFree && wantsNames && rows.length > 0) rows = await hydrateNames(rows);
      return { data: rows, error: null };
    }
    lastError = error;
  }

  console.error(`[${table}] all fetch strategies failed:`, lastError);
  return { data: [], error: lastError };
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
