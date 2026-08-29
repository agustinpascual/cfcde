export type Kit = {
  nome: string;
  duracao: string;
  descricao: string;
  de: string | null;
  total: string;
  unidade: string;
  economia: string | null;
  desconto: string | null;
  imagem: string;
  ativo: boolean;
  recomendado?: boolean;
};

export type NavItem = { label: string; dropdown?: boolean };

export type RelatedProduct = {
  title: string;
  img: string;
  de: string;
  por: string;
  parcelas: string;
  boleto: string;
  pix: string;
  desconto: string;
};

export type Review = {
  autor: string;
  data: string;
  texto: string;
  estrelas: number;
  foto?: string;
};

export type FooterColumn = { title: string; links: { label: string }[] };
