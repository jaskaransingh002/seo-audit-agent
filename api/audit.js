import axios from "axios";
import { runSeoChecks } from "./utils/seoChecker.js";

/**
 * Audit API endpoint
 * Example: /api/audit?url=https://example.com&keyword=seo&user-agent=googlebot
 */
export default async function handler(req, res) {
  try {
    const { url, keyword, "user-agent": userAgentName } = req.query;

    if (!url) {
      return res.status(400).json({ error: "Missing 'url' parameter" });
    }

    // Define user agents
    const userAgents = {
      chrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      googlebot: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      samsung5g: "Mozilla/5.0 (Linux; Android 13; SM-S901B)",
      iphone13pmax: "Mozilla/5.0 (iPhone14,3; CPU iPhone OS 15_0)"
    };
    const userAgent = userAgents[userAgentName] || userAgents.chrome;

    // Follow redirects manually to capture chain
    let redirectChain = [];
    let currentUrl = url;
    let finalResponse;

    while (true) {
      const response = await axios.get(currentUrl, {
        headers: { "User-Agent": userAgent, Accept: "text/html" },
        maxRedirects: 0,
        validateStatus: () => true
      });

      redirectChain.push({ url: currentUrl, status: response.status });

      if (response.status >= 300 && response.status < 400 && response.headers.location) {
        currentUrl = new URL(response.headers.location, currentUrl).href;
      } else {
        finalResponse = response;
        break;
      }
    }

    if (!finalResponse || finalResponse.status >= 400) {
      throw new Error(`Request failed with status: ${finalResponse?.status}`);
    }

    const html = finalResponse.data;

    // Run SEO checks from utils/seoChecker.js
    const auditResults = runSeoChecks(html, url, keyword);

    // Return combined result
    return res.status(200).json({
      url,
      redirectChain,
      ...auditResults
    });

  } catch (err) {
    console.error("Audit error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
