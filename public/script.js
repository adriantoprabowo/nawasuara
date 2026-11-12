const video = document.getElementById('videoElement');
const canvas = document.getElementById('canvasElement');
const scanBtn = document.getElementById('scanBtn');
const resultContainer = document.getElementById('resultContainer');
const loadingIndicator = document.getElementById('loadingIndicator');
const resultText = document.getElementById('resultText');

// 1. Inisialisasi Kamera Belakang (Environment)
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' } // Prioritas kamera belakang
        });
        video.srcObject = stream;
    } catch (err) {
        console.error("Kamera gagal diakses:", err);
        alert("Mohon izinkan akses kamera untuk menggunakan aplikasi ini.");
    }
}

startCamera();

// 2. Event Listener Tombol Scan
scanBtn.addEventListener('click', async () => {
    // UI Loading State
    scanBtn.disabled = true;
    resultContainer.classList.remove('d-none');
    loadingIndicator.classList.remove('d-none');
    resultText.innerHTML = "";
    
    // Hentikan suara jika sedang berbicara
    window.speechSynthesis.cancel(); 

    // Ambil ukuran asli video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    
    // Jepret frame saat ini ke canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Konversi gambar ke format Base64 JPEG (kualitas 0.8)
    const dataURL = canvas.toDataURL('image/jpeg', 0.8);
    
    // Hilangkan prefix "data:image/jpeg;base64," karena backend hanya butuh raw datanya
    const base64Raw = dataURL.split(',')[1];

    try {
        // 3. Kirim ke Serverless Function (Backend Vercel)
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64Raw })
        });

        const data = await response.json();
        
        if (data.error) throw new Error(data.error);

        // Tampilkan teks di layar
        loadingIndicator.classList.add('d-none');
        resultText.innerHTML = data.text;

        // 4. Mulai Text-to-Speech (Mulut AI)
        speakText(data.text);

    } catch (error) {
        loadingIndicator.classList.add('d-none');
        resultText.innerHTML = "Gagal memproses gambar. Coba lagi.";
        console.error(error);
    } finally {
        scanBtn.disabled = false;
    }
});

// Fungsi untuk menyuarakan teks (Web Speech API)
function speakText(text) {
    if (!('speechSynthesis' in window)) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID'; // Logat Indonesia
    utterance.rate = 1.0; // Kecepatan normal
    utterance.pitch = 1.0; 
    
    window.speechSynthesis.speak(utterance);
}
