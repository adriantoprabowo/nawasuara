const video = document.getElementById('videoElement');
const canvas = document.getElementById('canvasElement');
const scanBtn = document.getElementById('scanBtn');
const resultContainer = document.getElementById('resultContainer');
const loadingIndicator = document.getElementById('loadingIndicator');
const resultText = document.getElementById('resultText');

let currentStream = null;

// 1. Inisialisasi Kamera dengan Pembersih Sesi Lama (Anti-Blank)
async function startCamera() {
    // Matikan stream lama jika masih nyangkut saat refresh
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }

    try {
        currentStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false
        });
    } catch (err) {
        console.warn("Beralih ke kamera default:", err);
        try {
            currentStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });
        } catch (fallbackErr) {
            alert("Kamera terkunci atau tidak diizinkan. Tutup tab ini lalu buka ulang di tab baru.");
            return;
        }
    }

    video.srcObject = currentStream;
    
    // Pastikan video diputar hanya setelah metadata siap (mencegah layar hitam)
    video.onloadedmetadata = () => {
        video.play().catch(e => console.warn("Autoplay tertahan:", e));
    };
}

startCamera();

// Matikan kamera dengan bersih saat halaman ditutup/di-refresh
window.addEventListener('beforeunload', () => {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
    }
});

// 2. Event Listener Tombol Scan
scanBtn.addEventListener('click', async () => {
    if (!video.srcObject || video.readyState < 2) {
        alert("Kamera masih memuat gambar, tunggu sebentar.");
        return;
    }

    scanBtn.disabled = true;
    resultContainer.classList.remove('d-none');
    loadingIndicator.classList.remove('d-none');
    resultText.innerHTML = "";
    window.speechSynthesis.cancel(); 

    const rawWidth = video.videoWidth || 640;
    const rawHeight = video.videoHeight || 480;
    const MAX_WIDTH = 640;
    const scaleFactor = MAX_WIDTH / rawWidth;
    
    canvas.width = MAX_WIDTH;
    canvas.height = rawHeight * scaleFactor;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const dataURL = canvas.toDataURL('image/jpeg', 0.7);
    const base64Raw = dataURL.split(',')[1];

    try {
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64Raw })
        });

        const data = await response.json();
        
        if (!response.ok || data.error) {
            throw new Error(data.error || `Error ${response.status}`);
        }

        loadingIndicator.classList.add('d-none');
        resultText.innerHTML = data.text;
        speakText(data.text);

    } catch (error) {
        loadingIndicator.classList.add('d-none');
        resultText.innerHTML = "Gagal memproses: " + error.message;
    } finally {
        scanBtn.disabled = false;
    }
});

function speakText(text) {
    if (!('speechSynthesis' in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
}
