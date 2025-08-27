import { GoogleGenerativeAI } from "@google/generative-ai";

// Init Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Only POST allowed" });
    }

    const { auditData } = req.body;
    if (!auditData) {
      return res.status(400).json({ error: "Missing auditData in request body" });
    }

    // Convert auditData to readable format
    const prompt = `
You are an SEO expert. Here is an SEO audit in JSON:
${JSON.stringify(auditData, null, 2)}

Give me 5 key SEO recommendations (clear, actionable, non-generic).
    `;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const result = await model.generateContent(prompt);
    const text = result.response.text();

    return res.status(200).json({ recommendations: text });
  } catch (err) {
    console.error("Recommendation error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}
