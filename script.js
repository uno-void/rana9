const video = document.getElementById('kamera');
const canvasFinal = document.getElementById('kanvasFinal');
const ctxFinal = canvasFinal.getContext('2d');
const btnAmbilFoto = document.getElementById('btnAmbilFoto');
const displayCountdown = document.getElementById('countdown');
const flashEffect = document.getElementById('flash');
const statusTeks = document.getElementById('statusTeks');
const pemilihKamera = document.getElementById('pilihKamera');
const hasilOverlay = document.getElementById('hasilOverlay');
const gambarHasil = document.getElementById('gambarHasil');

const totalFrame = 2;
let frameSaatIni = 0;
let fotoTersimpan = [];
let streamSaatIni;
let intervalId = null; 

// 1. PENGATURAN KAMERA
function mulaiKamera(deviceId = null) {
    if (streamSaatIni) {
        streamSaatIni.getTracks().forEach(track => track.stop());
    }
    const constraints = {
        video: { width: { ideal: 1920 }, height: { ideal: 1080 }, deviceId: deviceId ? { exact: deviceId } : undefined }
    };
    navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
            streamSaatIni = stream;
            video.srcObject = stream;
            return navigator.mediaDevices.enumerateDevices();
        })
        .then(perangkatDitemukan)
        .catch(err => {
            console.error("Error Kamera:", err);
            alert("Tidak dapat mengakses kamera.");
        });
}

function perangkatDitemukan(perangkatInfo) {
    const nilaiSebelumnya = pemilihKamera.value;
    pemilihKamera.innerHTML = '';
    perangkatInfo.forEach(perangkat => {
        if (perangkat.kind === 'videoinput') {
            const opsi = document.createElement('option');
            opsi.value = perangkat.deviceId;
            opsi.text = perangkat.label || `Kamera ${pemilihKamera.length + 1}`;
            pemilihKamera.appendChild(opsi);
        }
    });
    if (Array.prototype.slice.call(pemilihKamera.options).some(opsi => opsi.value === nilaiSebelumnya)) {
        pemilihKamera.value = nilaiSebelumnya;
    }
}

mulaiKamera();
pemilihKamera.addEventListener('change', () => mulaiKamera(pemilihKamera.value));

// 2. TOMBOL DAN TRIGGER (MOUSE & KEYBOARD/PEDAL)
btnAmbilFoto.addEventListener('click', () => {
    btnAmbilFoto.disabled = true;
    pemilihKamera.disabled = true;
    frameSaatIni = 0;
    fotoTersimpan = [];
    prosesJepretan();
});

document.addEventListener('keydown', function(event) {
    if(event.code === 'Space') event.preventDefault();
    if ((event.code === 'Space' || event.code === 'Enter') && !btnAmbilFoto.disabled) {
        btnAmbilFoto.click(); 
    }
});

// 3. PROSES HITUNG MUNDUR & JEPRET
function prosesJepretan() {
    statusTeks.innerText = `Mengambil Frame ${frameSaatIni + 1} dari ${totalFrame}...`;
    let hitungMundur = 3;
    displayCountdown.style.display = 'block';
    displayCountdown.innerText = hitungMundur;

    if (intervalId) clearInterval(intervalId);

    intervalId = setInterval(() => {
        hitungMundur--;
        if (hitungMundur > 0) {
            displayCountdown.innerText = hitungMundur;
        } else {
            clearInterval(intervalId);
            displayCountdown.style.display = 'none';
            
            // Efek Flash Visual
            flashEffect.style.opacity = 1;
            setTimeout(() => { flashEffect.style.opacity = 0; }, 150);

            try {
                simpanFrameSementara();
                frameSaatIni++;

                if (frameSaatIni < totalFrame) {
                    setTimeout(prosesJepretan, 2000); 
                } else {
                    statusTeks.innerText = "Memproses hasil akhir...";
                    gabungkanDanUnduh();
                }
            } catch (error) {
                console.error("Kesalahan saat memotret:", error);
                statusTeks.innerText = "Terjadi kesalahan sistem. Silakan coba lagi.";
                resetTombol();
            }
        }
    }, 1000);
}

// 4. CROPPING & MIRRORING FRAME SEMENTARA
function simpanFrameSementara() {
    const kanvasTemp = document.createElement('canvas');
    const tinggiTujuan = Math.floor(video.videoHeight);
    const lebarTujuan = Math.floor(tinggiTujuan * (4 / 3));
    let potongX = Math.floor((video.videoWidth - lebarTujuan) / 2);
    
    if (potongX < 0) potongX = 0;

    kanvasTemp.width = lebarTujuan;
    kanvasTemp.height = tinggiTujuan;
    const ctxTemp = kanvasTemp.getContext('2d');
    
    ctxTemp.translate(kanvasTemp.width, 0);
    ctxTemp.scale(-1, 1);
    
    ctxTemp.drawImage(video, potongX, 0, lebarTujuan, tinggiTujuan, 0, 0, lebarTujuan, tinggiTujuan);
    fotoTersimpan.push(kanvasTemp);
}

