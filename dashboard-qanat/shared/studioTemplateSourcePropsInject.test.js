import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  injectCatalogTemplateSources,
  injectStudioPropsContract,
} from "./studioTemplateSourcePropsInject.js";

describe("studioTemplateSourcePropsInject", () => {
  it("adiciona props ao export default", () => {
    const src = `export default function Demo() {
  const frame = useCurrentFrame();
  return <div>{"Main Content"}</div>;
}`;
    const out = injectStudioPropsContract(src);
    assert.match(out, /function Demo\(props = \{\}\)/);
  });

  it("injeta em short/long do catálogo", () => {
    const tpl = injectCatalogTemplateSources({
      id: "x",
      sourceCode: {
        short: 'export default function A() { return "Speaker"; }',
        long: 'export default function A() { return "Speaker"; }',
      },
    });
    assert.match(tpl.sourceCode.short, /props = \{\}/);
  });
});
