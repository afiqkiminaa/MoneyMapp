// --- Core Node.js Utility Imports ---
import { Buffer } from 'buffer';
import { URLSearchParams } from 'url';
import sharp from 'sharp';
import convert from 'heic-convert'; 

// --- Helper Function: parseTextForAmountAndDate (NO CHANGE) ---
const parseTextForAmountAndDate = (text) => {
    let extractedAmount = "";
    let extractedDate = "";

    // Map for converting three-letter month abbreviations to numbers
    const monthMap = {
        'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04', 'MAY': '05', 'JUN': '06',
        'JUL': '07', 'AUG': '08', 'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12'
    };

    // 1. Amount Extraction 
    const amountRegex = /(\d{1,3}(?:,\d{3})*\.\d{2})/g;
    const amountMatches = [...text.matchAll(amountRegex)];
    
    if (amountMatches.length > 0) {
        extractedAmount = amountMatches[amountMatches.length - 1][0].replace(/,/g, '');
    }

    // 2. Date Extraction 
    
    // Pattern A: DD MMM YYYY (e.g., 05 Dec 2025) - Case-insensitive match for month name
    const dmyTextRegex = /(\d{1,2})\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{2,4})/i;
    const dmyTextMatch = text.toUpperCase().match(dmyTextRegex);

    if (dmyTextMatch) {
        // dmyTextMatch[1] = Day, dmyTextMatch[2] = Month Name, dmyTextMatch[3] = Year
        const day = dmyTextMatch[1].padStart(2, '0');
        const month = monthMap[dmyTextMatch[2]];
        const year = dmyTextMatch[3];
        
        // Convert to YYYY-MM-DD format
        extractedDate = `${year}-${month}-${day}`;
        
    } else {
        // Pattern B: Numeric date formats (DD/MM/YYYY, YYYY-MM-DD, etc.)
        const dateRegex = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})|(\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2})/g;
        const dateMatch = text.match(dateRegex);

        if (dateMatch) {
            let dateStr = dateMatch[0].trim();
            
            // Check for DD/MM/YYYY or DD.MM.YYYY format 
            const dmyRegex = /^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/;
            const dmyMatch = dateStr.match(dmyRegex);

            if (dmyMatch) {
                // Convert DD/MM/YYYY to YYYY-MM-DD format:
                extractedDate = `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
            } else {
                // Use the original format (e.g., YYYY-MM-DD or MM/DD/YYYY)
                extractedDate = dateStr;
            }
        }
    }

    return { amount: extractedAmount, date: extractedDate };
};

// --- Main Handler Function (WITH VALIDATION ADDED) ---
export default async function handler(req, res) {
    try {
        if (req.method !== "POST") {
            return res.status(405).json({ error: "Method not allowed" });
        }

        let { image, fileType } = req.body; 

        if (!image) {
            return res.status(400).json({ error: "No image provided" });
        }
        
        const OCR_API_KEY = process.env.OCR_API_KEY;
        if (!OCR_API_KEY) {
            return res.status(500).json({ error: "OCR_API_KEY not set" });
        }

        let imageBuffer = Buffer.from(image, 'base64');
        let mimeType = 'image/png';

        // 1. HEIC/HEIF Conversion Logic
        const normalizedFileType = fileType ? fileType.toLowerCase() : '';
        if (normalizedFileType === 'heic' || normalizedFileType === 'heif') {
            try {
                imageBuffer = await convert({
                    buffer: imageBuffer,
                    format: 'JPEG', 
                    quality: 0.9      
                });
                mimeType = 'image/jpeg';
            } catch (conversionError) {
                console.error("HEIC Conversion Failed. Proceeding with original image data:", conversionError.message);
                mimeType = 'image/png'; 
            }
        }
        
        // 2. Resizing and Compression using SHARP
        try {
            imageBuffer = await sharp(imageBuffer)
                .resize({ width: 1024, withoutEnlargement: true })
                .jpeg({ quality: 85 })
                .toBuffer();
            
            mimeType = 'image/jpeg'; 
        } catch (sharpError) {
             console.error("Image Resizing/Compression Failed:", sharpError.message);
        }

        // 3. Convert final processed buffer back to base64 string
        image = imageBuffer.toString('base64');
        
        // 4. Prepare Form Data for OCR.space API
        const formData = new URLSearchParams();
        formData.append("base64Image", `data:${mimeType};base64,${image}`);
        formData.append("language", "eng");
        formData.append("apikey", OCR_API_KEY);

        const { default: fetch } = await import('node-fetch');

        // 5. Call the OCR API
        const response = await fetch("https://api.ocr.space/parse/image", {
            method: "POST",
            body: formData,
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });

        // 6. Handle API Response
        const contentType = response.headers.get("content-type") || "";

        if (!contentType.includes("application/json")) {
            const text = await response.text();
            return res.status(500).json({ error: "OCR API did not return JSON", raw: text });
        }

        const data = await response.json();

        if (!data.ParsedResults || data.ParsedResults.length === 0) {
            const errorMessage = data.ErrorMessage || "No text detected or API call failed.";
            return res.status(500).json({ error: errorMessage });
        }

        const rawText = data.ParsedResults[0].ParsedText || "";
        
        // 7. Extract Amount and Date
        const { amount, date } = parseTextForAmountAndDate(rawText);
        
        // 8. FINAL VALIDATION CHECK FOR RECEIPT DATA
        if (!amount || !date) {
            // If the parser couldn't find a valid amount or date, assume it's a "wrong file" (not a receipt).
            return res.status(400).json({ 
                error: "Wrong file or document type. Could not extract a valid amount and date.",
                details: { 
                    rawText: rawText,
                    extractedAmount: amount,
                    extractedDate: date
                }
            });
        }
        
        // 9. Success Response
        return res.status(200).json({ text: rawText, amount, date });

    } catch (err) {
        console.error("Handler Execution Error:", err.message);
        return res.status(500).json({ error: `Internal Server Error: ${err.message}` });
    }
}