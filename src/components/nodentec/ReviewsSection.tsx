import Image from "next/image";
import { BadgeCheck, Star } from "lucide-react";
import model15 from "@/lib/1-frontal.jpg";
import model25 from "@/lib/1-frontal (1).jpg";
import model50 from "@/lib/1-frontal (2).jpg";

const examples = [
  { text: "Meu vizinho de cima ligava a caixa de som Bluetooth até tarde quase todo fim de semana. Com o de 25m a caixa dele simplesmente parou de tocar aqui em casa. Demora alguns segundos para agir, mas funciona mesmo.", author: "Marcelo R.", location: "Sorocaba, SP", model: "25 metros" },
  { text: "Peguei o menor porque era só para a caixa de som do quarto do meu filho, que ficava ligada até tarde. Chegou bem embalado e foi fácil de configurar. Pelo tamanho achei que não ia dar conta do cômodo inteiro, mas deu.", author: "Débora C.", location: "Contagem, MG", model: "15 metros" },
  { text: "Minha casa é de esquina e a caixa de som do bar ao lado tocava até de madrugada. Testei no quintal e o bloqueio cortou o Bluetooth dela direitinho. O estojo também é bom para guardar tudo junto.", author: "Leandro V.", location: "Maringá, PR", model: "50 metros" },
];
const ratingBreakdown: [number, number][] = [[5, 3423], [4, 1141], [3, 0], [2, 0], [1, 0]];
const totalReviews = ratingBreakdown.reduce((sum, [, count]) => sum + count, 0);
const demoReviews = [
  { initial: "L", name: "Luana E.", location: "Vitória, ES", model: "15 metros", timeAgo: "há 2 semanas", text: "Comprei para minha mãe, que tinha uma vizinha com a caixa de som ligada o dia inteiro. Expliquei uma vez e ela conseguiu ligar sozinha. A caixa parou de tocar no mesmo dia.", accent: true },
  { initial: "S", name: "Samuel N.", location: "Joinville, SC", model: "25 metros", timeAgo: "há 16 dias", text: "Uso para cortar a caixa de som que o pessoal do apartamento de baixo liga nos fins de semana. As antenas ficam firmes e o aparelho não esquenta, mesmo ligado várias horas." },
  { initial: "P", name: "Paulo C.", location: "Uberlândia, MG", model: "25 metros", timeAgo: "há 3 semanas", text: "Foi só encaixar as antenas e ligar. Nos primeiros testes mexi na direção até achar a melhor posição para cortar a caixa de som do vizinho de ponta a ponta do apartamento. Depois ficou perfeito." },
  { initial: "C", name: "Camila R.", location: "Recife, PE", model: "50 metros", timeAgo: "há 1 mês", text: "Nosso terreno é grande e a caixa de som da casa vizinha tocava até em dia de semana. Com o de 50m o bloqueio passou a cobrir o quintal todo sem falhar.", accent: true },
  { initial: "T", name: "Thiago A.", location: "Curitiba, PR", model: "15 metros", timeAgo: "há 5 dias", text: "Uso no home office só para cortar a caixa de som Bluetooth que o vizinho do lado liga nas reuniões. Instalação rápida e já senti a diferença no primeiro dia." },
  { initial: "F", name: "Fernanda M.", location: "Belo Horizonte, MG", model: "25 metros", timeAgo: "há 1 mês", text: "Moro em prédio e tinha uma caixa de som tocando alto quase toda noite lá embaixo. Depois que instalei, ela simplesmente não conecta mais perto do meu quarto." },
  { initial: "R", name: "Ricardo S.", location: "Porto Alegre, RS", model: "50 metros", timeAgo: "há 3 semanas", text: "Levo para o sítio nos fins de semana, onde sempre tem alguém com caixa de som ligada por perto. Funciona bem mesmo em área aberta e a bateria dura o fim de semana inteiro.", accent: true },
  { initial: "J", name: "Juliana P.", location: "Campinas, SP", model: "15 metros", timeAgo: "há 10 dias", text: "Muito simples de configurar, segui o manual e já cortou a caixa de som do corredor de primeira. Ótimo custo-benefício para quem mora sozinho em apartamento pequeno." },
  { initial: "A", name: "André L.", location: "Goiânia, GO", model: "25 metros", timeAgo: "há 2 meses", text: "Já uso há dois meses sem nenhum problema. A caixa de som do vizinho realmente não conecta enquanto o aparelho está ligado. Recomendo para quem quer uma solução discreta e que funciona de verdade.", accent: true },
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
