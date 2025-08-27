import * as cheerio from "cheerio";

/**
 * Extract metadata
 */
export function checkMetadata($) {
  const title = $("title").text() || null;
  const description = $('meta[name="description"]').attr("content") || null;
  const canonical = $('link[rel="canonical"]').attr("href") || null;
  const robots = $('meta[name="robots"]').attr("content")?.toLowerCase() || null;
  return { title, description, canonical, robots };
}

/**
 * Extract structured data & microdata
 */
export function checkStructuredData($, html) {
  let types = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html());
      if (Array.isArray(json)) {
        types.push(...json.map(j => j["@type"]).filter(Boolean));
      } else if (json["@type"]) {
        types.push(json["@type"]);
      }
    } catch {}
  });
  const hasMicrodata = /itemscope|itemtype|itemprop/i.test(html);
  return { types: Array.from(new Set(types)), hasMicrodata };
}

/**
 * Extract Open Graph tags
 */
export function checkOpenGraph($) {
  return {
    ogTitle: $('meta[property="og:title"]').attr("content") || null,
    ogDescription: $('meta[property="og:description"]').attr("content") || null,
    ogImage: $('meta[property="og:image"]').attr("content") || null
  };
}

/**
 * Heading counts
 */
export function checkHeadings($) {
  return {
    h1: $("h1").length,
    h2: $("h2").length,
    h3: $("h3").length,
    h4: $("h4").length,
    h5: $("h5").length,
    h6: $("h6").length
  };
}

/**
 * Link stats (internal vs external)
 */
export function checkLinks($, baseUrl) {
  let internal = 0, external = 0;
  $("a").each((_, el) => {
    const href = $(el).attr("href") || "";
    if (href.startsWith("/") || href.includes(new URL(baseUrl).hostname)) {
      internal++;
    } else {
      external++;
    }
  });
  return { total: $("a").length, internal, external };
}

/**
 * Anchor text extraction
 */
export function extractAnchors($, baseUrl) {
  const anchors = [];
  $("a").each((i, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim() || "[No visible text]";
    const rel = $(el).attr("rel") || "";
    const linkType = rel.includes("nofollow") ? "nofollow" : "dofollow";
    const isInternal = href.startsWith("/") || href.includes(new URL(baseUrl).hostname);
    anchors.push({ index: i + 1, href, text, type: linkType, isInternal });
  });
  return anchors;
}

/**
 * Image alt checks
 */
export function checkImages($) {
  const images = [];
  $("img").each((i, el) => {
    const src = $(el).attr("src") || "[No src]";
    const alt = $(el).attr("alt") || "[Missing alt]";
    images.push({ index: i + 1, src, alt, missing: alt === "[Missing alt]" });
  });
  return {
    total: images.length,
    missingAlt: images.filter(i => i.missing).length,
    details: images
  };
}

/**
 * Detect content intent
 */
export function detectIntent(text) {
  const lower = text.toLowerCase();
  if (/(buy|purchase|order|discount|coupon|deal)/.test(lower)) return "Transactional";
  if (/(how to|what is|guide|tutorial|tips|learn)/.test(lower)) return "Informational";
  if (/(login|sign in|homepage|official site)/.test(lower)) return "Navigational";
  if (/(best|compare|review|top|vs|alternative)/.test(lower)) return "Commercial Investigation";
  return "Unknown";
}

/**
 * Keyword usage frequency & stuffing detection
 */
export function checkKeywordUsage(text, keyword) {
  if (!keyword) return { keywordFrequency: 0, keywordStuffing: false };
  const normalizedText = text.toLowerCase();
  const normalizedKeyword = keyword.toLowerCase().trim();
  const regex = new RegExp(`\\b${normalizedKeyword.replace(/\s+/g, "\\s+")}\\b`, "gi");
  const matches = normalizedText.match(regex) || [];
  const frequency = matches.length;
  const words = text.split(/\s+/).filter(Boolean);
  const usageRatio = words.length > 0 ? frequency / words.length : 0;
  return {
    keywordFrequency: frequency,
    keywordStuffing: frequency > 30 || usageRatio > 0.05
  };
}

/**
 * Generate SEO suggestions based on issues
 */
export function generateSuggestions({
  keyword, keywordFrequency, keywordStuffing,
  headings, links, images
}) {
  const suggestions = [];
  if (keyword && keywordStuffing) {
    suggestions.push(
      `The keyword "${keyword}" appears ${keywordFrequency} times, which may be excessive.`
    );
  }
  if (headings.h1 === 0) suggestions.push("No <h1> tag found.");
  if (links.internal === 0) suggestions.push("No internal links found.");
  if (images.missingAlt > 0) suggestions.push(`${images.missingAlt} images are missing alt attributes.`);
  return suggestions;
}

/**
 * Full SEO audit function
 */
export function runSeoChecks(html, url, keyword) {
  const $ = cheerio.load(html);
  const metadata = checkMetadata($);
  const structuredData = checkStructuredData($, html);
  const openGraph = checkOpenGraph($);
  const headings = checkHeadings($);
  const links = checkLinks($, url);
  const anchors = extractAnchors($, url);
  const images = checkImages($);

  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
  const intent = detectIntent(bodyText);
  const { keywordFrequency, keywordStuffing } = checkKeywordUsage(bodyText, keyword);

  const suggestions = generateSuggestions({
    keyword, keywordFrequency, keywordStuffing, headings, links, images
  });

  return {
    metadata,
    structuredData,
    openGraph,
    headings,
    links,
    anchors,
    images,
    wordCount,
    intent,
    keyword,
    keywordFrequency,
    keywordStuffing,
    suggestions
  };
}
