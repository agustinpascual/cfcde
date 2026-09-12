import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatarDataBrasilia, formatarDataHoraBrasilia, formatarHoraBrasilia, FUSO_BRASILIA } from "../src/lib/data-brasilia.ts";

test("converte UTC para a data e hora civil de Brasília", () => {
  const instante = "2026-09-10T02:30:00.000Z";
  assert.equal(FUSO_BRASILIA, "America/Sao_Paulo");
  assert.equal(formatarDataBrasilia(instante), "09/09/2026");
  assert.match(formatarHoraBrasilia(instante), /23:30/);
  const completo = formatarDataHoraBrasilia(instante);
  assert.match(completo, /09\/09\/2026/);
  assert.match(completo, /23:30/);
});

test("painel, WhatsApp, recibos e exportação usam o formatador central", () => {
  for (const caminho of [
    "../src/app/ioh3j4ciof3n3oic/pedidos/page.tsx",
    "../src/app/ioh3j4ciof3n3oic/pedidos/[id]/page.tsx",
    "../src/app/ioh3j4ciof3n3oic/pedidos/[id]/recibo/page.tsx",
    "../src/app/ioh3j4ciof3n3oic/pedidos/abandonados/page.tsx",
    "../src/app/ioh3j4ciof3n3oic/pedidos/abandonados/[sessao]/page.tsx",
    "../src/app/api/painel/pedidos/exportar/route.ts",
    "../src/components/painel/Conversas.tsx",
    "../src/components/painel/Emails.tsx",
    "../src/components/painel/JornadaCliente.tsx",
    "../src/lib/recibo-pdf.ts",
  ]) {
    assert.match(readFileSync(new URL(caminho, import.meta.url), "utf8"), /data-brasilia/);
  }
});
