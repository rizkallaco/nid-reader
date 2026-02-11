import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { frontImage, backImage } = req.body;

  if (!frontImage || !backImage) {
    return res.status(400).json({ error: 'Missing images' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-3-flash-preview';

    const prompt = `
      Analyze the two provided images of an Egyptian National ID card.
      Extract the following information in Arabic:
      1. National ID Number (الرقم القومي)
      2. Name (الاسم)
      3. Address (العنوان)
      4. Date of Birth (تاريخ الميلاد)
      5. Job (المهنة)
      6. Gender (النوع)
      7. Religion (الديانة)
      8. Marital Status (الحالة الاجتماعية)
      9. Expiry Date (تاريخ الانتهاء)

      Return ONLY a valid JSON object with these keys:
      {
          "national_id": "...",
          "name": "...",
          "address": "...",
          "dob": "...",
          "job": "...",
          "gender": "...",
          "religion": "...",
          "marital_status": "...",
          "expiry_date": "..."
      }
      Do not include markdown formatting. Just the raw JSON.
    `;

    const contents = [
      {
        role: 'user',
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: frontImage,
              mimeType: 'image/jpeg'
            }
          },
          {
            inlineData: {
              data: backImage,
              mimeType: 'image/jpeg'
            }
          }
        ]
      }
    ];

    const result = await ai.models.generateContent({
      model,
      contents,
    });

    const text = result.text;
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const data = JSON.parse(cleanText);

    res.status(200).json(data);
  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({ error: 'Failed to process ID card', details: error.message });
  }
}