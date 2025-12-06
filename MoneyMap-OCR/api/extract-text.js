// extract-text.js (Updated)

// Function to find the most likely total amount and date using RegEx
const parseTextForAmountAndDate = (text) => {
  let extractedAmount = "";
  let extractedDate = "";

  // 1. Amount Extraction (Looks for numbers ending in .xx)
  const amountRegex = /(\d{1,3}(?:,\d{3})*\.\d{2})/g;
  const amountMatches = [...text.matchAll(amountRegex)];
  
  // Simplistic approach: take the last match and remove commas
  if (amountMatches.length > 0) {
      extractedAmount = amountMatches[amountMatches.length - 1][0].replace(/,/g, '');
  }

  // 2. Date Extraction 
  const dateRegex = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})|(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/g;
  const dateMatch = text.match(dateRegex);

  if (dateMatch) {
    let dateStr = dateMatch[0].trim();
    
    // Check for DD/MM/YYYY or DD.MM.YYYY format (e.g., 17/11/2025)
    // and convert to a reliable YYYY-MM-DD format for parsing.
    const dmyRegex = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/;
    const dmyMatch = dateStr.match(dmyRegex);

    if (dmyMatch) {
      // Convert DD/MM/YYYY to YYYY-MM-DD format: 
      extractedDate = `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
    } else {
      // Use the original format if it's not DD/MM/YYYY (e.g., YYYY-MM-DD or MM/DD/YYYY)
      extractedDate = dateStr;
    }
  }

  return { amount: extractedAmount, date: extractedDate };
};


export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    const OCR_API_KEY = process.env.OCR_API_KEY;
    if (!OCR_API_KEY) {
      return res.status(500).json({ error: "OCR_API_KEY not set" });
    }

    const formData = new URLSearchParams();
    formData.append("base64Image", `data:image/jpeg;base64,${image}`);
    formData.append("language", "eng");
    formData.append("apikey", OCR_API_KEY);
    // --- MODIFICATION START: Add OCREngine=2 for better pre-processing ---
    formData.append("OCREngine", "2");
    // --- MODIFICATION END ---

    const { default: fetch } = await import('node-fetch');

    const response = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      body: formData,
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
      const text = await response.text();
      return res.status(500).json({ error: "OCR API did not return JSON", raw: text });
    }

    const data = await response.json();

    if (!data.ParsedResults || data.ParsedResults.length === 0) {
      // This handler is what is returning "No text detected"
      return res.status(500).json({ error: "No text detected" });
    }

    const rawText = data.ParsedResults[0].ParsedText || "";
    
    const { amount, date } = parseTextForAmountAndDate(rawText);
    
    // Return all three pieces of data: raw text, amount, and date
    return res.status(200).json({ text: rawText, amount, date });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}