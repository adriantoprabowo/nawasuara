const { GoogleGenerativeAI } = require('@google/generative-ai');

export default async function handler(req, res) {
    // Hanya izinkan method POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { imageBase64 } = req.body;
        
        if (!imageBase64) {
            return res.status(400).json({ error: 'Gambar tidak ditemukan' });
        }

        // Panggil key dari Vercel Environment Variables
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Prompt Sistem yang ketat
        const prompt = "Anda adalah pemandu budaya Bali virtual. Identifikasi objek budaya Bali di gambar ini. Jika berkaitan dengan Dewata Nawa Sanga (seperti Canang, Kain Poleng, Bunga, dll) atau budaya spiritual Bali, jelaskan maknanya secara filosofis dalam 2 kalimat singkat yang menarik menggunakan bahasa Indonesia. Jika tidak dikenali atau bukan objek budaya, katakan dengan sopan: 'Maaf, saya belum mengenali objek budaya pada gambar ini.'";

        // Format data gambar untuk Gemini
        const imageParts = [
            {
                inlineData: {
                    data: imageBase64,
                    mimeType: "image/jpeg"
                }
            }
        ];

        // Eksekusi ke Gemini Multimodal
        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        const text = response.text();

        // Kembalikan teks ke frontend
        res.status(200).json({ text: text });

    } catch (error) {
        console.error("Gemini API Error:", error);
        res.status(500).json({ error: 'Terjadi kesalahan pada server AI.' });
    }
}
