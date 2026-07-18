import React, { useEffect, useState } from "react";
import type { CaptionModeId } from "./captionConfig";
import { isWordByWordMode } from "./captionConfig";
import { getCaptionPreviewMetrics } from "./captionPreviewScale";

type CaptionPreviewProps = {
  format: "short" | "long";
  mode: CaptionModeId;
  accentColor?: string;
  bgmPulse?: boolean;
  maxLines?: 1 | 2;
  maxWordsPerChunk?: number;
  className?: string;
};

/**
 * Frases realistas para preview — permitem ver como a legenda
 * fica em contexto real com múltiplas palavras e 2 linhas.
 */
const SHORT_SENTENCE = [
  "Sem",
  "esse",
  "rio",
  "o",
  "Egito",
  "seria",
  "completamente",
  "diferente",
];
const LONG_SENTENCE = [
  "A",
  "física",
  "quântica",
  "desafia",
  "tudo",
  "que",
  "sabemos",
];

const SCRAMBLE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function scramblePreview(text: string, progress: number, seed: number): string {
  if (progress >= 1) return text;
  return text
    .split("")
    .map((ch, i) => {
      if (ch === " ") return " ";
      const revealAt = (i + 1) / text.length;
      if (progress >= revealAt) return ch;
      return SCRAMBLE[(seed + i * 11) % SCRAMBLE.length];
    })
    .join("");
}

const PARTICLE_OFFSETS = [
  { x: -0.12, y: -0.09, c: "#FF4D6D" },
  { x: 0.1, y: -0.07, c: "#22D3EE" },
  { x: -0.07, y: 0.11, c: "#FACC15" },
  { x: 0.13, y: 0.05, c: "#A78BFA" },
  { x: -0.15, y: 0.04, c: "#4ADE80" },
  { x: 0.05, y: -0.12, c: "#FB923C" },
];

/** Quebra a frase em chunks de N palavras */
function chunkSentence(
  words: string[],
  chunkSize: number,
  maxLines: number
): string[][] {
  const maxWords = chunkSize * maxLines;
  const groups: string[][] = [];
  for (let i = 0; i < words.length; i += maxWords) {
    groups.push(words.slice(i, i + maxWords));
  }
  return groups;
}

/** Quebra um chunk em linhas de forma inteligente (max 2 linhas) */
function splitIntoLines(chunk: string[], maxLines: number): string[][] {
  if (maxLines === 1 || chunk.length <= 1) return [chunk];

  if (chunk.length === 2) {
    return chunk.map((w) => [w]);
  }

  let splitIdx = Math.ceil(chunk.length / 2);

  // Busca um ponto de quebra natural no meio
  for (let i = 1; i < chunk.length - 1; i++) {
    const prevWord = chunk[i - 1];
    const currentWord = chunk[i];

    // Quebra após pontuação
    if (/[.,!?;:]$/.test(prevWord.trim())) {
      splitIdx = i;
      break;
    }

    // Quebra antes de letra maiúscula
    const cleanWord = currentWord.trim();
    const startsWithCapital =
      /^[A-ZÁÉÍÓÚÂÊÔÇÀ]/.test(cleanWord) && !/^[A-Z]{2,}/.test(cleanWord);
    if (startsWithCapital) {
      splitIdx = i;
      break;
    }
  }

  return [chunk.slice(0, splitIdx), chunk.slice(splitIdx)].filter(
    (l) => l.length > 0
  );
}

