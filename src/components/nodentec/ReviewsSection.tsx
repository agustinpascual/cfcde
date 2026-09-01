import Image from "next/image";
import { BadgeCheck, Star } from "lucide-react";
import model15 from "@/lib/1-frontal.jpg";
import model25 from "@/lib/1-frontal (1).jpg";
import model50 from "@/lib/1-frontal (2).jpg";

const examples = [
  { text: "Meu vizinho de cima ficava com a caixa de som Bluetooth ligada até tarde. Com o de 25m o alcance dele parou de conectar direito e o barulho praticamente sumiu. Demora alguns segundos para agir, mas funciona mesmo.", author: "Marcelo R.", location: "Sorocaba, SP", model: "25 metros" },
  { text: "Peguei o menor porque era só para bloquear o sinal no quarto do meu filho à noite. Chegou bem embalado e foi fácil de configurar. Pelo tamanho achei que não ia dar conta do cômodo inteiro, mas deu.", author: "Débora C.", location: "Contagem, MG", model: "15 metros" },
  { text: "Minha casa é de esquina e o sinal Bluetooth dos vizinhos vivia interferindo nos meus fones. Testei no quintal e o bloqueio pegou bem em toda a área. O estojo também é bom para guardar tudo junto.", author: "Leandro V.", location: "Maringá, PR", model: "50 metros" },
];
const ratingBreakdown: [number, number][] = [[5, 15], [4, 5], [3, 0], [2, 0], [1, 0]];
const totalReviews = ratingBreakdown.reduce((sum, [, count]) => sum + count, 0);
const demoReviews = [
  { initial: "L", name: "Luana E.", location: "Vitória, ES", model: "15 metros", timeAgo: "há 2 semanas", text: "Comprei para minha mãe bloquear o Bluetooth da TV do vizinho que atrapalhava a dela. Expliquei uma vez e ela conseguiu ligar sozinha. Resolveu o problema no mesmo dia.", accent: true },
  { initial: "S", name: "Samuel N.", location: "Joinville, SC", model: "25 metros", timeAgo: "há 16 dias", text: "Uso para cortar o sinal de fones e caixinhas Bluetooth durante as reuniões de trabalho em casa. As antenas ficam firmes e o aparelho não esquenta, mesmo ligado várias horas." },
  { initial: "P", name: "Paulo C.", location: "Uberlândia, MG", model: "25 metros", timeAgo: "há 3 semanas", text: "Foi só encaixar as antenas e ligar. Nos primeiros testes mexi na direção até achar a melhor posição para bloquear o sinal de ponta a ponta do apartamento. Depois ficou perfeito." },
  { initial: "C", name: "Camila R.", location: "Recife, PE", model: "50 metros", timeAgo: "há 1 mês", text: "Nosso terreno é grande e o sinal Bluetooth dos aparelhos vizinhos não parava de interferir. Com o de 50m o bloqueio passou a cobrir a área toda sem falhar.", accent: true },
  { initial: "T", name: "Thiago A.", location: "Curitiba, PR", model: "15 metros", timeAgo: "há 5 dias", text: "Uso no home office só para bloquear as notificações Bluetooth do celular durante as reuniões. Instalação rápida e já senti a diferença no primeiro dia." },
  { initial: "F", name: "Fernanda M.", location: "Belo Horizonte, MG", model: "25 metros", timeAgo: "há 1 mês", text: "Moro em prédio com bastante interferência de dispositivos Bluetooth dos vizinhos. Depois que instalei, a conexão deles simplesmente para de pegar no meu quarto." },
  { initial: "R", name: "Ricardo S.", location: "Porto Alegre, RS", model: "50 metros", timeAgo: "há 3 semanas", text: "Levo para o sítio nos fins de semana e o bloqueio do sinal funciona bem mesmo em área aberta. A bateria dura o fim de semana inteiro sem precisar recarregar.", accent: true },
  { initial: "J", name: "Juliana P.", location: "Campinas, SP", model: "15 metros", timeAgo: "há 10 dias", text: "Muito simples de configurar, segui o manual e o bloqueio do Bluetooth já funcionou de primeira. Ótimo custo-benefício para quem mora sozinho em apartamento pequeno." },
  { initial: "A", name: "André L.", location: "Goiânia, GO", model: "25 metros", timeAgo: "há 2 meses", text: "Já uso há dois meses sem nenhum problema. O sinal Bluetooth realmente não conecta enquanto está ligado. Recomendo para quem quer uma solução discreta e que funciona de verdade.", accent: true },
];

export function ReviewsSection(){return <section className="nodentec-reviews-v2" id="avaliacoes" aria-labelledby="titulo-avaliacoes">
  <h2 id="titulo-avaliacoes">Avaliações</h2>
  <p className="nodentec-review-count">{totalReviews} avaliações</p>
  <div className="nodentec-rating-summary">
    <div className="nodentec-rating-number"><strong>4,8</strong><div><span>{Array.from({length:5}).map((_,i)=><Star key={i}/>)}</span><small>{totalReviews} avaliações</small></div></div>
    <div className="nodentec-rating-bars">{ratingBreakdown.map(([n,count])=><div key={n}><span>{n}</span><i><b style={{width:`${totalReviews?(count/totalReviews)*100:0}%`}}/></i><small>{count}</small></div>)}</div>
    <div className="nodentec-rating-action"><span><BadgeCheck/> Conteúdo demonstrativo</span><button type="button">Avaliar produto</button></div>
  </div>
  <div className="nodentec-review-label">Em destaque</div>
  <div className="nodentec-review-examples">{examples.map((item)=><article key={item.author}><div>{Array.from({length:5}).map((_,i)=><Star key={i}/>)}</div><blockquote>“{item.text}”</blockquote><strong>— {item.author}</strong><span>{item.location} · {item.model}</span></article>)}</div>
  <div className="nodentec-review-filters"><button className="active">Mais relevantes</button><button>Mais recentes</button><button>Com foto</button></div>
  <div className="nodentec-review-gallery">{[[model25,"Modelo de 25 metros"],[model15,"Modelo de 15 metros"],[model50,"Modelo de 50 metros"]].map(([image,label])=><figure key={String(label)}><Image src={image} alt={String(label)} fill className="object-contain"/><figcaption>{String(label)}</figcaption></figure>)}</div>
  <div className="nodentec-review-grid">{demoReviews.map((review)=><article key={review.name}><header><span className={review.accent?"orange":""}>{review.initial}</span><div><strong>{review.name}</strong><small>{review.location} · {review.model} · {review.timeAgo}</small></div></header><div className="nodentec-review-stars">{Array.from({length:5}).map((_,i)=><Star key={i}/>)}</div><p>{review.text}</p><footer><BadgeCheck/> Avaliação demonstrativa</footer></article>)}</div>
  <p className="nodentec-review-disclaimer">Os textos acima demonstram apenas o layout. Avaliações de compradores serão publicadas somente após verificação do pedido.</p>
</section>}
