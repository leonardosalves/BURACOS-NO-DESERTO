/** Patches no TSX PIP geo: esconde chrome vazio e remove badge "% PIP". */

export function isGeoPipTemplateSource(code = "") {
  const src = String(code || "");
  return (
    /EngineeringPictureInPicture/.test(src) ||
    /\{progressPercent\}% PIP/.test(src)
  );
}

function wrapUniqueBlock(src, opener, closer, wrapperPrefix, wrapperSuffix) {
  if (src.includes(wrapperPrefix.trim())) return src;
  const start = src.indexOf(opener);
  if (start < 0) return src;
  const end = src.indexOf(closer, start);
  if (end < 0) return src;
  const block = src.slice(start, end + closer.length);
  return (
    src.slice(0, start) +
    wrapperPrefix +
    block +
    wrapperSuffix +
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

  src = wrapUniqueBlock(
    src,
    `      <div
        style={{
          position: "absolute",
          right: isVertical ? 42 : 68,
          top: isVertical ? 118 : 50,`,
    `      >
        {statusText}
      </div>`,
    "{statusText ? (",
    ") : null}"
  );

  src = wrapUniqueBlock(
    src,
    `          <div
            style={{
              position: "absolute",
              top: 10,
              left: 10,`,
    `            {pipTag}
          </div>`,
    "{pipTag ? (",
    ") : null}"
  );

  const pipBadge = `          <div
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
  src = src.replace(pipBadge, "");

  src = wrapUniqueBlock(
    src,
    `          <div
            style={{
              position: "absolute",
              left: 14,
              right: 14,
              bottom: 14,`,
    `            </div>
          </div>
        </div>`,
    "{(pipTitle || pipSubtitle || coordinateText || distanceText) ? (",
    ") : null}"
  );

  return src;
}