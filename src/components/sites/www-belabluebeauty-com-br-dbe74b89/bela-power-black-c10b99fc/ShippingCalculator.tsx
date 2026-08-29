"use client";
import { useRef, useState } from "react";
import { opcoesFrete } from "./data";
import s from "./styles.module.css";

/* Calculadora de frete.
   - O endereço vem da ViaCEP (https://viacep.com.br), API pública e gratuita.
   - Valores e prazos são fixos (data.ts › opcoesFrete), iguais para todo o país.
     Não há integração com transportadora. */

type Endereco = { localidade: string; uf: string; bairro: string; logradouro: string };
type Opcao = { nome: string; preco: number; prazoMin: number; prazoMax: number; destaque?: boolean };
type Estado =
  | { tipo: "vazio" }
  | { tipo: "carregando" }
  | { tipo: "erro"; msg: string }
  | { tipo: "ok"; endereco: Endereco; opcoes: Opcao[] };

const formataCep = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
};

const moeda = (n: number) =>
  n === 0 ? "Grátis" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const OPCOES: Opcao[] = opcoesFrete.map((o) => ({
  nome: o.nome, preco: o.preco, prazoMin: o.min, prazoMax: o.max, destaque: o.destaque,
}));

export default function ShippingCalculator() {
  const [cep, setCep] = useState("");
  const [estado, setEstado] = useState<Estado>({ tipo: "vazio" });
  const abortRef = useRef<AbortController | null>(null);

  async function calcular(e: React.FormEvent) {
    e.preventDefault();
    const digitos = cep.replace(/\D/g, "");
    if (digitos.length !== 8) {
      setEstado({ tipo: "erro", msg: "Digite um CEP com 8 dígitos." });
      return;
    }

    abortRef.current?.abort(); // descarta consulta anterior ainda em voo
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setEstado({ tipo: "carregando" });

    try {
      const res = await fetch(`https://viacep.com.br/ws/${digitos}/json/`, { signal: ctrl.signal });
      if (!res.ok) throw new Error("http");
      const dados = await res.json();
      if (dados.erro) {
        setEstado({ tipo: "erro", msg: "CEP não encontrado. Confira o número." });
        return;
      }
      setEstado({
        tipo: "ok",
        endereco: { localidade: dados.localidade, uf: dados.uf, bairro: dados.bairro || "", logradouro: dados.logradouro || "" },
        opcoes: OPCOES,
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setEstado({ tipo: "erro", msg: "Não foi possível consultar o CEP agora. Tente de novo." });
    }
  }

  return (
    <div className={s.frete}>
      <form className={s.freteLinha} onSubmit={calcular}>
        <span className={s.freteLabel}>Calcular frete e prazo</span>
        <input
          className={s.freteInput}
          value={cep}
          onChange={(ev) => { setCep(formataCep(ev.target.value)); if (estado.tipo === "erro") setEstado({ tipo: "vazio" }); }}
          placeholder="Digite seu CEP"
          aria-label="CEP"
          inputMode="numeric"
          autoComplete="postal-code"
          maxLength={9}
        />
        <button className={s.btFrete} type="submit" disabled={estado.tipo === "carregando"}>
          {estado.tipo === "carregando" ? "..." : "Calcular"}
        </button>
      </form>

      {estado.tipo === "erro" && <p className={s.freteErro} role="alert">{estado.msg}</p>}

      {estado.tipo === "carregando" && <p className={s.freteInfo}>Consultando CEP…</p>}

      {estado.tipo === "ok" && (
        <div className={s.freteResultado}>
          <p className={s.freteEndereco}>
            {estado.endereco.logradouro && <>{estado.endereco.logradouro} — </>}
            {estado.endereco.bairro && <>{estado.endereco.bairro}, </>}
            <strong>{estado.endereco.localidade} - {estado.endereco.uf}</strong>
          </p>

          <ul className={s.freteOpcoes}>
            {estado.opcoes.map((o) => (
              <li key={o.nome} className={`${s.freteOpcao} ${o.destaque ? s.freteOpcaoDestaque : ""}`}>
                <span className={s.freteOpcaoNome}>
                  {o.nome}
                  {o.destaque && <span className={s.freteTag}>mais rápido</span>}
                </span>
                <span className={s.freteOpcaoPrazo}>
                  {o.prazoMin === o.prazoMax ? `${o.prazoMin} dia útil` : `${o.prazoMin} a ${o.prazoMax} dias úteis`}
                </span>
                <span className={`${s.freteOpcaoPreco} ${o.preco === 0 ? s.freteGratis : ""}`}>{moeda(o.preco)}</span>
              </li>
            ))}
          </ul>

          <p className={s.freteNota}>Prazos e valores estimados a partir do CEP informado.</p>
        </div>
      )}
    </div>
  );
}
