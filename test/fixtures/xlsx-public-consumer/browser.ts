import { createApp, h, ref } from "vue";
import { smoke } from "./consumer";
const result = ref("pending");
createApp({ setup: () => () => h("div", { id: "vue-result" }, result.value) }).mount("#app");
void smoke().then(rows => { result.value = JSON.stringify(rows); }, () => { result.value = "failed"; });
const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
worker.onmessage = event => { document.querySelector("#worker-result")!.textContent = JSON.stringify(event.data); worker.terminate(); };
worker.onerror = () => { document.querySelector("#worker-result")!.textContent = "failed"; worker.terminate(); };
worker.postMessage("start");
