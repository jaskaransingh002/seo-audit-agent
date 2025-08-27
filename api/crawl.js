import { crawlSite } from "./utils/crawler.js";

export default async function handler(req, res) {
  try {
    const { homepage, limit } = req.query;

    if (!homepage) {
      return res.status(400).json({ error: "Homepage URL is required" });
    }

    // Convert limit to number or fallback to 20
    const maxUrls = limit ? parseInt(limit, 10) : 20;

    // Call crawler logic
    const urls = await crawlSite(homepage, maxUrls);

    return res.status(200).json({
      homepage,
      count: urls.length,
      urls,
    });
  } catch (error) {
    console.error("Error in crawl API:", error);
    return res.status(500).json({ error: "Failed to crawl site" });
  }
}
