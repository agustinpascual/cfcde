import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  MENSAGEM_CARRINHO_PADRAO, MENSAGEM_PIX_PADRAO, numeroWhatsapp,
  preencherMensagemRecuperacao, validarMensagemRecuperacao,
  VARIAVEIS_CARRINHO, VARIAVEIS_PIX,
} from "../src/lib/mensagens-recuperacao.ts";

const fonte = caminho => readFileSync(new URL(caminho, import.meta.url), "utf8");

test("modelos de recuperação substituem os dados sem perder quebras de linha", () => {
  const pix = preencherMensagemRecuperacao(MENSAGEM_PIX_PADRAO, {
    nome: "Ana", pedido: "123456", valor: "R$ 85,00", codigo_pix: "000201",
  });
  assert.match(pix, /Ana/); assert.match(pix, /123456/); assert.match(pix, /R\$ 85,00/); assert.match(pix, /000201/);
  assert.doesNotMatch(pix, /\{(?:nome|pedido|valor|codigo_pix)\}/);

  const carrinho = preencherMensagemRecuperacao(MENSAGEM_CARRINHO_PADRAO, {
    nome: "Bia", produto: "Box Plus", valor: "R$ 89,90", link: "https://loja.example/recuperar",
  });
  assert.match(carrinho, /Box Plus/); assert.match(carrinho, /https:\/\/loja\.example\/recuperar/);
});

test("validação aceita somente variáveis conhecidas e limita o tamanho", () => {
  assert.equal(validarMensagemRecuperacao(MENSAGEM_PIX_PADRAO, VARIAVEIS_PIX).ok, true);
  assert.equal(validarMensagemRecuperacao(MENSAGEM_CARRINHO_PADRAO, VARIAVEIS_CARRINHO).ok, true);
  assert.match(validarMensagemRecuperacao("Mensagem com {senha_cliente}", VARIAVEIS_PIX).erro, /não é permitida/);
  assert.equal(validarMensagemRecuperacao("curta", VARIAVEIS_PIX).ok, false);
  assert.equal(validarMensagemRecuperacao("x".repeat(1601), VARIAVEIS_PIX).ok, false);
});

test("telefone brasileiro é normalizado para o link do WhatsApp", () => {
  assert.equal(numeroWhatsapp("(47) 92005-7518"), "5547920057518");
  assert.equal(numeroWhatsapp("5547920057518"), "5547920057518");
  assert.equal(numeroWhatsapp(null), "");
});

test("painel e ações de recuperação usam os modelos salvos", () => {
  const pagina = fonte("../src/app/painel/whatsapp/page.tsx");
  const carrinho = fonte("../src/components/painel/AcoesRecuperacaoCarrinho.tsx");
  const pix = fonte("../src/components/painel/PixCobranca.tsx");
  assert.match(pagina, /WHATSAPP_MSG_PIX_PENDENTE/);
  assert.match(pagina, /WHATSAPP_MSG_CARRINHO_ABANDONADO/);
  assert.match(carrinho, /preencherMensagemRecuperacao/);
  assert.match(pix, /Enviar recuperação no WhatsApp/);
});
