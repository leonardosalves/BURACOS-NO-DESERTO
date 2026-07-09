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

export function patchGeoPipTemplateSourceForChrome(code = "") {
  if (!isGeoPipTemplateSource(code)) return String(code || "");
  let src = String(code);

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

  if (!src.includes("geoPipOverlayChrome")) {
    src = src.replace(
      `  textColor?: string;
};`,
      `  textColor?: string;
  geoPipOverlayChrome?: boolean;
};`
    );
    src = src.replace(
      `  textColor = "#ffffff",
}: EngineeringPictureInPictureProps)`,
      `  textColor = "#ffffff",
  geoPipOverlayChrome = false,
}: EngineeringPictureInPictureProps)`
    );
  }

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
          opacity: geoPipOverlayChrome ? 0.12 : 0.52,
        }}
        viewBox={\`0 0 \${width} \${height}\`}`
  );

  return src;
}
