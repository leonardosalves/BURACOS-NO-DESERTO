// 字符坠落堆积（letter-drop-physics）——FallingLetterAnimation。
// "GRAVITY" 7 字符各自绝对定位，第 i 字符从帧 10+i*5 起下落：
// ① 重力加速 y = D*(t/24)^2 掉 720px 到基线（地板线可见）；
// ② 落地后 2 次衰减弹跳（高度 30% / 9%，抛物线 4u(1-u) 拼段），
//    落地瞬间 rotate 到 seed hash ±6° 小歪角并保持；
// ③ 帧 110 一拍：6f ease-out 全体齐整回正（rotate→0、偏移→0、scale 1.06→1），
//    帧 116–150 真静止（≥25f）收尾。
import React from "react";
import { useCurrentFrame, Easing } from "remotion";
import { G } from "../_fixtures/Fixtures";

// 确定性伪随机
const h = (n: number) => {
  const s = Math.sin(n * 127.3) * 43758.5453;
  return s - Math.floor(s);
};

const REST_TOP = 452; // 字符落定后的 top
const FLOOR_Y = REST_TOP + 152; // 地板线（视觉基线）

const DROP = 720; // 下落距离
const T_FALL = 24; // 落到基线用时
const T_B1 = 16; // 第一次弹跳时长（高 30%）
const T_B2 = 8; // 第二次弹跳时长（高 9%）
const SNAP = 110; // 齐整回正的一拍
const SNAP_DUR = 6;

const easeOutCubic = Easing.out(Easing.cubic);
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

// 单字符纵向位移（相对基线，负 = 在上方）
const dropY = (t: number): number => {
  if (t <= 0) return -DROP;
  if (t < T_FALL) return -DROP + DROP * (t / T_FALL) ** 2; // 重力加速
  if (t < T_FALL + T_B1) {
    const u = (t - T_FALL) / T_B1;
    return -DROP * 0.3 * 4 * u * (1 - u); // 弹跳 1：30%
  }
  if (t < T_FALL + T_B1 + T_B2) {
    const u = (t - T_FALL - T_B1) / T_B2;
    return -DROP * 0.09 * 4 * u * (1 - u); // 弹跳 2：9%
  }
  return 0;
};

export const LetterDropPhysics: React.FC<{ title?: string; text?: string; label?: string; subtitle?: string }> = ({
  title,
  text,
  label,
  subtitle,
}) => {
  const frame = useCurrentFrame();
  const word = String(title || text || label || "GRAVITY").slice(0, 24);
  const font = Math.max(56, Math.min(140, 1100 / Math.max(1, word.length)));
  const slotWidth = font + 10;
  const wordWidth = word.length * slotWidth;
  const left = (1920 - wordWidth) / 2;
  const secondaryText = String(subtitle || "").trim();
  // Frases longas usam um stagger menor para que a última letra também
  // complete queda + bounce dentro dos 120 frames naturais do template.
  // Palavras curtas preservam a cadência original. Em frases longas, todas as
  // entradas são distribuídas nos primeiros 12 frames, deixando mais da metade
  // da duração natural para a frase permanecer completamente assentada.
  const stagger = word.length <= 8
    ? 5
    : 12 / Math.max(1, word.length - 1);
  const firstStart = 4;
  const lastSettledFrame = firstStart + Math.max(0, word.length - 1) * stagger + T_FALL + T_B1 + T_B2;
  const snapFrame = Math.min(SNAP, lastSettledFrame + 4);
  const snap = easeOutCubic(clamp01((frame - snapFrame) / SNAP_DUR));

  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        background: G.bg,
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* 地板线：字符落点的视觉基线 */}
      <div
        style={{
          position: "absolute",
          left: left - 60,
          top: FLOOR_Y,
          width: wordWidth + 120,
          height: 6,
          background: G.bar,
          borderRadius: 3,
        }}
      />

      {secondaryText && secondaryText !== word ? (
        <div
          style={{
            position: "absolute",
            left: 360,
            right: 360,
            top: FLOOR_Y + 34,
            color: G.mid,
            fontFamily: "Helvetica, Arial, sans-serif",
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: 8,
            textAlign: "center",
            textTransform: "uppercase",
            opacity: snap,
          }}
        >
          {secondaryText}
        </div>
      ) : null}

      {word.split("").map((ch, i) => {
        const start = firstStart + i * stagger;
        const t = frame - start;
        const y = dropY(t);
        // 落地瞬间歪到 seed 小角度（±6°），落地前为 0
        const tiltTarget = (h(i + 1) - 0.5) * 12;
        const landP = clamp01((t - T_FALL) / 6);
        const restJitter = (h(i + 11) - 0.5) * 10; // 落定后的 ±5px 竖向错位
        // snap 一拍：歪角与错位齐整归零，scale 1.06→1 脉冲
        const rot = tiltTarget * landP * (1 - snap);
        const jitter = restJitter * landP * (1 - snap);
        const scale = frame < snapFrame ? 1 : 1 + 0.06 * (1 - snap);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: left + i * slotWidth,
              top: REST_TOP,
              width: slotWidth,
              height: font,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              transform: `translateY(${y + jitter}px) rotate(${rot}deg) scale(${scale})`,
              transformOrigin: "50% 100%",
              fontFamily: "Helvetica, Arial, sans-serif",
              fontWeight: 800,
              fontSize: font,
              lineHeight: 1,
              color: G.ink,
            }}
          >
            {ch}
          </div>
        );
      })}
    </div>
  );
};
