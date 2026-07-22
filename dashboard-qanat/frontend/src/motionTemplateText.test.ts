import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveMotionTemplateText,
  updateMotionTemplatePrimaryText,
  updateMotionTemplateSecondaryText,
} from "./motionTemplateText.ts";

test("resolve o texto visivel do odometro", () => {
  const text = resolveMotionTemplateText("odometer-digit-roll", {
    value: 300,
    unit: "m",
    label: "Altura sobre o CÃ¢nion",
  });
  assert.equal(text.primary, "300m");
  assert.equal(text.secondary, "Altura sobre o Cânion");
});

test("resolve propriedades aninhadas do motion_shot", () => {
  const text = resolveMotionTemplateText("odometer-digit-roll", {
    motion_shot: { props: { value: 666, unit: "m", label: "Altura" } },
  });
  assert.equal(text.primary, "666m");
  assert.equal(text.secondary, "Altura");
});

test("edita valor/unidade e label sem trocar a semantica do odometro", () => {
  const primary = updateMotionTemplatePrimaryText(
    "odometer-digit-roll",
    { value: 666, unit: "m", label: "Altura" },
    "300m"
  );
  const secondary = updateMotionTemplateSecondaryText(
    "odometer-digit-roll",
    primary,
    "Altura sobre o Cânion"
  );
  assert.equal(primary.value, 300);
  assert.equal(primary.unit, "m");
  assert.equal(primary.label, "Altura");
  assert.equal(secondary.label, "Altura sobre o Cânion");
});

test("preserva espaços e sincroniza label legado de template textual", () => {
  const props = updateMotionTemplatePrimaryText(
    "type-entrance-moves",
    { title: "GRAVITY", text: "GRAVITY", label: "GRAVITY" },
    "Ponte do Rio Danxui"
  );
  assert.equal(props.title, "Ponte do Rio Danxui");
  assert.equal(props.text, "Ponte do Rio Danxui");
  assert.equal(props.label, "Ponte do Rio Danxui");
  assert.equal(resolveMotionTemplateText("type-entrance-moves", props).secondary, "");
});
