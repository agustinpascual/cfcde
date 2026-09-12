import { autenticado } from "@/lib/painel-auth";
import { supabaseAdmin } from "@/lib/supabase/servidor";
import { TIPOS_COMPROVANTE } from "@/lib/pix-comprovante-validacao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const privado = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
  if (!(await autenticado())) return new Response(null, { status: 401, headers: privado });
  const { id } = await ctx.params;
  if (!/^[a-f0-9-]{36}$/i.test(id)) return new Response(null, { status: 400, headers: privado });
  const db = supabaseAdmin();
  if (!db) return new Response(null, { status: 503, headers: privado });
  const { data: row, error } = await db.from("pix_comprovantes").select("arquivo_path,mime").eq("pedido_id", id).maybeSingle();
  if (error) return new Response(null, { status: 503, headers: privado });
  if (!row || !TIPOS_COMPROVANTE.includes(row.mime) || !row.arquivo_path.startsWith(`${id}/`)) return new Response(null, { status: 404, headers: privado });
  const { data, error: downloadError } = await db.storage.from("pix-comprovantes").download(row.arquivo_path);
  if (downloadError || !data) return new Response(null, { status: 503, headers: privado });
  const pdf = row.mime === "application/pdf";
  return new Response(data, { headers: {
    ...privado, "Content-Type": row.mime,
    "Content-Disposition": pdf ? 'attachment; filename="comprovante.pdf"' : "inline",
    "Content-Security-Policy": "default-src 'none'; sandbox",
  } });
}
