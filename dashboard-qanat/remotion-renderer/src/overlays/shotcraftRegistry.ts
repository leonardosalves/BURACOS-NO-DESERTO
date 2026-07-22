/**
 * shotcraftRegistry.ts
 * ⚠️ GERADO AUTOMATICAMENTE — não editar à mão.
 * Fonte: scripts/genShotcraftRegistry.mjs
 * Cards no catálogo: 106 · Demos vendor: 96
 */

export type ShotcraftRegistryEntry = {
  templateId: string;
  category: string;
  styles: string[];
  energy: string;
  formats: string[];
  hasDemo: boolean;
  demoFile: string | null;
  exportName: string | null;
  layoutMode: "fluid" | "legacy";
};

export const SHOTCRAFT_REGISTRY_ENTRIES: ShotcraftRegistryEntry[] = [
  {
    "templateId": "odometer-digit-roll",
    "category": "dados",
    "styles": [
      "odometer-digit-roll"
    ],
    "energy": "high",
    "formats": [
      "9:16",
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "OdometerDigitRoll.tsx",
    "exportName": "OdometerDigitRoll",
    "layoutMode": "legacy"
  },
  {
    "templateId": "chart-live-moves",
    "category": "dados",
    "styles": [
      "oscilloscope-stream",
      "unit-dot-swarm-regroup",
      "axis-rescale-shock"
    ],
    "energy": "medium",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "AxisRescaleShockV2.tsx",
    "exportName": "AxisRescaleShockV2",
    "layoutMode": "legacy"
  },
  {
    "templateId": "particle-sand-fill",
    "category": "dados",
    "styles": [
      "particle-sand-fill"
    ],
    "energy": "medium",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "ParticleSandFill.tsx",
    "exportName": "ParticleSandFill",
    "layoutMode": "legacy"
  },
  {
    "templateId": "gauge-readout-moves",
    "category": "dados",
    "styles": [
      "needle-sweep-selftest",
      "tape-scroll-fixed-pointer"
    ],
    "energy": "medium",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "NeedleSweepSelftest.tsx",
    "exportName": "NeedleSweepSelftest",
    "layoutMode": "legacy"
  },
  {
    "templateId": "crane-rise-reveal",
    "category": "dados",
    "styles": [
      "crane-rise-reveal"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "CraneRiseReveal.tsx",
    "exportName": "CraneRiseReveal",
    "layoutMode": "legacy"
  },
  {
    "templateId": "dataviz-landscape-open",
    "category": "dados",
    "styles": [
      "dataviz-landscape-open"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "DatavizLandscapeOpen.tsx",
    "exportName": "DatavizLandscapeOpen",
    "layoutMode": "fluid"
  },
  {
    "templateId": "autolayout-gap-dial",
    "category": "dados",
    "styles": [
      "autolayout-gap-dial"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "AutolayoutGapDial.tsx",
    "exportName": "AutolayoutGapDial",
    "layoutMode": "fluid"
  },
  {
    "templateId": "ai-stream-response",
    "category": "dados",
    "styles": [
      "ai-stream-response"
    ],
    "energy": "medium",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "StreamResponse.tsx",
    "exportName": "StreamResponse",
    "layoutMode": "fluid"
  },
  {
    "templateId": "before-after-slider-scrub",
    "category": "comparacao",
    "styles": [
      "before-after-slider-scrub"
    ],
    "energy": "medium",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "BeforeAfterSliderScrub.tsx",
    "exportName": "BeforeAfterSliderScrub",
    "layoutMode": "legacy"
  },
  {
    "templateId": "text-column-converge",
    "category": "comparacao",
    "styles": [
      "text-column-converge"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "TextColumnConverge.tsx",
    "exportName": "TextColumnConverge",
    "layoutMode": "fluid"
  },
  {
    "templateId": "timeline-travel",
    "category": "timeline",
    "styles": [
      "timeline-travel"
    ],
    "energy": "medium",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "TimelineTravel.tsx",
    "exportName": "TimelineTravel",
    "layoutMode": "fluid"
  },
  {
    "templateId": "document-typewriter-reveal",
    "category": "timeline",
    "styles": [
      "document-typewriter-reveal"
    ],
    "energy": "low",
    "formats": [
      "16:9"
    ],
    "hasDemo": false,
    "demoFile": null,
    "exportName": null,
    "layoutMode": "fluid"
  },
  {
    "templateId": "list-stack-press",
    "category": "lista",
    "styles": [
      "list-stack-press"
    ],
    "energy": "high",
    "formats": [
      "9:16",
      "16:9"
    ],
    "hasDemo": false,
    "demoFile": null,
    "exportName": null,
    "layoutMode": "fluid"
  },
  {
    "templateId": "row-embed",
    "category": "lista",
    "styles": [
      "row-embed"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": false,
    "demoFile": null,
    "exportName": null,
    "layoutMode": "fluid"
  },
  {
    "templateId": "beat-step-list-theme-cycle",
    "category": "lista",
    "styles": [
      "beat-step-list-theme-cycle"
    ],
    "energy": "high",
    "formats": [
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "BeatStepListThemeCycle.tsx",
    "exportName": "BeatStepListThemeCycle",
    "layoutMode": "fluid"
  },
  {
    "templateId": "wall-reveal-moves",
    "category": "lista",
    "styles": [
      "bento-light-up",
      "grid-wave-flip",
      "wireframe-draw-on"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "BentoLightUp.tsx",
    "exportName": "BentoLightUp",
    "layoutMode": "fluid"
  },
  {
    "templateId": "deck-deal-flyin",
    "category": "lista",
    "styles": [
      "deck-deal-flyin"
    ],
    "energy": "high",
    "formats": [
      "16:9"
    ],
    "hasDemo": false,
    "demoFile": null,
    "exportName": null,
    "layoutMode": "fluid"
  },
  {
    "templateId": "spotlight-hero-card",
    "category": "destaque",
    "styles": [
      "spotlight-hero-card"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": false,
    "demoFile": null,
    "exportName": null,
    "layoutMode": "fluid"
  },
  {
    "templateId": "card-flip-reveal",
    "category": "destaque",
    "styles": [
      "card-flip-reveal"
    ],
    "energy": "medium",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "CardFlipReveal.tsx",
    "exportName": "CardFlipReveal",
    "layoutMode": "legacy"
  },
  {
    "templateId": "spotlight-sweep-moves",
    "category": "destaque",
    "styles": [
      "spotlight-sweep-moves"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "CornerSpotlightReveal.tsx",
    "exportName": "CornerSpotlightReveal",
    "layoutMode": "legacy"
  },
  {
    "templateId": "segmented-thumb-hero",
    "category": "destaque",
    "styles": [
      "segmented-thumb-hero"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "SegmentedThumbHero.tsx",
    "exportName": "SegmentedThumbHero",
    "layoutMode": "fluid"
  },
  {
    "templateId": "brand-ink-open",
    "category": "abertura",
    "styles": [
      "brand-ink-open"
    ],
    "energy": "medium",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": false,
    "demoFile": null,
    "exportName": null,
    "layoutMode": "fluid"
  },
  {
    "templateId": "trailer-grammar-moves",
    "category": "abertura",
    "styles": [
      "trailer-bumper",
      "card-footage-cadence",
      "smash-cut"
    ],
    "energy": "high",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "CardFootageCadence.tsx",
    "exportName": "CardFootageCadence",
    "layoutMode": "legacy"
  },
  {
    "templateId": "brand-frame-snap",
    "category": "abertura",
    "styles": [
      "brand-frame-snap"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "BrandFrameSnap.tsx",
    "exportName": "BrandFrameSnap",
    "layoutMode": "legacy"
  },
  {
    "templateId": "letterspace-materialize",
    "category": "abertura",
    "styles": [
      "letterspace-materialize"
    ],
    "energy": "low",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "LetterspaceMaterialize.tsx",
    "exportName": "LetterspaceMaterialize",
    "layoutMode": "fluid"
  },
  {
    "templateId": "neon-frame-forerun",
    "category": "abertura",
    "styles": [
      "neon-frame-forerun"
    ],
    "energy": "high",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "NeonFrameForerun.tsx",
    "exportName": "NeonFrameForerun",
    "layoutMode": "fluid"
  },
  {
    "templateId": "neon-frame-orbit-drop",
    "category": "abertura",
    "styles": [
      "neon-frame-orbit-drop"
    ],
    "energy": "high",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "NeonFrameForerunOrbit.tsx",
    "exportName": "NeonFrameForerunOrbit",
    "layoutMode": "fluid"
  },
  {
    "templateId": "outro-group-photo-launch",
    "category": "encerramento",
    "styles": [
      "outro-group-photo-launch"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": false,
    "demoFile": null,
    "exportName": null,
    "layoutMode": "fluid"
  },
  {
    "templateId": "ui-strip-away-outro",
    "category": "encerramento",
    "styles": [
      "ui-strip-away-outro"
    ],
    "energy": "low",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "UiStripAwayOutro.tsx",
    "exportName": "UiStripAwayOutro",
    "layoutMode": "legacy"
  },
  {
    "templateId": "edit-hook-moves",
    "category": "encerramento",
    "styles": [
      "logo-sting-button"
    ],
    "energy": "high",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "LogoStingButton.tsx",
    "exportName": "LogoStingButton",
    "layoutMode": "legacy"
  },
  {
    "templateId": "shot-transitions",
    "category": "transicao",
    "styles": [
      "flash-cut",
      "shot-transitions-4",
      "shot-transitions-5",
      "shot-transitions-6",
      "whip-pan",
      "mask-wipe"
    ],
    "energy": "high",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "MaskWipeReal.tsx",
    "exportName": "MASKWIPE_DUR",
    "layoutMode": "legacy"
  },
  {
    "templateId": "wipe-transitions",
    "category": "transicao",
    "styles": [
      "clock-wipe",
      "blinds-slice"
    ],
    "energy": "medium",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "BlindsSlice.tsx",
    "exportName": "BlindsSlice",
    "layoutMode": "legacy"
  },
  {
    "templateId": "page-turn-transitions",
    "category": "transicao",
    "styles": [
      "cube-rotate",
      "barn-door-split"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "BarnDoorSplit.tsx",
    "exportName": "BarnDoorSplit",
    "layoutMode": "legacy"
  },
  {
    "templateId": "transition-hidden-cut",
    "category": "transicao",
    "styles": [
      "invisible-cut",
      "versus-slam",
      "light-leak-burn"
    ],
    "energy": "medium",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "InvisibleCut.tsx",
    "exportName": "InvisibleCut",
    "layoutMode": "fluid"
  },
  {
    "templateId": "transition-travel",
    "category": "transicao",
    "styles": [
      "shared-element-morph",
      "letterform-zoom"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "LetterformZoom.tsx",
    "exportName": "LetterformZoom",
    "layoutMode": "fluid"
  },
  {
    "templateId": "circle-match-iris",
    "category": "transicao",
    "styles": [
      "circle-match-iris"
    ],
    "energy": "medium",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "CircleMatchIris.tsx",
    "exportName": "CircleMatchIris",
    "layoutMode": "legacy"
  },
  {
    "templateId": "line-carry-transition",
    "category": "transicao",
    "styles": [
      "line-carry-transition"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "LineCarryTransition.tsx",
    "exportName": "LineCarryTransition",
    "layoutMode": "legacy"
  },
  {
    "templateId": "color-block-step-wipe",
    "category": "transicao",
    "styles": [
      "color-block-step-wipe"
    ],
    "energy": "high",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "ColorBlockStepWipe.tsx",
    "exportName": "ColorBlockStepWipe",
    "layoutMode": "fluid"
  },
  {
    "templateId": "bottom-push-stack-wipe",
    "category": "transicao",
    "styles": [
      "bottom-push-stack-wipe"
    ],
    "energy": "high",
    "formats": [
      "9:16",
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "BottomPushStackWipe.tsx",
    "exportName": "BottomPushStackWipe",
    "layoutMode": "legacy"
  },
  {
    "templateId": "tear-streak-transitions",
    "category": "transicao",
    "styles": [
      "glitch-displace"
    ],
    "energy": "high",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "GlitchDisplace.tsx",
    "exportName": "GlitchDisplace",
    "layoutMode": "fluid"
  },
  {
    "templateId": "print-texture-transitions",
    "category": "transicao",
    "styles": [
      "ink-bleed-reveal"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "InkBleedReveal.tsx",
    "exportName": "InkBleedReveal",
    "layoutMode": "legacy"
  },
  {
    "templateId": "bubble-swarm-takeover",
    "category": "transicao",
    "styles": [
      "bubble-swarm-takeover"
    ],
    "energy": "medium",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "BubbleSwarmTakeover.tsx",
    "exportName": "BubbleSwarmTakeover",
    "layoutMode": "fluid"
  },
  {
    "templateId": "space-camera-moves",
    "category": "camera",
    "styles": [
      "exploded-view",
      "snorricam-lock",
      "drone-dive-landing"
    ],
    "energy": "high",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "DroneDiveLanding.tsx",
    "exportName": "DroneDiveLanding",
    "layoutMode": "legacy"
  },
  {
    "templateId": "tension-camera-moves",
    "category": "camera",
    "styles": [
      "bullet-time-freeze-orbit",
      "dutch-roll-to-level",
      "slow-push-in",
      "pull-back-isolation"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "BulletTimeFreezeOrbit.tsx",
    "exportName": "BulletTimeFreezeOrbit",
    "layoutMode": "legacy"
  },
  {
    "templateId": "depth-layer-moves",
    "category": "camera",
    "styles": [
      "multiplane",
      "dolly-zoom"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "DollyZoomReal.tsx",
    "exportName": "DOLLYZOOM_DUR",
    "layoutMode": "fluid"
  },
  {
    "templateId": "overhead-camera-moves",
    "category": "camera",
    "styles": [
      "tilt-reveal",
      "overhead-tabletop-drop"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "OverheadTabletopDrop.tsx",
    "exportName": "OverheadTabletopDrop",
    "layoutMode": "legacy"
  },
  {
    "templateId": "crash-zoom-punch",
    "category": "camera",
    "styles": [
      "crash-zoom-punch"
    ],
    "energy": "high",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "CrashImpactReal.tsx",
    "exportName": "CRASHIMPACT_DUR",
    "layoutMode": "fluid"
  },
  {
    "templateId": "graze-face-tour",
    "category": "camera",
    "styles": [
      "graze-face-tour"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "GrazeFaceTour.tsx",
    "exportName": "GrazeFaceTour",
    "layoutMode": "fluid"
  },
  {
    "templateId": "steep-tilt-glide",
    "category": "camera",
    "styles": [
      "steep-tilt-glide"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "SteepTiltGlide.tsx",
    "exportName": "SteepTiltGlide",
    "layoutMode": "legacy"
  },
  {
    "templateId": "runway-ground-skim",
    "category": "camera",
    "styles": [
      "runway-ground-skim"
    ],
    "energy": "high",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "RunwayGroundSkim.tsx",
    "exportName": "RunwayGroundSkim",
    "layoutMode": "fluid"
  },
  {
    "templateId": "scroll-brake-moves",
    "category": "camera",
    "styles": [
      "changelog-scroll-brake",
      "brake-reticle-lock"
    ],
    "energy": "medium",
    "formats": [
      "9:16",
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "BrakeReticleLock.tsx",
    "exportName": "BrakeReticleLock",
    "layoutMode": "legacy"
  },
  {
    "templateId": "gradient-word-sweep",
    "category": "texto",
    "styles": [
      "gradient-word-sweep"
    ],
    "energy": "medium",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "GradientWordSweep.tsx",
    "exportName": "GradientWordSweep",
    "layoutMode": "fluid"
  },
  {
    "templateId": "marker-underline-title",
    "category": "texto",
    "styles": [
      "marker-underline-title"
    ],
    "energy": "low",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "MarkerUnderlineTitle.tsx",
    "exportName": "MarkerUnderlineTitle",
    "layoutMode": "fluid"
  },
  {
    "templateId": "scene-locked-title",
    "category": "texto",
    "styles": [
      "scene-locked-title"
    ],
    "energy": "low",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "SceneLockedTitle.tsx",
    "exportName": "SceneLockedTitle",
    "layoutMode": "legacy"
  },
  {
    "templateId": "text-as-mask",
    "category": "texto",
    "styles": [
      "text-as-mask"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "TextAsMask.tsx",
    "exportName": "TextAsMask",
    "layoutMode": "legacy"
  },
  {
    "templateId": "typewriter-moves",
    "category": "texto",
    "styles": [
      "terminal-typewriter",
      "error-retype"
    ],
    "energy": "low",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "TerminalTypewriter.tsx",
    "exportName": "TerminalTypewriter",
    "layoutMode": "legacy"
  },
  {
    "templateId": "type-assembly-moves",
    "category": "texto",
    "styles": [
      "split-text-stagger",
      "drift-assembly",
      "tracking-expand",
      "text-on-path"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "LetterformDriftAssembly.tsx",
    "exportName": "LetterformDriftAssembly",
    "layoutMode": "legacy"
  },
  {
    "templateId": "type-entrance-moves",
    "category": "texto",
    "styles": [
      "scramble-decode",
      "letter-drop-physics"
    ],
    "energy": "medium",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "LetterDropPhysics.tsx",
    "exportName": "LetterDropPhysics",
    "layoutMode": "legacy"
  },
  {
    "templateId": "type-rhythm-sync",
    "category": "texto",
    "styles": [
      "font-weight-pump",
      "karaoke-fill-sync"
    ],
    "energy": "high",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "FontWeightPump.tsx",
    "exportName": "FontWeightPump",
    "layoutMode": "legacy"
  },
  {
    "templateId": "split-flap-title",
    "category": "texto",
    "styles": [
      "split-flap-title"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "SplitFlapFlip.tsx",
    "exportName": "SplitFlapFlip",
    "layoutMode": "fluid"
  },
  {
    "templateId": "paper-title-card",
    "category": "texto",
    "styles": [
      "paper-title-card"
    ],
    "energy": "low",
    "formats": [
      "16:9"
    ],
    "hasDemo": false,
    "demoFile": null,
    "exportName": null,
    "layoutMode": "fluid"
  },
  {
    "templateId": "stroke-segment-build",
    "category": "texto",
    "styles": [
      "stroke-segment-build"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "StrokeSegmentBuild.tsx",
    "exportName": "StrokeSegmentBuild",
    "layoutMode": "legacy"
  },
  {
    "templateId": "title-demote-to-label",
    "category": "texto",
    "styles": [
      "title-demote-to-label"
    ],
    "energy": "low",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "TitleDemoteToLabel.tsx",
    "exportName": "TitleDemoteToLabel",
    "layoutMode": "fluid"
  },
  {
    "templateId": "word-relay-filmstrip",
    "category": "texto",
    "styles": [
      "word-relay-filmstrip"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "WordRelayFilmstrip.tsx",
    "exportName": "WordRelayFilmstrip",
    "layoutMode": "fluid"
  },
  {
    "templateId": "spectrum-morph-ui",
    "category": "texto",
    "styles": [
      "spectrum-morph-ui"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "SpectrumMorphUi.tsx",
    "exportName": "SpectrumMorphUi",
    "layoutMode": "legacy"
  },
  {
    "templateId": "hashtag-to-pill-materialize",
    "category": "texto",
    "styles": [
      "hashtag-to-pill-materialize"
    ],
    "energy": "medium",
    "formats": [
      "9:16",
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "HashtagToPillMaterialize.tsx",
    "exportName": "HashtagToPillMaterialize",
    "layoutMode": "fluid"
  },
  {
    "templateId": "hires-rasterize-3d-text",
    "category": "texto",
    "styles": [
      "hires-rasterize-3d-text"
    ],
    "energy": "low",
    "formats": [
      "16:9"
    ],
    "hasDemo": false,
    "demoFile": null,
    "exportName": null,
    "layoutMode": "fluid"
  },
  {
    "templateId": "beat-cut-moves",
    "category": "impacto",
    "styles": [
      "beat-cut-accelerando",
      "paparazzi-flash"
    ],
    "energy": "high",
    "formats": [
      "9:16",
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "BeatCutAccelerando.tsx",
    "exportName": "BeatCutAccelerando",
    "layoutMode": "legacy"
  },
  {
    "templateId": "cel-flash-stomp",
    "category": "impacto",
    "styles": [
      "cel-flash-stomp"
    ],
    "energy": "high",
    "formats": [
      "9:16",
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "CelFlashStomp.tsx",
    "exportName": "CelFlashStomp",
    "layoutMode": "legacy"
  },
  {
    "templateId": "impact-feedback",
    "category": "impacto",
    "styles": [
      "hit-counter",
      "anime-impact"
    ],
    "energy": "high",
    "formats": [
      "9:16",
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "AnimeImpact.tsx",
    "exportName": "AnimeImpact",
    "layoutMode": "fluid"
  },
  {
    "templateId": "montage-rhythm-moves",
    "category": "impacto",
    "styles": [
      "drop-blackout-slam",
      "wright-triple-cut",
      "domino-cascade"
    ],
    "energy": "high",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "DominoCascade.tsx",
    "exportName": "DominoCascade",
    "layoutMode": "legacy"
  },
  {
    "templateId": "rhythm-interrupt-moves",
    "category": "impacto",
    "styles": [
      "jump-cut-punch-in",
      "strobe-black-frames"
    ],
    "energy": "high",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "JumpCutPunchIn.tsx",
    "exportName": "JumpCutPunchIn",
    "layoutMode": "legacy"
  },
  {
    "templateId": "slam-entrance-moves",
    "category": "impacto",
    "styles": [
      "kanada-perspective-snap",
      "score-slam",
      "impact-burst-kit"
    ],
    "energy": "high",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "ImpactBurstKit.tsx",
    "exportName": "ImpactBurstKit",
    "layoutMode": "legacy"
  },
  {
    "templateId": "riso-print-hits",
    "category": "impacto",
    "styles": [
      "misregistration-hit",
      "beat-pump"
    ],
    "energy": "high",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "RisoBeatPump.tsx",
    "exportName": "RisoBeatPump",
    "layoutMode": "legacy"
  },
  {
    "templateId": "particle-celebrate-hits",
    "category": "impacto",
    "styles": [
      "confetti-crossfire",
      "counter-tick-sparks"
    ],
    "energy": "high",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "ConfettiCrossfire.tsx",
    "exportName": "ConfettiCrossfire",
    "layoutMode": "legacy"
  },
  {
    "templateId": "sakuga-timing-shift",
    "category": "impacto",
    "styles": [
      "sakuga-timing-shift"
    ],
    "energy": "high",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "SakugaTimingShift.tsx",
    "exportName": "SakugaTimingShift",
    "layoutMode": "legacy"
  },
  {
    "templateId": "speed-ramp-freeze",
    "category": "impacto",
    "styles": [
      "speed-ramp",
      "freeze-annotate"
    ],
    "energy": "medium",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "FreezeAnnotateReal.tsx",
    "exportName": "FREEZEANNOTATE_DUR",
    "layoutMode": "fluid"
  },
  {
    "templateId": "icon-performance-moves",
    "category": "impacto",
    "styles": [
      "pop-burst-confirm",
      "attention-bounce"
    ],
    "energy": "high",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "AttentionBounce.tsx",
    "exportName": "AttentionBounce",
    "layoutMode": "legacy"
  },
  {
    "templateId": "element-body-moves",
    "category": "elemento",
    "styles": [
      "axial-stretch",
      "contact-shadow-lift"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "AxialStretch.tsx",
    "exportName": "AxialStretch",
    "layoutMode": "legacy"
  },
  {
    "templateId": "morph-from-primitive",
    "category": "elemento",
    "styles": [
      "morph-from-primitive"
    ],
    "energy": "low",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "MorphFromPrimitive.tsx",
    "exportName": "MorphFromPrimitive",
    "layoutMode": "legacy"
  },
  {
    "templateId": "cloner-depth-echo",
    "category": "elemento",
    "styles": [
      "cloner-depth-echo"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "ClonerDepthEcho.tsx",
    "exportName": "ClonerDepthEcho",
    "layoutMode": "legacy"
  },
  {
    "templateId": "smear-multiples",
    "category": "elemento",
    "styles": [
      "smear-multiples"
    ],
    "energy": "high",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "SmearMultiples.tsx",
    "exportName": "SmearMultiples",
    "layoutMode": "legacy"
  },
  {
    "templateId": "skeleton-reveal",
    "category": "elemento",
    "styles": [
      "skeleton-reveal"
    ],
    "energy": "low",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "SkeletonReveal.tsx",
    "exportName": "SkeletonReveal",
    "layoutMode": "fluid"
  },
  {
    "templateId": "canvas-materialize-moves",
    "category": "elemento",
    "styles": [
      "panel-to-canvas",
      "diagram-cascade"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "DiagramCascadeBuild.tsx",
    "exportName": "DiagramCascadeBuild",
    "layoutMode": "fluid"
  },
  {
    "templateId": "command-palette-summon",
    "category": "elemento",
    "styles": [
      "command-palette-summon"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "CommandPaletteSummon.tsx",
    "exportName": "CommandPaletteSummon",
    "layoutMode": "legacy"
  },
  {
    "templateId": "type-and-filter",
    "category": "elemento",
    "styles": [
      "type-and-filter"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": false,
    "demoFile": null,
    "exportName": null,
    "layoutMode": "fluid"
  },
  {
    "templateId": "integration-hub-map",
    "category": "elemento",
    "styles": [
      "integration-hub-map"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "IntegrationHubMap.tsx",
    "exportName": "IntegrationHubMap",
    "layoutMode": "fluid"
  },
  {
    "templateId": "collab-cursor-moves",
    "category": "elemento",
    "styles": [
      "dialogue-duet",
      "cast-ensemble"
    ],
    "energy": "low",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "CursorCastEnsemble.tsx",
    "exportName": "CursorCastEnsemble",
    "layoutMode": "legacy"
  },
  {
    "templateId": "input-trigger-moves",
    "category": "elemento",
    "styles": [
      "cursor-performance",
      "keycap-smash-cut"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "CursorPerformancePunchIn.tsx",
    "exportName": "CursorPerformancePunchIn",
    "layoutMode": "legacy"
  },
  {
    "templateId": "paper-plane-messenger",
    "category": "elemento",
    "styles": [
      "paper-plane-messenger"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "PaperPlaneMessenger.tsx",
    "exportName": "PaperPlaneMessenger",
    "layoutMode": "fluid"
  },
  {
    "templateId": "voice-waveform-live",
    "category": "elemento",
    "styles": [
      "voice-waveform-live"
    ],
    "energy": "medium",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": true,
    "demoFile": "VoiceWaveformLive.tsx",
    "exportName": "VoiceWaveformLive",
    "layoutMode": "fluid"
  },
  {
    "templateId": "theme-switch-moves",
    "category": "elemento",
    "styles": [
      "theme-sweep-toggle",
      "palette-theme-ripple"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "PaletteThemeRipple.tsx",
    "exportName": "PaletteThemeRipple",
    "layoutMode": "legacy"
  },
  {
    "templateId": "icon-field-colorize",
    "category": "elemento",
    "styles": [
      "icon-field-colorize"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "IconFieldColorize.tsx",
    "exportName": "IconFieldColorize",
    "layoutMode": "fluid"
  },
  {
    "templateId": "fui-hud-moves",
    "category": "elemento",
    "styles": [
      "line-unfold-panel",
      "reticle-lock-on"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "LineUnfoldPanel.tsx",
    "exportName": "LineUnfoldPanel",
    "layoutMode": "legacy"
  },
  {
    "templateId": "glow-flyline-moves",
    "category": "elemento",
    "styles": [
      "glow-orb-ambient",
      "flyline-arc",
      "orb-flyline-relay"
    ],
    "energy": "low",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "FlylineArc.tsx",
    "exportName": "FlylineArc",
    "layoutMode": "legacy"
  },
  {
    "templateId": "light-play-moves",
    "category": "elemento",
    "styles": [
      "spotlight-sweep",
      "sheen-sweep",
      "halation-bloom"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "HalationBloom.tsx",
    "exportName": "HalationBloom",
    "layoutMode": "legacy"
  },
  {
    "templateId": "neon-triple-marquee",
    "category": "elemento",
    "styles": [
      "neon-triple-marquee"
    ],
    "energy": "high",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "NeonTripleMarquee.tsx",
    "exportName": "NeonTripleMarquee",
    "layoutMode": "fluid"
  },
  {
    "templateId": "page-waterfall-wall",
    "category": "elemento",
    "styles": [
      "page-waterfall-wall"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "PageWaterfallWall.tsx",
    "exportName": "buildColumns",
    "layoutMode": "fluid"
  },
  {
    "templateId": "panel-grid-moves",
    "category": "elemento",
    "styles": [
      "grid-flash-mosaic",
      "flip-grid-reflow",
      "comic-panel-split"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "ComicPanelSplit.tsx",
    "exportName": "ComicPanelSplit",
    "layoutMode": "legacy"
  },
  {
    "templateId": "paper-craft-moves",
    "category": "elemento",
    "styles": [
      "masking-tape-slap",
      "popup-book-rise"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "MaskingTapeSlap.tsx",
    "exportName": "MaskingTapeSlap",
    "layoutMode": "legacy"
  },
  {
    "templateId": "magician-card-flourish",
    "category": "elemento",
    "styles": [
      "magician-card-flourish"
    ],
    "energy": "high",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "MagicianCardFlourish.tsx",
    "exportName": "MagicianCardFlourish",
    "layoutMode": "legacy"
  },
  {
    "templateId": "card-flock-tumble",
    "category": "elemento",
    "styles": [
      "card-flock-tumble"
    ],
    "energy": "high",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "CardFlockTumble.tsx",
    "exportName": "CardFlockTumble",
    "layoutMode": "fluid"
  },
  {
    "templateId": "draw-svg-trace",
    "category": "elemento",
    "styles": [
      "draw-svg-trace"
    ],
    "energy": "low",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "DrawSvgTrace.tsx",
    "exportName": "DrawSvgTrace",
    "layoutMode": "legacy"
  },
  {
    "templateId": "line-boil",
    "category": "elemento",
    "styles": [
      "line-boil"
    ],
    "energy": "low",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "LineBoil.tsx",
    "exportName": "LineBoil",
    "layoutMode": "legacy"
  },
  {
    "templateId": "ui-to-brand-morph",
    "category": "elemento",
    "styles": [
      "icon-flip-bloom",
      "input-morph-assemble"
    ],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "IconFlipBloomLogo.tsx",
    "exportName": "IconFlipBloomLogo",
    "layoutMode": "fluid"
  },
  {
    "templateId": "score-slam-hit",
    "category": "impacto",
    "styles": [
      "score-slam"
    ],
    "energy": "high",
    "formats": [
      "16:9",
      "9:16"
    ],
    "hasDemo": false,
    "demoFile": null,
    "exportName": null,
    "layoutMode": "fluid"
  },
  {
    "templateId": "pill-slot-cycle",
    "category": "elemento",
    "styles": [],
    "energy": "medium",
    "formats": [
      "16:9"
    ],
    "hasDemo": true,
    "demoFile": "PillSlotCycle.tsx",
    "exportName": "PillSlotCycle",
    "layoutMode": "fluid"
  }
];

export const SHOTCRAFT_TEMPLATE_IDS = SHOTCRAFT_REGISTRY_ENTRIES.map(
  (e) => e.templateId
);

export const TOTAL_SHOTCRAFT_COMPONENTS = SHOTCRAFT_REGISTRY_ENTRIES.length;

export function getShotcraftRegistryEntry(
  templateId: string
): ShotcraftRegistryEntry | null {
  return (
    SHOTCRAFT_REGISTRY_ENTRIES.find((e) => e.templateId === templateId) || null
  );
}

/** IDs com demo vendor disponível (para integração futura de import dinâmico). */
export const SHOTCRAFT_DEMO_IDS = SHOTCRAFT_REGISTRY_ENTRIES.filter(
  (e) => e.hasDemo
).map((e) => e.templateId);
