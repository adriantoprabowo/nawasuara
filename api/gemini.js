import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ 
                error: 'GEMINI_API_KEY belum terpasang di Vercel Environment Variables.' 
            });
        }

        const { imageBase64 } = req.body;
        if (!imageBase64) {
            return res.status(400).json({ error: 'Data gambar kosong.' });
        }

        const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

        const prompt = "Anda adalah pemandu budaya Bali virtual. Identifikasi objek budaya Bali di gambar ini. Jika berkaitan dengan Dewata Nawa Sanga (seperti Canang, Kain Poleng, Bunga, Dupa, Pelinggih, dll) atau budaya spiritual Bali, jelaskan maknanya secara filosofis dalam 2 kalimat singkat yang menarik menggunakan bahasa Indonesia. Jika tidak dikenali atau bukan objek budaya, katakan dengan sopan: 'Maaf, saya belum mengenali objek budaya pada gambar ini.'";

        const response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: [
                prompt,
                {
                    inlineData: {
                        data: imageBase64,
                        mimeType: "image/jpeg"
                    }
                }
            ]
        });

        return res.status(200).json({ text: response.text });

    } catch (error) {
        console.error("Gemini API Error:", error);
        return res.status(500).json({ 
            error: 'Error Google AI: ' + (error.message || 'Unknown error') 
        });
    }
}
