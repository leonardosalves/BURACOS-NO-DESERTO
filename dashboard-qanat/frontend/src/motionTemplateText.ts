import { repairMojibake, repairMojibakeDeep } from "./textEncoding.ts";

const NUMERIC_MOTION_TEMPLATES = new Set([
  "odometer-digit-roll",
  "gauge-readout-moves",
  "particle-sand-fill",
  "autolayout-gap-dial",
  "crane-rise-reveal",
  "impact-feedback",
  "circular-progress",
]);

function motionProps(props: Record<string, unknown> | null | undefined) {
  const root = props && typeof props === "object" ? props : {};
  const shot = root.motion_shot;
  const nested =
    shot && typeof shot === "object" &&
    (shot as Record<string, unknown>).props &&
    typeof (shot as Record<string, unknown>).props === "object"
      ? ((shot as Record<string, unknown>).props as Record<string, unknown>)
      : {};
  return repairMojibakeDeep({ ...nested, ...root });
}

function clean(value: unknown) {
  return repairMojibake(String(value ?? "")).trim();
}

export function resolveMotionTemplateText(
  templateId: string | null | undefined,
  props: Record<string, unknown> | null | undefined
) {
  const p = motionProps(props);
  const rawValue = p.value ?? p.valor;
  const hasNumericValue =
    rawValue !== null && rawValue !== undefined && clean(rawValue) !== "";
  const isNumeric = NUMERIC_MOTION_TEMPLATES.has(String(templateId || "")) || hasNumericValue;
  const prefix = clean(p.prefix);
  const unit = clean(p.suffix || p.unit || p.unidade);
  const title = clean(p.title || p.text);
  const label = clean(p.label);
  const subtitle = clean(p.subtitle);

  const primary = isNumeric
    ? hasNumericValue
      ? `${prefix}${clean(rawValue)}${unit}`
      : title
    : title || label;
  const secondary = subtitle || (label && label !== primary ? label : "");

  return { primary, secondary, props: p, isNumeric };
}

export function updateMotionTemplatePrimaryText(
  templateId: string | null | undefined,
  props: Record<string, unknown> | null | undefined,
  text: string
) {
  const resolved = resolveMotionTemplateText(templateId, props);
  const value = repairMojibake(text);
  if (resolved.isNumeric) {
    if (!value.trim()) {
      return {
        ...resolved.props,
        value: "",
        prefix: "",
        unit: "",
        suffix: "",
        title: "",
        text: "",
      };
    }
    const match = value.trim().match(/^([^\d+-]*)([-+]?\d+(?:[.,]\d+)?)(.*)$/u);
    if (match) {
      const numeric = Number(match[2].replace(",", "."));
      return {
        ...resolved.props,
        value: Number.isFinite(numeric) ? numeric : match[2],
        prefix: match[1].trim(),
        unit: match[3].trim(),
        suffix: "",
      };
    }
  }
  return {
    ...resolved.props,
    title: value,
    text: value,
    ...(clean(resolved.props.label) === resolved.primary ? { label: value } : {}),
  };
}

export function updateMotionTemplateSecondaryText(
  templateId: string | null | undefined,
  props: Record<string, unknown> | null | undefined,
  text: string
) {
  const resolved = resolveMotionTemplateText(templateId, props);
  const value = repairMojibake(text);
  return resolved.isNumeric
    ? { ...resolved.props, subtitle: value, label: value }
    : { ...resolved.props, subtitle: value };
}
