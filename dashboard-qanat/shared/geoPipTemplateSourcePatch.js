/** Patches no TSX PIP geo: esconde chrome vazio e remove badge "% PIP". */

export function isGeoPipTemplateSource(code = "") {
  const src = String(code || "");
  return (
    /EngineeringPictureInPicture/.test(src) ||
    /\{progressPercent\}% PIP/.test(src)
  );
}

const PIP_STATUS_OPENER = `      <div
        style={{
          position: "absolute",
          right: isVertical ? 42 : 68,
          top: isVertical ? 118 : 50,`;

const PIP_STATUS_CLOSER = `      >
        {statusText}
      </div>`;

const PIP_TAG_OPENER = `          <div
            style={{
              position: "absolute",
              top: 10,
              left: 10,`;

const PIP_TAG_CLOSER = `            {pipTag}
          </div>`;

const PIP_BADGE = `          <div
            style={{
              position: "absolute",
              right: 10,
              top: 10,
              padding: "6px 9px",
              background: "rgba(2,6,23,0.74)",
              border: \`1px solid \${primaryColor}44\`,
              color: primaryColor,
              fontSize: pipMetaSize,
              fontWeight: 900,
              letterSpacing: 1.1,
              textTransform: "uppercase",
              zIndex: 3,
            }}
          >
            PIP
          </div>`;

const PIP_TEXT_OPENER = `          <div
            style={{
              position: "absolute",
              left: 14,
              right: 14,
              bottom: 14,
              zIndex: 4,
            }}
          >`;

const PIP_TEXT_CLOSER = `              <span>{coordinateText}</span>
              <span style={{ color: accentColor }}>{distanceText}</span>
            </div>
          </div>`;

function wrapBlockOnce(src, marker, opener, closer, wrapperOpen, wrapperClose) {
  if (src.includes(marker)) return src;
  const start = src.indexOf(opener);
  if (start < 0) return src;
  const end = src.indexOf(closer, start);
  if (end < 0) return src;
  const block = src.slice(start, end + closer.length);
  return (
    src.slice(0, start) +
    wrapperOpen +
    block +
    wrapperClose +
    src.slice(end + closer.length)
  );
}

function ensureGeoPipOverlayChromeProp(src = "") {
  let out = String(src);
  if (!/durationInFrames\s*\??:/.test(out)) {
    out = out.replace(
      `  textColor?: string;
};`,
      `  textColor?: string;
  durationInFrames?: number | string;
  durationSeconds?: number | string;
};`
    );
  }
  if (!/geoPipOverlayChrome\s*[=?:]/.test(out)) {
    out = out.replace(
      `  textColor?: string;
};`,
      `  textColor?: string;
  geoPipOverlayChrome?: boolean;
};`
    );
    out = out.replace(
      `  textColor = "#ffffff",
}: EngineeringPictureInPictureProps)`,
      `  textColor = "#ffffff",
  durationInFrames = 0,
  durationSeconds = 0,
  geoPipOverlayChrome = false,
}: EngineeringPictureInPictureProps)`
    );
  } else if (!/durationInFrames\s*=/.test(out)) {
    out = out.replace(
      `  geoPipOverlayChrome = false,
}: EngineeringPictureInPictureProps)`,
      `  durationInFrames = 0,
  durationSeconds = 0,
  geoPipOverlayChrome = false,
}: EngineeringPictureInPictureProps)`
    );
  }
  return out;
}