// 5. RENDERING AKHIR, TEKS METAFORA, & UPLOAD
function gabungkanDanUnduh() {
    const frameImage = new Image();
    frameImage.src = 'frame_3.png'; 

    frameImage.onload = function() {
        canvasFinal.width = frameImage.width;
        canvasFinal.height = frameImage.height;

        const lebarFoto = canvasFinal.width * 0.94;  
        const tinggiFoto = canvasFinal.height * 0.43; 
        const posisiX = canvasFinal.width * 0.030;    
        const posisiY_Foto1 = canvasFinal.height * 0.0530; 
        const posisiY_Foto2 = canvasFinal.height * 0.500; 

        // A. Gambar Latar Putih
        ctxFinal.fillStyle = '#ffffff';
        ctxFinal.fillRect(0, 0, canvasFinal.width, canvasFinal.height);
        
        // B. Gambar 2 Foto Jepretan
        ctxFinal.drawImage(fotoTersimpan[0], posisiX, posisiY_Foto1, lebarFoto, tinggiFoto);
        ctxFinal.drawImage(fotoTersimpan[1], posisiX, posisiY_Foto2, lebarFoto, tinggiFoto);

        // C. GAMBAR FRAME (Ditaruh sebelum teks agar teks berada paling atas)
        ctxFinal.drawImage(frameImage, 0, 0, canvasFinal.width, canvasFinal.height);

        // E. Ekspor Hasil & Tampilkan Overlay
        const dataURLFinal = canvasFinal.toDataURL('image/jpeg', 1.0);
        const dataURLPolos1 = fotoTersimpan[0].toDataURL('image/jpeg', 1.0);
        const dataURLPolos2 = fotoTersimpan[1].toDataURL('image/jpeg', 1.0);
        
        gambarHasil.src = dataURLFinal;
        hasilOverlay.style.display = 'flex';

        // F. Unduh Otomatis ke Laptop
        function unduhFileLokal(dataURL, namaFile) {
            const link = document.createElement('a');
            link.href = dataURL;
            link.download = namaFile;
            link.click();
        }

        const waktuSekarang = new Date().getTime();
        unduhFileLokal(dataURLFinal, `JedaMakna_Final_${waktuSekarang}.jpg`);
        setTimeout(() => unduhFileLokal(dataURLPolos1, `JedaMakna_Polos1_${waktuSekarang}.jpg`), 300);
        setTimeout(() => unduhFileLokal(dataURLPolos2, `JedaMakna_Polos2_${waktuSekarang}.jpg`), 600);

        // G. Proses Upload ke Cloudinary & Generate QR Code
        const qrContainer = document.getElementById('qrcode');
        qrContainer.innerHTML = '<span style="color:black; font-size:12px; font-weight:bold;">Menyiapkan kode QR...</span>';
        
        const hasilContainer = document.getElementById('hasilContainer');
        setTimeout(() => { hasilContainer.classList.add('split'); }, 1000);
        
        const cloudName = 'djzyqrvxl'; 
        const uploadPreset = 'photoboth'; 
        const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
        
        const formData = new FormData();
        formData.append('file', dataURLFinal); 
        formData.append('upload_preset', uploadPreset);

        fetch(cloudinaryUrl, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if(data.secure_url) {
                const urlPublik = data.secure_url;
                const linkLandingPage = `https://uno-void.github.io/photobooth/unduh.html?foto=${encodeURIComponent(urlPublik)}`;
                qrContainer.innerHTML = ''; 
                
                new QRCode(qrContainer, {
                    text: linkLandingPage,
                    width: 200,
                    height: 200,
                    colorDark : "#000000",
                    colorLight : "#ffffff",
                    correctLevel : QRCode.CorrectLevel.H
                });
            } else {
                console.error("Error dari Cloudinary:", data);
                qrContainer.innerHTML = '<span style="color:red; font-size:12px;">Gagal mengunggah. Cek konfigurasi.</span>';
            }
        })
        .catch(error => {
            console.error('Error saat upload:', error);
            qrContainer.innerHTML = '<span style="color:red; font-size:12px;">Error Koneksi.</span>';
        });

        // H. Auto Reset Layar (Setelah 15 Detik)
        setTimeout(resetTombol, 30000);
    }; 

    frameImage.onerror = function() {
        alert("Peringatan: File 'frame_3.png' tidak ditemukan!");
        statusTeks.innerText = "ERROR: Frame tidak ditemukan.";
        resetTombol();
    };
}

// 6. FUNGSI RESET ANTARMUKA
function resetTombol() {
    hasilOverlay.style.display = 'none';
    statusTeks.innerText = "TEKAN TOMBOL ATAU INJAK PEDAL (SPASI/ENTER) UNTUK MULAI.";
    btnAmbilFoto.disabled = false;
    pemilihKamera.disabled = false;
    btnAmbilFoto.innerText = "📷 MULAI PHOTOBOOTH";
    const hasilContainer = document.getElementById('hasilContainer');
    if (hasilContainer) hasilContainer.classList.remove('split');
}