import assert from "node:assert/strict";
import test from "node:test";

import { prepareVoiceboxExpressiveText } from "./voiceboxTts.js";

test("prepareVoiceboxExpressiveText não confunde início de palavra com a.C.", () => {
  assert.equal(
    prepareVoiceboxExpressiveText(
      "O transe da sacerdotisa parecia divino, mas resultava de química e acústica."
    ),
    "O transe da sacerdotisa parecia divino, mas resultava de química e acústica."
  );

  assert.equal(
    prepareVoiceboxExpressiveText(
      "O projeto acústico analisou ação, acesso, acidentes e acordes."
    ),
    "O projeto acústico analisou ação, acesso, acidentes e acordes."
  );
});

test("prepareVoiceboxExpressiveText ainda expande eras históricas isoladas", () => {
  assert.equal(
    prepareVoiceboxExpressiveText("O templo foi erguido em 305 a.C."),
    "O templo foi erguido em trezentos e cinco antes de Cristo"
  );
});
