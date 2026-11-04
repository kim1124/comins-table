import type { CSSProperties } from "react";
import { normalizeTokens, Prism, themes, type EnvConfig, type PrismGrammar, type Token } from "prism-react-renderer";
import type { DocsCodeSample } from "../../docs/types";

type HighlightedToken = { content: string; className: string; style?: CSSProperties };
type HighlightedCode = {
  className: string;
  style: CSSProperties;
  lineStyle: CSSProperties;
  lines: HighlightedToken[][];
};
type CacheEntry = { code: string; language: string; grammar?: PrismGrammar; result: HighlightedCode };
// 샘플의 수명만 따른다. DOM·React 요소·샘플 자체를 value에 보관하지 않는다.
const cache = new WeakMap<DocsCodeSample, CacheEntry>();
const hookNames = ["before-tokenize", "after-tokenize"] as const;
const hooks = Prism.hooks as typeof Prism.hooks & { all: Record<string, unknown[]> };
const builtInHooks = hookNames.map(name => [...(hooks.all[name] ?? [])]);

function hasBuiltInHooks() {
  return hookNames.every((name, index) => {
    const current = hooks.all[name] ?? [], original = builtInHooks[index]!;
    return current.length === original.length && current.every((hook, i) => hook === original[i]);
  });
}

function highlight(code: string, language: string, grammar?: PrismGrammar): HighlightedCode {
  let lines: Token[][];
  if (grammar) {
    const env: EnvConfig = { code, language, grammar, tokens: [] };
    Prism.hooks.run("before-tokenize", env);
    env.tokens = Prism.tokenize(code, grammar);
    Prism.hooks.run("after-tokenize", env);
    lines = normalizeTokens(env.tokens);
  } else lines = normalizeTokens([code]);

  const theme = themes.github;
  const styles = new Map<string, CSSProperties>();
  for (const rule of theme.styles) {
    if (rule.languages && !rule.languages.includes(language)) continue;
    for (const type of rule.types) styles.set(type, { ...styles.get(type), ...rule.style });
  }
  styles.set("plain", { ...theme.plain, backgroundColor: undefined });
  const tokenStyle = (token: Token): CSSProperties | undefined => {
    if (token.types.length === 1 && token.types[0] === "plain") {
      return token.empty != null ? { display: "inline-block" } : undefined;
    }
    if (token.types.length === 1 && token.empty != null) return styles.get(token.types[0]!);
    return Object.assign(token.empty != null ? { display: "inline-block" } : {},
      ...token.types.map(type => styles.get(type)));
  };
  return {
    className: `prism-code language-${language}`,
    style: { ...theme.plain },
    lineStyle: { ...styles.get("plain") },
    lines: lines.map(line => line.map(token => ({
      content: token.content,
      className: ["token", ...token.types].filter(Boolean).join(" "),
      style: tokenStyle(token),
    }))),
  };
}

export function getCodeHighlight(sample: DocsCodeSample): HighlightedCode {
  const code = sample.code.trim(), language = sample.language.toLowerCase();
  const grammar = Prism.languages[language], reusable = hasBuiltInHooks(), previous = cache.get(sample);
  if (reusable && previous?.code === code && previous.language === language && previous.grammar === grammar) {
    return previous.result;
  }
  const result = highlight(code, language, grammar);
  // 외부 hook의 실행·부수효과는 기존 Highlight처럼 매번 유지한다.
  if (reusable) cache.set(sample, { code, language, grammar, result });
  return result;
}
