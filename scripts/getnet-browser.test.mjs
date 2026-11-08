import test from 'node:test';
import assert from 'node:assert/strict';
import {inicializarSdkAxxon,prepararCartaoAxxon} from '../src/lib/axxonpay-browser.ts';
const card={numero:'4111111111111111',titular:'TESTE',mes:2,ano:2032,cvv:'123'};
test('Getnet sends only the vaulted token to the merchant backend',async()=>{
 let input;const sdk={encrypt:async value=>{input=value;return 'GN.test-token';}};
 assert.deepEqual(await prepararCartaoAxxon('token',sdk,card),{cardHash:'GN.test-token'});
 assert.equal(input.expMonth,'02');assert.equal(input.expYear,'2032');
 assert.equal(JSON.stringify(await prepararCartaoAxxon('token',sdk,card)).includes(card.numero),false);
 assert.deepEqual(await prepararCartaoAxxon('cru',sdk,card),{cartao:card});
 await assert.rejects(prepararCartaoAxxon('token',{encrypt:async()=>''},card));
});
test('SDK initialization preserves fingerprint across concurrent calls and retries',async()=>{
 let calls=0;const sdk={setPublicKey:async()=>{calls++;}};
 await Promise.all([inicializarSdkAxxon(sdk,'pk'),inicializarSdkAxxon(sdk,'pk')]);
 await inicializarSdkAxxon(sdk,'pk');assert.equal(calls,1);
 let failed=true;const retry={setPublicKey:async()=>{if(failed){failed=false;throw Error('network');}}};
 await assert.rejects(inicializarSdkAxxon(retry,'pk'));await inicializarSdkAxxon(retry,'pk');
});
