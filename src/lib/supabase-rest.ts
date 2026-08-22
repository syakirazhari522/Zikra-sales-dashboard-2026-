export type DatabaseSale = {
  id: number;
  form_code: string;
  class_title: string;
  product: string | null;
  quantity: number;
  list_price: number | string;
  revenue: number | string;
  submitted_at: string | null;
  confirmed_at: string;
};

export function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !secretKey) return null;

  return { url: url.replace(/\/$/, ""), secretKey };
}

export function getSupabaseAdminConfig() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) return null;
  return { url: url.replace(/\/$/, ""), secretKey };
}

export function supabaseHeaders(secretKey: string) {
  return {
    apikey: secretKey,
    Authorization: `Bearer ${secretKey}`,
    "Content-Type": "application/json",
  };
}
