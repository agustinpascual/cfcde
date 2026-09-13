import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as protocolo from '../src/lib/axxonpay-protocolo.ts';
import * as mensagens from '../src/lib/mensagens-recuperacao.ts';
function carregar(path,deps){const exports={};vm.runInNewContext(ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:id=>{if(id==='server-only')return{};if(!(id in deps))throw new Error(id);return deps[id];},AbortSignal,Date,URL,Response,console,process:{env:{NEXT_PUBLIC_SITE_URL:"https://loja.example"}}});return exports;}
const pedido={pix_id:'axxon_teste-123',referencia:'123456',valor_centavos:8500};
for(const status of ['PENDING','FINISHED','PAID','EXPIRED','REFUNDED','DESCONHECIDO'])test(`Pix Axxon ${status}: lembrete somente quando confirmado pendente`,async()=>{
 const mod=carregar('src/lib/recuperacao-pix-status.ts',{'./axxonpay':{consultarPagamentoAxxon:async()=>({id:'teste-123',method:'pix',status,amount:8500})},'./axxonpay-protocolo':protocolo,'./pinpay':{}});
 assert.equal(await mod.pixAindaPendente(pedido),status==='PENDING');
});
test('Pix expirado, valor divergente e falha de rede não autorizam mensagem',async()=>{
 for(const variante of ['expirado','valor','rede']){
 const mod=carregar('src/lib/recuperacao-pix-status.ts',{'./axxonpay':{consultarPagamentoAxxon:async()=>{if(variante==='rede')throw new Error('offline');return{id:'teste-123',method:'pix',status:'PENDING',amount:variante==='valor'?1:8500,expiresAt:new Date(Date.now()-1000).toISOString()};}},'./axxonpay-protocolo':protocolo,'./pinpay':{}});
 if(variante==='expirado')assert.equal(await mod.pixAindaPendente(pedido),false);else await assert.rejects(mod.pixAindaPendente(pedido));
 }
});
test('PinPay aceita somente mesmo ID, valor, referência e status pending',async()=>{
 for(const pagamento of [{id:'pin-123',amount:8500,status:'pending'},{id:'pin-123',amount:8500,status:'approved'},{id:'outro',amount:8500,status:'pending'},{id:'pin-123',amount:1,status:'pending'}]){
 const mod=carregar('src/lib/recuperacao-pix-status.ts',{'./axxonpay':{},'./axxonpay-protocolo':protocolo,'./pinpay':{consultarPix:async()=>pagamento}});
 if(pagamento.id!=='pin-123'||pagamento.amount!==8500)await assert.rejects(mod.pixAindaPendente({...pedido,pix_id:'pin-123'}));else assert.equal(await mod.pixAindaPendente({...pedido,pix_id:'pin-123'}),pagamento.status==='pending');
 }
});
function fluxo({pendente=true,antigo=false,ativo=false,token='assinatura',carrinho=false}={}){
 const ago=m=>new Date(Date.now()-m*60000).toISOString();const tables={pedidos:carrinho?[]:[{...pedido,id:'pedido-db',status:'pendente',metodo_pagamento:'pix',cliente_telefone:'11999999999',cliente_nome:'Teste',pix_copia_cola:'codigo-teste',recuperacao_pix_em:null,recuperacao_pix_tentativas:0,criado_em:ago(antigo?200:20)}],sessoes:carrinho?[{sessao:'sessao-testes',pedido_ref:null,recuperacao_carrinho_em:null,recuperacao_carrinho_tentativas:0,criado_em:ago(20),visto_em:ago(ativo?1:20)}]:[],eventos:carrinho?[{sessao:'sessao-testes',tipo:'checkout_parcial',criado_em:ago(20),dados:{telefone:'11999999999',nome:'Teste'}}]:[]};
 let envios=0,consultas=0;
 const db={from(table){let filtros=[],mudanca;const q={select(){return q;},eq(k,v){filtros.push(x=>x[k]===v);return q;},is(k,v){filtros.push(x=>x[k]===v);return q;},in(k,v){filtros.push(x=>v.includes(x[k]));return q;},gte(k,v){filtros.push(x=>x[k]>=v);return q;},lte(k,v){filtros.push(x=>x[k]<=v);return q;},order(){return q;},limit(){return q;},update(v){mudanca=v;return q;},then(resolve,reject){try{const data=tables[table].filter(x=>filtros.every(f=>f(x)));if(mudanca)data.forEach(x=>Object.assign(x,mudanca));return Promise.resolve({data,error:null}).then(resolve,reject);}catch(e){return Promise.reject(e).then(resolve,reject);}},async maybeSingle(){const r=await q;return{data:r.data[0]??null,error:null};}};return q;}};
 const mod=carregar('src/lib/recuperacao-whatsapp.ts',{'./carrinho-recuperacao':{criarTokenRecuperacaoCarrinho:()=>token},'./config-integracoes':{ler:async key=>key.includes('MINUTOS')?'10':key==='WHATSAPP_PIX_BOTAO_COPIAR'?'0':null},'./mensagens-recuperacao':mensagens,'./robo':{enviarWhatsApp:async()=>{envios++;},enviarWhatsAppComBotaoCopiar:async()=>{envios++;}},'./supabase/servidor':{supabaseAdmin:()=>db},'./recuperacao-pix-status':{pixAindaPendente:async()=>{consultas++;if(pendente instanceof Error)throw pendente;return pendente;}}});
 return{run:()=>mod.processarRecuperacoesWhatsApp(ago(60)),stats:()=>({envios,consultas,tables})};
}
test('Pix já pago no gateway não reserva nem envia recuperação',async()=>{const f=fluxo({pendente:false});await f.run();assert.equal(f.stats().envios,0);assert.equal(f.stats().tables.pedidos[0].recuperacao_pix_em,null);});
test('Pix pendente envia uma vez e não repete no ciclo seguinte',async()=>{const f=fluxo();await f.run();await f.run();assert.equal(f.stats().envios,1);assert.equal(f.stats().consultas,1);});
test('gateway indisponível deixa recuperação para nova conferência',async()=>{const f=fluxo({pendente:new Error('offline')});await f.run();assert.equal(f.stats().envios,0);assert.equal(f.stats().tables.pedidos[0].recuperacao_pix_tentativas,1);assert.equal(f.stats().tables.pedidos[0].recuperacao_pix_em,null);});
test('marco inicial exclui pedidos antigos da reativação',async()=>{const f=fluxo({antigo:true});await f.run();assert.equal(f.stats().envios,0);assert.equal(f.stats().consultas,0);});
test('carrinho ainda ativo não recebe lembrete',async()=>{const f=fluxo({carrinho:true,ativo:true});await f.run();assert.equal(f.stats().envios,0);});
test('carrinho sem assinatura não é marcado como enviado',async()=>{const f=fluxo({carrinho:true,token:null});await f.run();assert.equal(f.stats().envios,0);assert.equal(f.stats().tables.sessoes[0].recuperacao_carrinho_em,null);});
test('carrinho abandonado envia uma vez com token válido',async()=>{const f=fluxo({carrinho:true});await f.run();await f.run();assert.equal(f.stats().envios,1);});
