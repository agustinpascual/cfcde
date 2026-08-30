import type { Metadata } from "next";
import Link from "next/link";
import { conferirDescadastro } from "@/lib/descadastro";
import { supabaseAdmin } from "@/lib/supabase/servidor";

export const metadata: Metadata = { title: "Descadastro", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/* Chega pelo link do e-mail, sem sessão. O token assina o endereço para que
   ninguém descadastre terceiros trocando o parâmetro na URL. */
export default async function Page({ searchParams }: {
  searchParams: Promise<{ e?: string; t?: string }>;
}) {
  const { e = "", t = "" } = await searchParams;
  const email = e.trim().toLowerCase();
  const valido = Boolean(email && t && conferirDescadastro(email, t));

  if (valido) {
    const db = supabaseAdmin();
    await db?.from("contatos")
      .update({ inscrito: false, motivo_saida: "descadastro" })
      .eq("email", email);
  }

  return (
    <main style={{
      minHeight: "100vh", display: "grid", placeItems: "center", padding: 24,
      fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif", background: "#f6f7f9",
    }}>
      <div style={{
        maxWidth: 460, background: "#fff", borderRadius: 14, padding: "34px 32px",
        border: "1px solid #e5e7eb", textAlign: "center",
      }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: "#111827", marginBottom: 10 }}>
          {valido ? "Pronto, você saiu da lista" : "Não conseguimos confirmar"}
        </h1>
        <p style={{ fontSize: 14, lineHeight: 1.65, color: "#4b5563" }}>
          {valido ? (
            <>Não vamos mais enviar e-mails para <strong>{email}</strong>. Se foi engano,
            é só responder qualquer mensagem anterior que a gente recadastra.</>
          ) : (
            <>Esse link parece inválido ou expirado. Responda o e-mail que você recebeu
            pedindo o descadastro e a gente resolve na mão.</>
          )}
        </p>
        <Link href="/" style={{
          display: "inline-block", marginTop: 22, padding: "11px 22px", borderRadius: 9,
          background: "#111827", color: "#fff", fontSize: 14, fontWeight: 600, textDecoration: "none",
        }}>
          Voltar para a loja
        </Link>
      </div>
    </main>
  );
}
