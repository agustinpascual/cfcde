type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

export async function GET(request: Request) {
  const cep = new URL(request.url).searchParams.get("cep")?.replace(/\D/g, "") ?? "";

  if (!/^\d{8}$/.test(cep)) {
    return Response.json({ error: "Digite um CEP válido com 8 números." }, { status: 400 });
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error("ViaCEP indisponível");
    }

    const data = (await response.json()) as ViaCepResponse;

    if (data.erro || !data.localidade || !data.uf) {
      return Response.json({ error: "CEP não encontrado." }, { status: 404 });
    }

    return Response.json({
      postalCode: data.cep ?? cep,
      street: data.logradouro ?? "",
      complement: data.complemento ?? "",
      neighborhood: data.bairro ?? "",
      city: data.localidade,
      state: data.uf,
    });
  } catch {
    return Response.json(
      { error: "Serviço de CEP temporariamente indisponível. Tente novamente." },
      { status: 502 },
    );
  }
}
