import { getSupabaseAdminConfig, supabaseHeaders } from "@/lib/supabase-rest";

type SyncSale = {
  id: number;
  form_code: string;
  class_title: string;
  product?: string;
  quantity?: number;
  list_price?: number;
  revenue?: number;
  submitted_at?: string | null;
  confirmed_at: string;
};

function isValidSale(value: unknown): value is SyncSale {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<SyncSale>;
  return Number.isSafeInteger(row.id) && row.id! > 0 &&
    typeof row.form_code === "string" && row.form_code.length <= 200 &&
    typeof row.class_title === "string" && row.class_title.length <= 500 &&
    typeof row.confirmed_at === "string" && !Number.isNaN(Date.parse(row.confirmed_at));
}

export async function POST(request: Request) {
  const syncSecret = process.env.GOOGLE_SYNC_SECRET;
  const authorization = request.headers.get("authorization");
  if (!syncSecret || authorization !== `Bearer ${syncSecret}`) {
    return Response.json({ error: "Tidak dibenarkan" }, { status: 401 });
  }

  const config = getSupabaseAdminConfig();
  if (!config) {
    return Response.json({ error: "Supabase belum dikonfigurasi" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON tidak sah" }, { status: 400 });
  }

  const rows = (body as { rows?: unknown })?.rows;
  if (!Array.isArray(rows) || rows.length === 0 || rows.length > 10_000 || !rows.every(isValidSale)) {
    return Response.json({ error: "Format data tidak sah" }, { status: 400 });
  }

  const response = await fetch(`${config.url}/rest/v1/rpc/upsert_sales`, {
    method: "POST",
    headers: supabaseHeaders(config.secretKey),
    body: JSON.stringify({ payload: rows }),
    cache: "no-store",
  });

  if (!response.ok) {
    const requestId = response.headers.get("x-request-id");
    return Response.json({ error: "Sync Supabase gagal", requestId }, { status: 502 });
  }

  const synced = Number(await response.json());
  return Response.json({ ok: true, synced, syncedAt: new Date().toISOString() });
}
