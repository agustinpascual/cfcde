import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const fonte = readFileSync(new URL("../src/components/sites/cafecomdeuspai-com-8456844d/checkout/CheckoutCafe.tsx", import.meta.url), "utf8");
const inicio = fonte.indexOf("  async function generatePix() {");
const fim = fonte.indexOf("\n  async function copyPix()", inicio);
const gerarPix = fonte.slice(inicio, fim);

test("checkout aquece a página definitiva do Pix", () => {
  assert.match(fonte, /router\.prefetch\("\/pagamento"\)/);
});

test("checkout mostra a Stone como processadora ao selecionar Pix", () => {
  assert.match(fonte, /Pix processado por/);
  assert.match(fonte, /stone\.webp/);
});

test("resposta do gateway navega sem espera artificial nem QR intermediário", () => {
  assert.ok(inicio >= 0 && fim > inicio, "fluxo generatePix não encontrado");
  assert.doesNotMatch(gerarPix, /await new Promise|setTimeout\(resolve/);

  const persistir = gerarPix.indexOf("salvarPagamentoParaTela({");
  const navegar = gerarPix.indexOf('router.push("/pagamento")');
  const fallback = gerarPix.indexOf("setPixCharge(data)");
  assert.ok(persistir >= 0 && persistir < navegar, "o pagamento deve ser persistido antes da navegação");
  assert.ok(navegar < fallback, "o QR no checkout deve existir somente como fallback de storage");
});

test("clique duplo não dispara duas cobranças Pix", () => {
  assert.match(gerarPix, /if \(geracaoPixEmAndamento\.current\) return;/);
  assert.match(gerarPix, /geracaoPixEmAndamento\.current = true;/);
  assert.match(gerarPix, /finally \{[\s\S]*geracaoPixEmAndamento\.current = false;/);
});

test("Pix recebido após 40s chega à página de pagamento sem nova cobrança", async () => {
  const agenda = [], erros = [], destinos = [], salvos = [];
  let chamadas = 0;
  const gerar = vm.runInNewContext(`(${gerarPix.trim()})`, {
    Error,
    validarOrderBumps: () => true,
    geracaoPixEmAndamento: { current: false },
    setGeneratingPix: () => {}, setPixStage: () => {}, setPixCharge: () => {},
    setPaymentError: erro => { if (erro) erros.push(erro); },
    tentativaPagamento: () => "tentativa-ficticia", cartKey: "produto-teste",
    paymentPayload: {}, finalizado: { current: false }, abandonoPendente: { current: null },
    pixel: () => {}, dadosProdutoPixel: () => ({}), productName: "Produto teste",
    products: [{ quantity: 1 }], product: { image: "/teste.webp" },
    salvarPagamentoParaTela: dados => salvos.push(dados),
    router: { push: destino => destinos.push(destino) },
    AbortSignal: { timeout(ms) {
      const controller = new AbortController();
      agenda.push({ ms, executar: () => controller.abort(new Error("Tempo esgotado")) });
      return controller.signal;
    } },
    fetch: (_url, init) => {
      chamadas++;
      return new Promise((resolve, reject) => {
        init.signal.addEventListener("abort", () => reject(init.signal.reason), { once: true });
        agenda.push({ ms: 40000, executar: () => resolve(Response.json({
          id: "pix-ficticio", pedido: "123456", total: 1000, status: "pending", qr_code: "PIX-FICTICIO",
        })) });
      });
    },
  });
  const primeira = gerar();
  await gerar(); // clique durante a mesma emissão deve ser ignorado
  for (const evento of agenda.sort((a, b) => a.ms - b.ms)) evento.executar();
  await primeira;
  assert.deepEqual(erros, []);
  assert.deepEqual(destinos, ["/pagamento"]);
  assert.equal(salvos[0].qr_code, "PIX-FICTICIO");
  assert.equal(chamadas, 1);
});
