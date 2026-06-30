const sounds = {
    green: '/sounds/subhanallah.mp3',
    yellow: '/sounds/mashallah.mp3',
    red: '/sounds/allahu-akbar.mp3',
};

let currentAudio = null;

export function playFeedbackSound(color) {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }

    const src = sounds[color];
    if (!src) return;

    currentAudio = new Audio(src);
    currentAudio.volume = 0.6;
    currentAudio.play().catch(() => { });
}

export function playAyahAudio(url) {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }

    currentAudio = new Audio(url);
    currentAudio.play().catch(() => { });
    return currentAudio;
}