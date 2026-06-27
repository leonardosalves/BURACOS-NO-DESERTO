const PLATFORM_LIMITS = {
  instagram: { caption: 2200, hashtags: 30 },
  tiktok: { caption: 4000, hashtags: 10 },
  kwai: { caption: 2000, hashtags: 15 },
};

function clip(text = "", max = 2000) {
  const value = String(text || "").trim();
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function parseTags(raw = "") {
  if (Array.isArray(raw)) return raw.map((t) => String(t).trim()).filter(Boolean);
  return String(raw || "")
    .split(/[,;]/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function parseHashtags(raw = "") {
  const text = String(raw || "");
  const fromHash = text.match(/#[\w\u00C0-\u024F]+/gi) || [];
  if (fromHash.length) return fromHash;
  return text
    .split(/\s+/)
    .map((t) => (t.startsWith("#") ? t : `#${t.replace(/\W/g, "")}`))
    .filter((t) => t.length > 1);
}

export function adaptMetadataForPlatforms(parsed = {}, format = "LONG") {
  const title = parsed.recommendedTitle || parsed.titles?.[0]?.text || "";
  const description = parsed.description || "";
  const tags = parseTags(parsed.tags);
  const hashtags = parseHashtags(parsed.hashtags);
  const chapters = parsed.chapters || "";
  const hook = parsed.retentionHook || parsed.hook || "";
  const cta = parsed.midVideoCta || "";

  const ytDescription = [description, chapters ? `\n\n${chapters}` : "", parsed.hashtags ? `\n\n${parsed.hashtags}` : ""]
    .filter(Boolean)
    .join("");

  const igBase = [title, hook, description.split("\n")[0], hashtags.slice(0, 8).join(" ")].filter(Boolean).join("\n\n");
  const ttBase = [title, hook, hashtags.slice(0, 5).join(" "), "#fyp #viral"].filter(Boolean).join(" ");
  const kwBase = [title, hook, hashtags.slice(0, 6).join(" ")].filter(Boolean).join("\n");

  return {
    youtube: {
      title: title.slice(0, 100),
      description: clip(ytDescription, 5000),
      tags: tags.slice(0, format === "SHORT" ? 12 : 15),
      hashtags: hashtags.slice(0, 8),
      chapters,
      category_id: format === "SHORT" ? "22" : "27",
      pinned_comment: parsed.pinnedComment || "",
      privacy: "private",
    },
    instagram: {
      title: clip(igBase, PLATFORM_LIMITS.instagram.caption),
      hashtags: hashtags.slice(0, PLATFORM_LIMITS.instagram.hashtags),
    },
    tiktok: {
      title: clip(ttBase, PLATFORM_LIMITS.tiktok.caption),
      hashtags: hashtags.slice(0, PLATFORM_LIMITS.tiktok.hashtags),
    },
    kwai: {
      title: clip(kwBase, PLATFORM_LIMITS.kwai.caption),
      hashtags: hashtags.slice(0, PLATFORM_LIMITS.kwai.hashtags),
    },
    retention: { hook, cta },
  };
}