export function CaptionPreview({
  format,
  mode,
  accentColor = "#FACC15",
  bgmPulse = false,
  maxLines = 2,
  maxWordsPerChunk = 4,
  className = "",
}: CaptionPreviewProps) {
  const [tick, setTick] = useState(0);
  const [subTick, setSubTick] = useState(0);
  const isShort = format === "short";
  const metrics = getCaptionPreviewMetrics(format, mode);
  const isSlam = mode === "caption-kinetic-slam";
  const isPill = mode === "caption-pill-karaoke";
  const isNeon = mode === "caption-neon-glow";
  const isWeight = mode === "caption-weight-shift";
  const isGradient = mode === "caption-gradient-fill";
  const isHighlight = mode === "caption-highlight";
  const isGlitch = mode === "caption-glitch-rgb";
  const isMatrix = mode === "caption-matrix-decode";
  const isWipe = mode === "caption-clip-wipe";
  const isBurst = mode === "caption-particle-burst";
  const isNeonAccent = mode === "caption-neon-accent";
  const isEmojiPop = mode === "caption-emoji-pop";
  const isEditorial = mode === "caption-editorial-emphasis";
  const isParallax = mode === "caption-parallax-layers";
  const isTexture = mode === "caption-texture";
  const isBlendDiff = mode === "caption-blend-difference";
  const isMorph = mode === "morph-text";
  const isShimmerGold = mode === "caption-shimmer-gold";
  const isBouncePop = mode === "caption-bounce-pop";
  const isBorderGlow = mode === "caption-border-glow";

  const wordByWord = isWordByWordMode(mode);

  const sentence = isShort ? SHORT_SENTENCE : LONG_SENTENCE;

  const chunks = chunkSentence(sentence, maxWordsPerChunk, maxLines);

  const activeChunkIdx = tick % chunks.length;
  const currentChunk = chunks[activeChunkIdx];

  const activeWordInChunk = tick % currentChunk.length;

  const wipeProgress = (subTick % 8) / 8;
  const matrixProgress = Math.min(1, (subTick % 10) / 10);
  const burstFade = Math.max(0, 1 - (subTick % 6) / 6);

  useEffect(() => {
    const ms = isSlam ? 1100 : wordByWord ? 700 : 1800;
    const id = window.setInterval(() => setTick((t) => t + 1), ms);
    return () => window.clearInterval(id);
  }, [isShort, isSlam, wordByWord]);

  useEffect(() => {
    const id = window.setInterval(() => setSubTick((t) => t + 1), 80);
    return () => window.clearInterval(id);
  }, [activeChunkIdx, mode]);

  const pulse = isHighlight && bgmPulse;
  const glitchShift = (subTick % 4) - 2;
  const neonHue = (subTick * 18) % 360;
  const morphBlur = isMorph ? Math.max(0, 6 - (subTick % 8)) : 0;
  const EMOJIS = ["✨", "🔥", "💡"];
  const modeLabel = mode.replace(/^caption-/, "");

  // For multi-word modes with 2 lines, split into lines smartly
  const lines = splitIntoLines(currentChunk, maxLines);

  // Flat index to track highlighting across lines
  let flatWordIndex = 0;

  return (
    <div className={`space-y-1.5 min-w-0 ${className}`.trim()}>
      <p className="text-[9px] text-[var(--dash-muted)] uppercase tracking-wider">
        Preview em escala real · {isShort ? "1080×1920" : "1920×1080"}
      </p>
      <div
        className={`caption-preview-frame relative overflow-hidden rounded-2xl border border-[var(--dash-border)] bg-zinc-950 ${
          isGlitch ? "caption-preview-scanlines" : ""
        }`}
        style={{ aspectRatio: isShort ? "9 / 16" : "16 / 9" }}
      >
        <div
          className="absolute inset-0 opacity-80"
          style={{
            background: isShort
              ? "linear-gradient(160deg, #1a1a2e 0%, #0f0f14 45%, #2d1f3d 100%)"
              : "linear-gradient(180deg, #1c1917 0%, #0c0a09 60%, #1e293b 100%)",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.55)_100%)]" />

        {/* Safe zone Shorts (referência YouTube) */}
        {isShort && (
          <div
            className="absolute left-0 right-0 border-t border-dashed border-white/10 pointer-events-none"
            style={{ bottom: "22%" }}
          />
        )}

        <div
          className={`absolute inset-x-0 flex pointer-events-none ${
            isSlam
              ? "inset-y-0 items-center justify-center"
              : "bottom-0 items-end justify-center"
          }`}
          style={{
            paddingBottom: isSlam ? 0 : metrics.paddingBottom,
            paddingLeft: metrics.paddingX,
            paddingRight: metrics.paddingX,
          }}
        >
          <div
            className="flex flex-col items-center"
            style={{
              gap: metrics.rowGap,
              maxWidth: metrics.maxWidth,
              borderRadius: isPill ? "16cqw" : undefined,
              padding: isPill ? metrics.pillPad : undefined,
              background: isPill ? "rgba(10, 10, 15, 0.75)" : undefined,
              border: isPill ? "1px solid rgba(255,255,255,0.08)" : undefined,
              backdropFilter: isPill ? "blur(12px)" : undefined,
              boxShadow: isPill ? "0 16px 40px rgba(0,0,0,0.75)" : undefined,
            }}
          >
            {lines.map((lineWords, lineIdx) => (
              <div
                key={lineIdx}
                className="flex flex-wrap justify-center items-center"
                style={{
                  columnGap: metrics.columnGap,
                  rowGap: metrics.rowGap,
                }}
              >
                {lineWords.map((word, wIdx) => {
                  const myFlatIdx = flatWordIndex++;
                  const active = myFlatIdx === activeWordInChunk;
                  const highlightActive = isHighlight && active;
                  const displayWord =
                    isMatrix && active
                      ? scramblePreview(word, matrixProgress, tick + myFlatIdx)
                      : word;

                  const gradientStyle =
                    isGradient && active
                      ? {
                          background: `linear-gradient(135deg, ${accentColor}, #F472B6, #22D3EE)`,
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                          color: "transparent",
                        }
                      : {};

                  const textureStyle =
                    isTexture && active
                      ? {
                          background: `linear-gradient(${subTick * 20}deg, #F97316, #DC2626, #FBBF24, #78350F)`,
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                          color: "transparent",
                        }
                      : {};

                  const shimmerGoldStyle =
                    isShimmerGold && active
                      ? {
                          background: `linear-gradient(90deg, #F59E0B 0%, #FEF08A 50%, #F59E0B 100%)`,
                          backgroundSize: "200% 100%",
                          backgroundPosition: `${(subTick * 15) % 200}% 0`,
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                          color: "transparent",
                        }
                      : {};

                  const fontSize =
                    isEditorial && !active && metrics.fontSizeEditorialInactive
                      ? metrics.fontSizeEditorialInactive
                      : metrics.fontSize;

                  return (
                    <span
                      key={`${word}-${myFlatIdx}-${lineIdx}`}
                      className={`relative font-black uppercase whitespace-nowrap transition-all duration-200 flex flex-col items-center ${
                        pulse && highlightActive ? "caption-preview-pulse" : ""
                      }`}
                      style={{
                        fontSize,
                        fontFamily:
                          isEditorial && active
                            ? "'Cinzel', Georgia, serif"
                            : isMatrix && active && matrixProgress < 1
                              ? "'Courier New', monospace"
                              : "'Montserrat', 'Inter', Arial, sans-serif",
                        fontWeight: isWeight
                          ? active
                            ? 900
                            : 300
                          : isEditorial && !active
                            ? 500
                            : 900,
                        letterSpacing:
                          wordByWord || isSlam ? "0.02em" : "0.05em",
                        lineHeight: 1.1,
                        mixBlendMode: isBlendDiff ? "difference" : undefined,
                        filter:
                          isMorph && active
                            ? `blur(${morphBlur}px)`
                            : undefined,
                        transform:
                          isParallax && !active
                            ? "scale(0.78) translateY(0.15em)"
                            : isParallax && active
                              ? "scale(1.06) translateY(-0.08em)"
                              : isSlam && active
                                ? "scale(1.05)"
                                : isBouncePop && active
                                  ? "scale(1.18) translateY(-0.1em)"
                                  : highlightActive
                                    ? pulse
                                      ? "scale(1.06)"
                                      : "scale(1.04)"
                                    : undefined,
                        color: isBlendDiff
                          ? "#FFFFFF"
                          : highlightActive
                            ? "#0A0A0A"
                            : isGlitch && active
                              ? "#E2E8F0"
                              : isNeonAccent && active
                                ? `hsl(${neonHue}, 95%, 62%)`
                                : isNeon && active
                                  ? "#22D3EE"
                                  : isGradient && active
                                    ? "transparent"
                                    : isShimmerGold && active
                                      ? "transparent"
                                      : active
                                        ? accentColor
                                        : "#FFFFFF",
                        background: highlightActive
                          ? `linear-gradient(135deg, ${accentColor} 0%, #FDE047 100%)`
                          : "transparent",
                        border:
                          isBorderGlow && active
                            ? `0.05em solid ${accentColor}`
                            : "0.05em solid transparent",
                        borderRadius: highlightActive
                          ? metrics.highlightRadius
                          : isBorderGlow
                            ? "0.2em"
                            : 0,
                        padding: highlightActive
                          ? `${metrics.highlightPadY} ${metrics.highlightPadX}`
                          : isBorderGlow && active
                            ? "0.05em 0.25em"
                            : "0",
                        WebkitTextStroke: isBouncePop
                          ? "0.04em #000000"
                          : undefined,
                        clipPath:
                          isWipe && active
                            ? `inset(0 ${Math.round((1 - wipeProgress) * 100)}% 0 0)`
                            : undefined,
                        opacity: active
                          ? 1
                          : isWeight || isParallax
                            ? 0.65
                            : 0.75,
                        textShadow:
                          isGlitch && active
                            ? `${glitchShift - 2}px 0 #FF4D6D, ${glitchShift + 2}px 0 #22D3EE, 0 0 0.35em rgba(255,255,255,0.4)`
                            : isNeon && active
                              ? "0 0 0.4em #22D3EE, 0 0 0.65em #F472B6"
                              : isBouncePop && active
                                ? "0 0.08em 0 #000000, 0 0.15em 0.3em rgba(0,0,0,0.6)"
                                : isBorderGlow && active
                                  ? `0 0 0.4em ${accentColor}`
                                  : active &&
                                      !isHighlight &&
                                      !isGradient &&
                                      !isShimmerGold
                                    ? `0 0 0.35em ${accentColor}88, 0 0.12em 0.2em rgba(0,0,0,0.5)`
                                    : "0 0.12em 0.25em rgba(0,0,0,0.65)",
                        boxShadow:
                          pulse && highlightActive
                            ? `0 0 0.5em ${accentColor}55`
                            : undefined,
                        ...gradientStyle,
                        ...textureStyle,
                        ...shimmerGoldStyle,
                      }}
                    >
                      {isEmojiPop && active && (
                        <span
                          className="leading-none"
                          style={{
                            fontSize: metrics.fontSizeEmoji,
                            marginBottom: "0.15em",
                          }}
                        >
                          {EMOJIS[myFlatIdx % EMOJIS.length]}
                        </span>
                      )}
                      {displayWord}
                      {isBurst &&
                        active &&
                        burstFade > 0 &&
                        PARTICLE_OFFSETS.map((p, pi) => (
                          <span
                            key={pi}
                            className="absolute rounded-full pointer-events-none"
                            style={{
                              width: metrics.particleSize,
                              height: metrics.particleSize,
                              left: "50%",
                              top: "50%",
                              transform: `translate(calc(-50% + ${p.x * burstFade * 100}%), calc(-50% + ${p.y * burstFade * 100}%))`,
                              background: p.c,
                              opacity: burstFade,
                              boxShadow: `0 0 0.4em ${p.c}`,
                            }}
                          />
                        ))}
                    </span>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="absolute top-[0.6em] left-[0.6em] text-[max(7px,1.1cqw)] font-bold uppercase tracking-widest text-zinc-500 bg-black/40 px-[0.5em] py-[0.25em] rounded">
          {isShort ? "9:16" : "16:9"} · {modeLabel}
        </div>
      </div>
    </div>
  );
}
