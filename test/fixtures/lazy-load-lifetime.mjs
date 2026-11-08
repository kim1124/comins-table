import assert from 'node:assert/strict';
import { setImmediate, setTimeout } from 'node:timers/promises';
import { settleRequestCompletion, createViewportRequestExecutor } from '../../src/browser/viewport-requests.ts';
let finish;
const source = new Promise(resolve => { finish = resolve; });
function request() { return source; }
async function retire() {
  const owner = { payload: ['retired consumer'] };
  const reference = new WeakRef(owner);
  if (process.argv[2] === 'viewport') {
    const executor = createViewportRequestExecutor({ onRequest: request, onSettled() { owner.payload.push('settled'); } });
    executor.start({ requestId: 'r', revision: 'a', startIndex: 0, endIndex: 1, retainRange: { startIndex: 0, endIndex: 1 } });
    for (let i = 0; i < 8; i++) await Promise.resolve();
    executor.dispose();
  } else {
    const controller = new AbortController();
    const abortOwned = () => controller.abort();
    const waiting = settleRequestCompletion(source, controller.signal, () => { owner.payload.push('settled'); });
    abortOwned();
    await waiting;
  }
  return reference;
}
const reference = await retire();
await setTimeout(100);
for (let index = 0; index < 3; index++) { await setImmediate(); globalThis.gc(); }
await setImmediate();
const retained = Boolean(reference.deref());
console.log(JSON.stringify({retainedBeforeSourceSettlement:retained}));
finish();
assert.equal(retained, false, 'disposed request must release its completion owner before source settlement');
