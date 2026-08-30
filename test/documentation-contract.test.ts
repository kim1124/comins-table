import { describe, expect, it } from "vitest";

import {
  collectDocumentationContractEvidence,
  loadDocumentationManifest,
  validateDocumentationContract,
} from "../scripts/check-documentation-contract.mjs";

const root = process.cwd();
const manifest = loadDocumentationManifest(root);
const evidence = collectDocumentationContractEvidence(root, manifest);

function validate(nextManifest: typeof manifest) {
  return validateDocumentationContract(root, nextManifest, evidence);
}

describe("documentation contract", () => {
  it("matches the current feature, route, evidence, and public export inventory", () => {
    expect(validate(manifest)).toEqual([]);
  });

  it("fails when a public export loses its documentation classification", () => {
    const nextManifest = structuredClone(manifest);

    for (const classification of Object.values(nextManifest.publicApi.classifications)) {
      const index = classification.indexOf("CominsTable");
      if (index >= 0) classification.splice(index, 1);
    }

    expect(validate(nextManifest)).toContain(
      "root API classification has unclassified values: CominsTable",
    );
  });

  it("fails when a shipped Playground route loses its feature mapping", () => {
    const nextManifest = structuredClone(manifest);
    const pinning = nextManifest.features.find((feature) => feature.id === "column-pinning");

    expect(pinning).toBeDefined();
    pinning!.playgroundRoutes = [];

    const violations = validate(nextManifest);
    expect(violations).toContain("shipped feature has no Playground route: column-pinning");
    expect(violations).toContain(
      "Playground route manifest has unclassified values: column-pinning:/examples/column-pinning",
    );
  });

  it("fails when a shipped guide evidence path does not exist", () => {
    const nextManifest = structuredClone(manifest);
    const pinning = nextManifest.features.find((feature) => feature.id === "column-pinning");

    expect(pinning).toBeDefined();
    pinning!.guides.en = ["docs/user/missing-column-pinning.md"];

    expect(validate(nextManifest)).toContain(
      "missing evidence path for column-pinning: docs/user/missing-column-pinning.md",
    );
  });

  it("fails when a feature claims an API symbol that is not exported", () => {
    const nextManifest = structuredClone(manifest);
    const pinning = nextManifest.features.find((feature) => feature.id === "column-pinning");

    expect(pinning).toBeDefined();
    pinning!.apiSymbols.push("CominsMissingColumnPinningApi");

    expect(validate(nextManifest)).toContain(
      "feature references a non-exported API symbol: CominsMissingColumnPinningApi",
    );
  });

  it("fails when a stylesheet token loses its stability classification", () => {
    const nextManifest = structuredClone(manifest);
    const [token] = nextManifest.cssTokens["public-stable"].splice(0, 1);

    expect(token).toBeDefined();
    expect(validate(nextManifest)).toContain(`CSS token classification has unclassified values: ${token}`);
  });

  it("fails when a TypeScript documentation block loses its annotation", () => {
    const nextEvidence = structuredClone(evidence);
    const example = nextEvidence.docExamples.find((candidate) => candidate.kind === "compile");

    expect(example).toBeDefined();
    example!.kind = "missing";

    expect(validateDocumentationContract(root, manifest, nextEvidence)).toContain(
      `TypeScript example is missing annotation: ${example!.path}:${example!.line}`,
    );
  });

  it("fails when a structured restriction points to a guide without its marker", () => {
    const nextManifest = structuredClone(manifest);
    nextManifest.restrictions["client-only"] = ["docs/user/02-data-and-crud.md"];

    expect(validate(nextManifest)).toContain(
      "guide is missing restriction marker client-only: docs/user/02-data-and-crud.md",
    );
  });
});
