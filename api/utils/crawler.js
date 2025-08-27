import axios from "axios";
import * as cheerio from "cheerio";

const DEFAULT_LIMIT = 20;

/**
 * Crawl a website based on sitemap/robots/main nav.
 * @param {string} homepage - The homepage URL to start from.
 * @param {number} limit - Max number of URLs to return (default = 20).
 * @returns {Promise<string[]>} - List of URLs
 */
export async function crawlSite(homepage, limit = DEFAULT_LIMIT) {
  const urls = new Set();

  try {
    // 1. Try to fetch sitemap.xml directly
    let sitemapUrls = await fetchSitemapUrls(homepage);
    sitemapUrls.forEach(u => urls.add(u));

    // 2. If no sitemap found, check robots.txt for sitemap entry
    if (urls.size === 0) {
      let robotsSitemapUrls = await fetchRobotsSitemaps(homepage);
      for (let sm of robotsSitemapUrls) {
        let moreUrls = await fetchSitemapUrls(sm);
        moreUrls.forEach(u => urls.add(u));
      }
    }

    // 3. If still empty, fallback to navigation menu links
    if (urls.size === 0) {
      let navUrls = await fetchMainNavigationUrls(homepage);
      navUrls.forEach(u => urls.add(u));
    }

    // 4. Filter out blogs/resources etc (basic filter: exclude "blog", "resource")
    let filtered = Array.from(urls).filter(
      u =>
        !u.includes("/blog") &&
        !u.includes("/resources") &&
        !u.includes("/news")
    );

    // 5. Limit results
    return filtered.slice(0, limit);
  } catch (err) {
    console.error("Crawler error:", err.message);
    return [];
  }
}

// ---------------- Helper Functions ---------------- //

/**
 * Fetch URLs from sitemap (supports parent/child sitemaps).
 */
async function fetchSitemapUrls(siteUrl) {
  let urls = [];
  try {
    let sitemapUrl = siteUrl.endsWith("/")
      ? siteUrl + "sitemap.xml"
      : siteUrl + "/sitemap.xml";

    const { data } = await axios.get(sitemapUrl, { timeout: 10000 });
    const $ = cheerio.load(data, { xmlMode: true });

    $("loc").each((i, el) => {
      urls.push($(el).text());
    });
  } catch (e) {
    // no sitemap found
  }
  return urls;
}

/**
 * Parse robots.txt and extract sitemap URLs if present.
 */
async function fetchRobotsSitemaps(homepage) {
  const sitemapUrls = [];
  try {
    const robotsUrl = homepage.endsWith("/")
      ? homepage + "robots.txt"
      : homepage + "/robots.txt";

    const { data } = await axios.get(robotsUrl, { timeout: 8000 });
    const lines = data.split("\n");
    for (let line of lines) {
      if (line.toLowerCase().startsWith("sitemap:")) {
        sitemapUrls.push(line.split(":")[1].trim());
      }
    }
  } catch (e) {
    // no robots.txt
  }
  return sitemapUrls;
}

/**
 * Fallback: fetch main navigation bar links from homepage.
 */
async function fetchMainNavigationUrls(homepage) {
  let urls = [];
  try {
    const { data } = await axios.get(homepage, { timeout: 10000 });
    const $ = cheerio.load(data);

    $("nav a").each((i, el) => {
      let href = $(el).attr("href");
      if (href && href.startsWith("http")) {
        urls.push(href);
      } else if (href && href.startsWith("/")) {
        // relative URL
        const base = new URL(homepage).origin;
        urls.push(base + href);
      }
    });
  } catch (e) {
    // no nav links found
  }
  return urls;
}
