import { GoogleGenAI } from "@google/genai";

// Fungsi jeda singkat (delay) sebelum mencoba ulang
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ 
                error: 'GEMINI_API_KEY belum terpasang di Vercel.' 
            });
        }

        const { imageBase64 } = req.body;
        if (!imageBase64) {
            return res.status(400).json({ error: 'Data gambar kosong.' });
        }

        const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

        const prompt = "Anda adalah pemandu budaya Bali virtual. Identifikasi objek budaya Bali di gambar ini. Jika berkaitan dengan Dewata Nawa Sanga (seperti Canang, Kain Poleng, Bunga, Dupa, Pelinggih, dll) atau budaya spiritual Bali, jelaskan maknanya secara filosofis dalam 2 kalimat singkat yang menarik menggunakan bahasa Indonesia. Jika tidak dikenali atau bukan objek budaya, katakan dengan sopan: 'Maaf, saya belum mengenali objek budaya pada gambar ini.'";

        const contents = [
            prompt,
            {
                inlineData: {
                    data: imageBase64,
                    mimeType: "image/jpeg"
                }
            }
        ];

        // Gunakan urutan model yang paling stabil kapasitas servernya
       // Ganti baris const models = [...] menjadi:
        const models = ["gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-2.5-flash-lite"];
        let responseText = null;
        let lastError = null;

        for (const modelName of models) {
            try {
                const response = await ai.models.generateContent({
                    model: modelName,
                    contents: contents
                });
                responseText = response.text;
                break; 
            } catch (err) {
                console.warn(`Model ${modelName} gagal (${err.status || err.message}), mencoba cadangan...`);
                lastError = err;
                await delay(600); // Beri jeda 0.6 detik sebelum pindah server
            }
        }

        if (!responseText) {
            throw lastError || new Error("Semua server AI sedang sibuk.");
        }

        return res.status(200).json({ text: responseText });

    } catch (error) {
        console.error("Gemini API Error:", error);
        return res.status(500).json({ 
            error: 'Server AI Google sedang sibuk (503). Tunggu 3 detik lalu tekan Scan lagi.' 
        });
    }
}
