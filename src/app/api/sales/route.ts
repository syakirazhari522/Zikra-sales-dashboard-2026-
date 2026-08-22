import { getSupabaseConfig, supabaseHeaders, type DatabaseSale } from "@/lib/supabase-rest";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = getSupabaseConfig();
  if (!config) {
    return Response.json({ error: "Supabase belum dikonfigurasi" }, { status: 503 });
  }

  const response = await fetch(
    `${config.url}/rest/v1/sales?select=id,form_code,class_title,product,quantity,list_price,revenue,submitted_at,confirmed_at&order=confirmed_at.asc`,
    { headers: supabaseHeaders(config.secretKey), cache: "no-store" },
  );

  if (!response.ok) {
    return Response.json({ error: "Data Supabase tidak dapat dibaca" }, { status: 502 });
  }

  const rows = (await response.json()) as DatabaseSale[];
  const sales = rows.map((row) => ({
    id: row.id,
    formCode: row.form_code,
    classTitle: row.class_title,
    product: row.product ?? "",
    quantity: Number(row.quantity),
    listPrice: Number(row.list_price),
    revenue: Number(row.revenue),
    submittedAt: row.submitted_at ?? "",
    confirmedAt: row.confirmed_at,
  }));

  return Response.json(sales, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
