import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

test("PinPay recebe referência real, link oficial e todos os itens do pedido", async () => {
  let enviado, registrado;
  const valores = { total: 6500, subtotal: 6500, desconto: 0, kit: { nome: "1x Produto A + 2x Produto B" },
    quantidadeTotal: 3, itens: [{ nome: "Produto A", quantidade: 1, totalCentavos: 2500 }, { nome: "Produto B", quantidade: 2, totalCentavos: 4000 }],
    frete: { centavos: 0, nome: "PAC" } };
  const deps = {
    "next/server": { NextResponse: Response },
    qrcode: { toDataURL: async () => "QR-FICTICIO" },
    "@/lib/pinpay": { criarPix: async dados => {
      enviado = dados;
      return { id: "pix_ficticio", status: "pending", pix: { qr_code: "PIX-FICTICIO" } };
    } },
    "@/lib/gateways-config": { lerGateways: async () => ({ pix: "pinpay" }) },
    "@/lib/pagamentos-axxon": { processarAxxon: () => { throw new Error("Gateway incorreto"); } },
    "@/lib/pix-comprovante-token": { criarTokenComprovante: () => "token-ficticio" },
    "@/lib/limite": { excedeu: () => false, ipDe: () => "teste" },
    "@/lib/precos": {
      calcularTotal: () => valores, calcularTotalCafe: () => valores, calcularCarrinhoCafe: () => valores,
      lerOrderBumpsCheckout: dados => dados?.dedicatoria_junior
        ? { adicionais: ["dedicatoria_junior"], registro: { dedicatoria_junior: true } }
        : { adicionais: [], registro: {} },
    },
    "@/lib/config-integracoes": { ler: async () => "credencial-ficticia" },
    "@/lib/confirmar-pedido": { depois: () => {}, enviarPixPorEmail: async () => {} },
    "@/lib/numero-pedido": { novoNumeroPedido: async () => "34893" },
    "@/lib/origem": { origemOficial: () => true },
    "@/lib/supabase/servidor": { supabaseAdmin: () => ({ from: () => ({
      insert: async dados => { registrado = dados; return { error: null }; },
      update: () => ({ eq: async () => ({ error: null }) }),
    }) }) },
    "@/lib/documento-br": { documentoBrasileiroValido: () => true },
    "@/lib/corpo-json": {
      ErroCorpo: class ErroCorpo extends Error {},
      lerJsonObjeto: req => req.json(),
    },
  };
  const fonte = readFileSync(new URL("../src/app/api/pix/route.ts", import.meta.url), "utf8");
  const js = ts.transpileModule(fonte, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const exports = {};
  vm.runInNewContext(js, { exports, URL, process: { env: {} }, require: id => {
    if (!(id in deps)) throw new Error(`Dependência não simulada: ${id}`);
    return deps[id];
  } });
  const resposta = await exports.POST(new Request("https://loja.example/api/pix", { method: "POST", body: JSON.stringify({
    nome: "Cliente Ficticio", email: "teste@example.com", documento: "00000000000", loja: "cafecomdeuspai", produto: "teste", qtd: 1, frete: "pac",
    order_bumps: { dedicatoria_junior: true },
  }) }));
  assert.equal(resposta.status, 200);
  assert.equal(enviado.description, "GOKOCO Escova Modeladora de Cabelo Bivolt - Pedido #34893");
  assert.equal(enviado.metadata.checkout_url, "https://loja.example/checkout");
  assert.equal(enviado.metadata.external_reference, registrado.referencia);
  assert.equal((await resposta.json()).pedido, registrado.referencia);
  assert.equal(registrado.kit, "1x Produto A + 2x Produto B");
  assert.equal(registrado.quantidade, 3);
  assert.deepEqual(registrado.order_bumps, { dedicatoria_junior: true });
});
