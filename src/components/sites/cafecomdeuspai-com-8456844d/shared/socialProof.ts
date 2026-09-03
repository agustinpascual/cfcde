/* Dados sintéticos para a prova social do lado esquerdo. Nomes, cidades e
   horários são sorteados no cliente a cada exibição — não há pedido real
   por trás. */
const nomesFemininos = [
  "Ana", "Maria", "Juliana", "Fernanda", "Camila", "Patrícia", "Larissa", "Beatriz",
  "Gabriela", "Aline", "Carla", "Vanessa", "Priscila", "Bruna", "Tatiane", "Renata",
  "Débora", "Simone", "Letícia", "Amanda", "Jéssica", "Mariana", "Rafaela", "Cristiane",
  "Sabrina", "Luciana", "Elaine", "Michele", "Adriana", "Viviane", "Daniela", "Roberta",
];

const nomesMasculinos = [
  "João", "Carlos", "Pedro", "Lucas", "Rafael", "Bruno", "Felipe", "Marcos",
  "Thiago", "Rodrigo", "Anderson", "Gustavo", "Eduardo", "Daniel", "Ricardo", "Fernando",
  "Leonardo", "Vinícius", "Alexandre", "Douglas", "Matheus", "Everton", "Wagner", "Cláudio",
  "Márcio", "Diego", "Fábio", "Renato", "Sérgio", "Alan", "Vitor", "Guilherme",
];

const sobrenomes = [
  "Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Costa", "Rodrigues",
  "Almeida", "Nascimento", "Carvalho", "Araújo", "Ribeiro", "Ferreira", "Gomes",
  "Martins", "Rocha", "Barbosa", "Alves", "Monteiro", "Cardoso", "Teixeira",
];

const cidades = [
  "São Paulo - SP", "Rio de Janeiro - RJ", "Belo Horizonte - MG", "Curitiba - PR",
  "Porto Alegre - RS", "Salvador - BA", "Fortaleza - CE", "Recife - PE",
  "Brasília - DF", "Manaus - AM", "Goiânia - GO", "Belém - PA",
  "Florianópolis - SC", "Vitória - ES", "Natal - RN", "João Pessoa - PB",
  "Maceió - AL", "Campo Grande - MS", "Cuiabá - MT", "Teresina - PI",
  "São Luís - MA", "Aracaju - SE", "Joinville - SC", "Campinas - SP",
  "Uberlândia - MG", "Blumenau - SC", "Londrina - PR", "Ribeirão Preto - SP",
  "Sorocaba - SP", "Caxias do Sul - RS", "Niterói - RJ", "Santos - SP",
  "Juiz de Fora - MG", "Feira de Santana - BA", "Chapecó - SC", "Itajaí - SC",
  "Balneário Camboriú - SC", "Criciúma - SC", "Maringá - PR", "Cascavel - PR",
  "Bauru - SP", "Piracicaba - SP", "Petrolina - PE", "Anápolis - GO",
];

export type Compra = { id: number; nome: string; cidade: string; minutos: number };

const sorteia = <T,>(lista: readonly T[]) => lista[Math.floor(Math.random() * lista.length)];

export function geraCompra(id: number): Compra {
  const primeiro = Math.random() < 0.7 ? sorteia(nomesFemininos) : sorteia(nomesMasculinos);
  return {
    id,
    nome: `${primeiro} ${sorteia(sobrenomes).charAt(0)}.`,
    cidade: sorteia(cidades),
    minutos: 1 + Math.floor(Math.random() * 24),
  };
}
