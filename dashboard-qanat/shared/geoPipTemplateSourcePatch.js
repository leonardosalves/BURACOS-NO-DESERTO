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

  return src;
}