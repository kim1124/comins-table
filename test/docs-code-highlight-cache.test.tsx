import { renderToStaticMarkup } from "react-dom/server";
import { Highlight, Prism, themes } from "prism-react-renderer";
import { execFileSync } from "node:child_process";
import { afterEach, expect, it, vi } from "vitest";
import { CodeExample } from "../example/src/components/docs/CodeExample";
import type { DocsCodeSample } from "../example/src/docs/types";

function Reference({ sample }: { sample: DocsCodeSample }) {
  return <section aria-label={sample.title} className="docs-code">
    <div className="docs-code__header"><span>{sample.title}</span><span>{sample.language}</span></div>
    <Highlight code={sample.code.trim()} language={sample.language} theme={themes.github}>
      {({ className, style, tokens, getLineProps, getTokenProps }) =>
        <pre className={`${className} docs-code__pre`} style={style}>{tokens.map((line, index) =>
          <div key={index} {...getLineProps({ className: "docs-code__line", line })}>
            <span className="docs-code__line-number">{index + 1}</span>
            <span className="docs-code__line-content">{line.map((token, i) =>
              <span key={i} {...getTokenProps({ token })} />)}</span>
          </div>)}</pre>}
    </Highlight>
  </section>;
}
const render = (sample: DocsCodeSample) => renderToStaticMarkup(<CodeExample sample={sample} />);
afterEach(() => vi.restoreAllMocks());

it("tokenizes an unchanged document sample once across fifty remounts", () => {
  const sample: DocsCodeSample = { code: "const count: number = 42;", language: "ts", title: "Cache" };
  const tokenize = vi.spyOn(Prism.hooks, "run");
  const first = render(sample);
  for (let i = 0; i < 49; i++) expect(render(sample)).toBe(first);
  expect(tokenize.mock.calls.filter(([name]) => name === "before-tokenize")).toHaveLength(1);
});

it.each([
  ["ts", "const n: number = 42; // comment"],
  ["tsx", "<button disabled={false}>A & B</button>"],
  ["css", ".x { color: red; opacity: .5; }"],
  ["bash", "npm install comins-table"],
  ["tsx", "<div title=\"value\">{a ? <span/> : null}</div>"],
  ["ts", "a\r\n\r\nb\rc"],
  ["ts", ""],
  ["ts", "\n\n"],
  ["tsx", "<script>alert(1)</script><img src=x onerror=alert(2)> &"],
  ["unknown", "plain < > & text"],
])("preserves Highlight markup, escaping and token styles for %s: %s", (language, code) => {
  const sample = { code, language: language as DocsCodeSample["language"], title: "<Title>" };
  expect(render(sample)).toBe(renderToStaticMarkup(<Reference sample={sample} />));
});

it("invalidates changed code/language while title-only changes retain tokenization", () => {
  const sample: DocsCodeSample = { code: "const n = 1", language: "ts", title: "Original" };
  const tokenize = vi.spyOn(Prism.hooks, "run");
  render(sample);
  sample.title = "Localized";
  expect(render(sample)).toContain("Localized");
  expect(tokenize.mock.calls.filter(([name]) => name === "before-tokenize")).toHaveLength(1);
  sample.code = "const n = 2";
  render(sample);
  expect(tokenize.mock.calls.filter(([name]) => name === "before-tokenize")).toHaveLength(2);
  sample.language = "tsx";
  render(sample);
  expect(tokenize.mock.calls.filter(([name]) => name === "before-tokenize")).toHaveLength(3);
  tokenize.mockRestore();
  expect(render(sample)).toBe(renderToStaticMarkup(<Reference sample={sample} />));
});

it("preserves custom tokenization hook execution instead of caching its side effects", () => {
  const sample: DocsCodeSample = { code: "const hookValue = 1", language: "ts", title: "Hooks" };
  render(sample);
  let calls = 0;
  const hook = () => { calls++; };
  const hooks = Prism.hooks as typeof Prism.hooks & { all: Record<string, Array<(...args: never[]) => void>> };
  Prism.hooks.add("after-tokenize", hook);
  try { render(sample); render(sample); expect(calls).toBe(2); }
  finally {
    const list = hooks.all["after-tokenize"]!;
    list.splice(list.indexOf(hook), 1);
  }
});

it("does not retain a discarded sample even while its highlighted value remains referenced", () => {
  const moduleURL = new URL("../example/src/components/docs/codeHighlight.ts", import.meta.url).href;
  const script = `import { getCodeHighlight } from ${JSON.stringify(moduleURL)};
    let sample = {code: "const weakKey = 1", language: "ts", title: "Weak"};
    const weak = new WeakRef(sample), value = getCodeHighlight(sample);
    if (weak.deref() !== sample) throw Error("positive control");
    sample = null;
    for(let i=0;i<4;i++){await new Promise(setImmediate); global.gc();}
    if(weak.deref()!==undefined) throw Error("sample key retained");
    if(!value.lines.length) throw Error("value unavailable");
    console.log("WEAK_KEY_RELEASED");`;
  expect(execFileSync(process.execPath, ["--expose-gc", "--input-type=module", "-e", script],
    { encoding: "utf8" })).toContain("WEAK_KEY_RELEASED");
});
