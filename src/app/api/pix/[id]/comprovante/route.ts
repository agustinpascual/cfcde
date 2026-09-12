import { createHash, randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/servidor";
import { validarTokenComprovante } from "@/lib/pix-comprovante-token";
import { compararComprovante, LIMITE_COMPROVANTE, tipoComprovante } from "@/lib/pix-comprovante-validacao";
import { excedeu, ipDe } from "@/lib/limite";
import { mesmaOrigem } from "@/lib/mesma-origem";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const BUCKET = "pix-comprovantes";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
type Context = { params: Promise<{ id: string }> };

async function autorizar(req: Request, ctx: Context) {
  const { id } = await ctx.params;
  const ip = ipDe(req);
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const acesso = /^[A-Za-z0-9_-]{4,64}$/.test(id) ? validarTokenComprovante(token, id, ip) : null;
  if (!acesso) return { erro: json({ erro: "Acesso ao comprovante inválido ou expirado. Procure o atendimento." }, 403) };
  const db = supabaseAdmin();
  if (!db) return { erro: json({ erro: "Envio de comprovantes temporariamente indisponível." }, 503) };
  const { data: pedido, error } = await db.from("pedidos")
    .select("id,status,cliente_nome,valor_centavos,criado_em")
    .eq("pix_id", id).eq("metodo_pagamento", "pix").maybeSingle();
  if (error) return { erro: json({ erro: "Não foi possível consultar o pedido." }, 503) };
  if (!pedido) return { erro: json({ erro: "Pedido não encontrado." }, 404) };
  return { db, pedido, acesso, ip };
}

export async function GET(req: Request, ctx: Context) {
  if (excedeu(`comprovante-ler:${ipDe(req)}`, 60, 60000)) return json({ erro: "Aguarde para tentar novamente." }, 429);
  const auth = await autorizar(req, ctx);
  if (auth.erro) return auth.erro;
  const { data, error } = await auth.db.from("pix_comprovantes")
    .select("recebido_em").eq("pedido_id", auth.pedido.id).maybeSingle();
  if (error) return json({ erro: "Envio de comprovantes temporariamente indisponível." }, 503);
  // Não devolve dados declarados ou arquivo para quem apenas possui o token.
  return json({ enviado: Boolean(data), recebido_em: data?.recebido_em ?? null });
}

export async function POST(req: Request, ctx: Context) {
  if (!mesmaOrigem(req)) return json({ erro: "Origem não autorizada." }, 403);
  if (excedeu(`comprovante-enviar:${ipDe(req)}`, 8, 3600000)) return json({ erro: "Limite de envios atingido. Tente mais tarde ou procure o atendimento." }, 429);
  const auth = await autorizar(req, ctx);
  if (auth.erro) return auth.erro;
  const { db, pedido, acesso } = auth;
  if (["aprovado", "estornado"].includes(pedido.status)) return json({ erro: "Este pagamento já foi finalizado. Atualize a página." }, 409);
  const { data: existente, error: erroLeitura } = await db.from("pix_comprovantes")
    .select("recebido_em").eq("pedido_id", pedido.id).maybeSingle();
  if (erroLeitura) return json({ erro: "Envio de comprovantes temporariamente indisponível." }, 503);
  if (existente) return json({ enviado: true, recebido_em: existente.recebido_em });

  const maxBody = LIMITE_COMPROVANTE + 32 * 1024;
  if (!req.headers.get("content-type")?.startsWith("multipart/form-data;")) return json({ erro: "Envie um arquivo pelo formulário." }, 415);
  if (Number(req.headers.get("content-length")) > maxBody) return json({ erro: "O comprovante deve ter até 5 MB." }, 413);
  // Limita também o corpo real, inclusive quando content-length não é enviado.
  const reader = req.body?.getReader();
  if (!reader) return json({ erro: "Arquivo não informado." }, 400);
  let form: FormData;
  try {
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBody) {
        await reader.cancel();
        return json({ erro: "O comprovante deve ter até 5 MB." }, 413);
      }
      chunks.push(value);
    }
    form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": req.headers.get("content-type")! } }).formData();
  } catch { return json({ erro: "Não foi possível ler o arquivo enviado." }, 400); }
  finally { reader.releaseLock(); }
  const file = form.get("arquivo");
  if (!(file instanceof File) || file.size === 0 || file.size > LIMITE_COMPROVANTE) return json({ erro: "Selecione uma imagem ou PDF de até 5 MB." }, 422);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mime = tipoComprovante(bytes);
  if (!mime || mime !== file.type) return json({ erro: "Formato inválido. Use JPG, PNG, WebP ou PDF." }, 415);
  const nome = String(form.get("nome") ?? "").trim();
  const valor = Number(form.get("valor_centavos"));
  const horario = String(form.get("horario") ?? "");
  const copia = String(form.get("copiado_em") ?? "");
  if (nome.length < 3 || nome.length > 200 || !Number.isSafeInteger(valor) || valor <= 0 || valor > 2147483647
    || !/^\d{4}-\d{2}-\d{2}T/.test(horario) || !Number.isFinite(Date.parse(horario))) return json({ erro: "Confira nome, valor e horário informados." }, 422);
  const agora = Date.now();
  const comparacao = compararComprovante({ nome, valor, horario }, pedido, agora);
  const id = randomUUID();
  const path = `${pedido.id}/${id}`; // Não usa o nome do arquivo fornecido pelo cliente.
  const { error: erroUpload } = await db.storage.from(BUCKET).upload(path, bytes, { contentType: mime, upsert: false });
  if (erroUpload) return json({ erro: "Não foi possível guardar o comprovante. Tente novamente." }, 503);
  const { error: erroRegistro } = await db.from("pix_comprovantes").insert({
    id, pedido_id: pedido.id, arquivo_path: path, mime, tamanho: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    nome_informado: nome, valor_informado: valor, horario_informado: new Date(horario).toISOString(),
    copiado_em: Number.isFinite(Date.parse(copia)) && Date.parse(copia) <= agora ? new Date(copia).toISOString() : null,
    mesmo_ip: acesso.mesmoIp, ...comparacao,
  });
  if (erroRegistro) {
    // Remove apenas este novo objeto órfão; nunca sobrescreve o comprovante existente.
    const { error: erroLimpeza } = await db.storage.from(BUCKET).remove([path]);
    if (erroLimpeza) console.error("[comprovante] arquivo órfão necessita limpeza", id);
    if (erroRegistro.code === "23505") return json({ enviado: true });
    return json({ erro: "Não foi possível registrar o comprovante. Tente novamente." }, 503);
  }
  // Intencionalmente não altera status/pago_em e não dispara entrega ou Purchase.
  return json({ enviado: true }, 201);
}
