let mediaRecorder = null;
let audioChunks = [];

export async function startRecording() {
    audioChunks = [];
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            }
        });

        let options = {};
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            options = { mimeType: 'audio/webm;codecs=opus' };
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
            options = { mimeType: 'audio/webm' };
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            options = { mimeType: 'audio/mp4' }; // Обязательно для iOS Safari / WebView
        } else if (MediaRecorder.isTypeSupported('audio/aac')) {
            options = { mimeType: 'audio/aac' };
        }

        mediaRecorder = new MediaRecorder(stream, options);

        mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        // Собираем чанки каждые 100мс
        mediaRecorder.start(100);
        console.log("🎙 Запись началась...");
    } catch (err) {
        console.error("Ошибка доступа к микрофону:", err);
    }
}

export function stopRecording() {
    return new Promise((resolve) => {
        if (!mediaRecorder || mediaRecorder.state === 'inactive') {
            return resolve(null);
        }

        mediaRecorder.onstop = () => {
            const mimeType = mediaRecorder.mimeType || 'audio/webm';
            const audioBlob = new Blob(audioChunks, { type: mimeType });

            console.log(`🎙 Запись завершена. Размер: ${audioBlob.size} байт, Тип: ${mimeType}`);

            if (mediaRecorder.stream) {
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
            }
            resolve(audioBlob);
        };

        setTimeout(() => {
            try {
                mediaRecorder.stop();
            } catch (e) {
                console.warn("Ошибка остановки MediaRecorder:", e);
                resolve(null);
            }
        }, 200);
    });
}