export function patchGeoPipTemplateSourceForChrome(code = "") {
  if (!isGeoPipTemplateSource(code)) return String(code || "");
  let src = ensureGeoPipOverlayChromeProp(String(code));

  src = src.replace(
    "{showMainContentLabel && (",
    "{showMainContentLabel && descriptorText && ("
  );

  src = src.replace(
    "opacity: showMainContentLabel ? contentProgress : 0,",
    "opacity: showMainContentLabel && (mainTitle || mainSubtitle) ? contentProgress : 0,"
  );

  if (!src.includes('geoPipOverlayChrome ? "transparent"')) {
    src = src.replace(
      `    <AbsoluteFill
      style={{
        backgroundColor,`,
      `    <AbsoluteFill
      style={{
        backgroundColor: geoPipOverlayChrome ? "transparent" : backgroundColor,`
    );
  }

  src = src.replace(/\s*<span>\{progressPercent\}% PIP<\/span>/g, "");

  src = wrapBlockOnce(
    src,
    "{statusText ? (",
    PIP_STATUS_OPENER,
    PIP_STATUS_CLOSER,
    "{statusText ? (",
    ") : null}"
  );

  src = wrapBlockOnce(
    src,
    "{pipTag ? (",
    PIP_TAG_OPENER,
    PIP_TAG_CLOSER,
    "{pipTag ? (",
    ") : null}"
  );

  src = src.replace(PIP_BADGE, "");

  src = wrapBlockOnce(
    src,
    "(pipTitle || pipSubtitle || coordinateText || distanceText) ? (",
    PIP_TEXT_OPENER,
    PIP_TEXT_CLOSER,
    "{(pipTitle || pipSubtitle || coordinateText || distanceText) ? (",
    ") : null}"
  );

  const overlayOpacity = "opacity: geoPipOverlayChrome ? 0 : 1,";
  src = src.replace(
    `          position: "absolute",
          inset: 0,
          background: \`
            radial-gradient(circle at 20% 22%`,
    `          position: "absolute",
          inset: 0,
          ${overlayOpacity}
          background: \`
            radial-gradient(circle at 20% 22%`
  );
  src = src.replace(
    `          position: "absolute",
          inset: 0,
          backgroundImage: \`
            linear-gradient(rgba(34,211,238,0.08)`,
    `          position: "absolute",
          inset: 0,
          ${overlayOpacity}
          backgroundImage: \`
            linear-gradient(rgba(34,211,238,0.08)`
  );
  src = src.replace(
    `          position: "absolute",
          inset: 0,
          background: \`
            linear-gradient(90deg, rgba(2,6,23,0.86)`,
    `          position: "absolute",
          inset: 0,
          ${overlayOpacity}
          background: \`
            linear-gradient(90deg, rgba(2,6,23,0.86)`
  );
  src = src.replace(
    `          pointerEvents: "none",
          opacity: 0.52,
        }}
        viewBox={\`0 0 \${width} \${height}\`}`,
    `          pointerEvents: "none",
          opacity: geoPipOverlayChrome ? 0 : 0.52,
        }}
        viewBox={\`0 0 \${width} \${height}\`}`
  );

  if (!src.includes("{!geoPipOverlayChrome ? (")) {
    src = src.replace(
      `      </svg>

      <div
        style={{
          position: "absolute",
          inset: isVertical ? "15% 7% 14%" : "13% 8% 12%",`,
      `      </svg>

      {!geoPipOverlayChrome ? (
      <div
        style={{
          position: "absolute",
          inset: isVertical ? "15% 7% 14%" : "13% 8% 12%",`
    );
    src = src.replace(
      `        </div>
      </div>

      {showPointerLines && (`,
      `        </div>
      </div>
      ) : null}

      {showPointerLines && (`
    );
  }

  src = src.replace(
    `          background: "rgba(8,13,24,0.58)",
          border: "1px solid rgba(34,211,238,0.24)",`,
    `          background: geoPipOverlayChrome ? "transparent" : "rgba(8,13,24,0.58)",
          border: geoPipOverlayChrome ? "none" : "1px solid rgba(34,211,238,0.24)",`
  );

  src = src.replace(
    `          overflow: "hidden",
          opacity: contentProgress,
          transform: \`scale(\${0.96 + contentProgress * 0.04})\`,`,
    `          overflow: "hidden",
          opacity: geoPipOverlayChrome ? 0 : contentProgress,
          transform: geoPipOverlayChrome ? "none" : \`scale(\${0.96 + contentProgress * 0.04})\`,`
  );

  src = src.replace(
    `            transform: \`translate(-50%, -50%) rotate(\${orbitRotation}deg)\`,
            boxShadow: \`0 0 34px \${primaryColor}22\`,
            pointerEvents: "none",
            zIndex: 5,`,
    `            transform: \`translate(-50%, -50%) rotate(\${orbitRotation}deg)\`,
            boxShadow: \`0 0 34px \${primaryColor}22\`,
            pointerEvents: "none",
            opacity: geoPipOverlayChrome ? 0 : 1,
            zIndex: 5,`
  );
  src = src.replace(
    `            transform: \`translate(-50%, -50%) rotate(\${counterOrbitRotation}deg)\`,
            pointerEvents: "none",
            zIndex: 5,`,
    `            transform: \`translate(-50%, -50%) rotate(\${counterOrbitRotation}deg)\`,
            pointerEvents: "none",
            opacity: geoPipOverlayChrome ? 0 : 1,
            zIndex: 5,`
  );

  src = src.replace(
    `    top: isBottom ? undefined : isVertical ? 164 : safePipInset + 24,
    bottom: isBottom ? isVertical ? 132 : safePipInset : undefined,`,
    `    top: isBottom ? undefined : isVertical ? (geoPipOverlayChrome ? 132 : 164) : safePipInset + 24,
    bottom: isBottom ? (geoPipOverlayChrome ? undefined : isVertical ? 132 : safePipInset) : undefined,`
  );

  if (!src.includes("const sceneDurationFrames")) {
    src = src.replace(
      `  const safePipHeight = clamp(toNumber(pipHeight, 230), 120, 520);

  const pipScaleRaw = spring({`,
      `  const safePipHeight = clamp(toNumber(pipHeight, 230), 120, 520);

  const sceneDurationFrames = Math.max(
    1,
    Math.round(toNumber(durationInFrames, 0)) ||
      Math.round(toNumber(durationSeconds, 0) * fps) ||
      90
  );

  const pipScaleRaw = spring({`
    );
  }

  src = src.replace(
    `  const progressPercent = Math.round(
    interpolate(frame, [0, safePipDelayFrames + 36], [0, 100], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );`,
    `  const progressPercent = Math.round(
    interpolate(frame, [0, sceneDurationFrames - 1], [0, 100], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );`
  );

  if (!src.includes("geoPipOverlayChrome ? null : (")) {
    src = src.replace(
      `          ) : (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: \`
                  radial-gradient(circle at 28% 24%, rgba(34,211,238,0.34) 0%, transparent 34%),
                  radial-gradient(circle at 82% 70%, rgba(250,204,21,0.22) 0%, transparent 36%),`,
      `          ) : geoPipOverlayChrome ? null : (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: \`
                  radial-gradient(circle at 28% 24%, rgba(34,211,238,0.34) 0%, transparent 34%),
                  radial-gradient(circle at 82% 70%, rgba(250,204,21,0.22) 0%, transparent 36%),`
    );
  }

  return src;
}
