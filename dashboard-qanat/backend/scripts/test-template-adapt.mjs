const originalCode = `"use client";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
export default function CircularProgress() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = interpolate(frame, [0, fps * 2], [0, 78], { extrapolateRight: "clamp" });
  return <AbsoluteFill><div>{Math.round(p)}</div></AbsoluteFill>;
}`;

const res = await fetch("http://127.0.0.1:3005/api/ai/template-studio/adapt", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    niche: "Engenharia",
    templateType: "Circular Progress",
    propsInput: "progress,label",
    briefing: "test",
    originalCode,
  }),
});
console.log("status", res.status);
console.log("content-type", res.headers.get("content-type"));
const text = await res.text();
console.log(text.slice(0, 400));
