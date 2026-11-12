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
            video: { facingMode: 'environment' }
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
    // Validasi: Pastikan kamera sudah siap dan memiliki gambar
    if (!video.videoWidth || !video.videoHeight) {
        alert("Kamera belum siap, tunggu 1-2 detik lalu coba lagi.");
        return;
    }

    // UI Loading State
    scanBtn.disabled = true;
    resultContainer.classList.remove('d-none');
    loadingIndicator.classList.remove('d-none');
    resultText.innerHTML = "";
    
    window.speechSynthesis.cancel(); 

    // PERBAIKAN: Resize gambar ke lebar maksimal 640px agar ringan & lolos limit Vercel
    const MAX_WIDTH = 640;
    const scaleFactor = MAX_WIDTH / video.videoWidth;
    canvas.width = MAX_WIDTH;
    canvas.height = video.videoHeight * scaleFactor;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Kompresi JPEG kualitas 0.7 (cukup tajam untuk AI, ukuran hanya ~40KB)
    const dataURL = canvas.toDataURL('image/jpeg', 0.7);
    const base64Raw = dataURL.split(',')[1];

    // Validasi tambahan jika base64 masih kosong
    if (!base64Raw) {
        loadingIndicator.classList.add('d-none');
        resultText.innerHTML = "Gagal menangkap gambar dari kamera.";
        scanBtn.disabled = false;
        return;
    }

    try {
        // 3. Kirim ke Serverless Function (Backend Vercel)
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64Raw })
        });

        const data = await response.json();
        
        if (!response.ok || data.error) {
            throw new Error(data.error || `Error ${response.status}`);
        }

        // Tampilkan teks di layar
        loadingIndicator.classList.add('d-none');
        resultText.innerHTML = data.text;

        // 4. Mulai Text-to-Speech (Mulut AI)
        speakText(data.text);

    } catch (error) {
        loadingIndicator.classList.add('d-none');
        resultText.innerHTML = "Gagal memproses: " + error.message;
        console.error("Detail Error:", error);
    } finally {
        scanBtn.disabled = false;
    }
});

// Fungsi untuk menyuarakan teks (Web Speech API)
function speakText(text) {
    if (!('speechSynthesis' in window)) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1.0;
    utterance.pitch = 1.0; 
    
    window.speechSynthesis.speak(utterance);
}
