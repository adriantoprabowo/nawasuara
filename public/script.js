const video = document.getElementById('videoElement');
const canvas = document.getElementById('canvasElement');
const scanBtn = document.getElementById('scanBtn');
const resultContainer = document.getElementById('resultContainer');
const loadingIndicator = document.getElementById('loadingIndicator');
const resultText = document.getElementById('resultText');

// 1. Inisialisasi Kamera (Prioritas kamera belakang HP, cadangan kamera laptop)
async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' },
            audio: false
        });
        video.srcObject = stream;
        await video.play();
    } catch (err) {
        try {
            const fallbackStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: false
            });
            video.srcObject = fallbackStream;
            await video.play();
        } catch (fallbackErr) {
            alert("Kamera gagal terbuka. Pastikan izin kamera di browser sudah 'Allow'.");
        }
    }
}

startCamera();

// 2. Event Listener Tombol Scan
scanBtn.addEventListener('click', async () => {
    if (!video.srcObject) {
        alert("Kamera belum aktif. Refresh halaman dan izinkan akses kamera.");
        return;
    }

    scanBtn.disabled = true;
    resultContainer.classList.remove('d-none');
    loadingIndicator.classList.remove('d-none');
    resultText.innerHTML = "";
    window.speechSynthesis.cancel(); 

    // Resize gambar maksimal 640px agar ringan
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
        // 3. Kirim gambar ke api/gemini.js
        const response = await fetch('/api/gemini', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64Raw })
        });

        const data = await response.json();
        
        if (!response.ok || data.error) {
            throw new Error(data.error || `Error ${response.status}`);
        }

        // Tampilkan teks jawaban AI
        loadingIndicator.classList.add('d-none');
        resultText.innerHTML = data.text;

        // 4. Bunyikan Suara (Text-to-Speech)
        speakText(data.text);

    } catch (error) {
        loadingIndicator.classList.add('d-none');
        resultText.innerHTML = "Gagal memproses: " + error.message;
    } finally {
        scanBtn.disabled = false;
    }
});

// 5. Fungsi Menyuarakan Teks (Mulut AI)
function speakText(text) {
    if (!('speechSynthesis' in window)) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1.0;
    utterance.pitch = 1.0; 
    
    window.speechSynthesis.speak(utterance);
}
