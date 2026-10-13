import { smoke } from "./consumer";
self.onmessage = () => { void smoke().then(rows => self.postMessage({ rows }), () => self.postMessage({ error: true })); };
