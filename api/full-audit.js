import axios from "axios";
import { crawlSite } from "./utils/crawler.js";
import { runSeoChecks } from "./utils/seoChecker.js";

/**
 * Full site audit API
 * Example: /api/full-audit?homepage=https://example.com&limit=5&keyword=seo&user-agent=googlebot
 */
export default async function handler(req, res) {
  try {
    const { homepage, limit, keyword, "user-agent": userAgentName } = req.query;

    if (!homepage) {
      return res.status(400).json({ error: "Homepage parameter is required" });
    }

    // Crawl URLs
    const maxUrls = limit ? parseInt(limit, 10) : 5; // default 5
    const urls = await crawlSite(homepage, maxUrls);

    // Define user agents
    const userAgents = {
      chrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      googlebot: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      samsung5g: "Mozilla/5.0 (Linux; Android 13; SM-S901B)",
      iphone13pmax: "Mozilla/5.0 (iPhone14,3; CPU iPhone OS 15_0)"
    };
    const userAgent = userAgents[userAgentName] || userAgents.chrome;

    const results = [];

    // Sequential audit (safer for free tier limits; can be parallelized later)
    for (const url of urls) {
      try {
        // Fetch page
        const response = await axios.get(url, {
          headers: { "User-Agent": userAgent, Accept: "text/html" },
          timeout: 15000
        });

        // Run SEO checks
        const audit = runSeoChecks(response.data, url, keyword);
        results.push({ url, audit });
      } catch (err) {
        results.push({ url, error: err.message });
      }
    }

    return res.status(200).json({
      homepage,
      totalUrls: urls.length,
      auditedUrls: results.length,
      results
    });

  } catch (err) {
    console.error("Full audit error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
