import { useCallback } from 'react';

export function useSpeechSynthesis() {
    const speak = useCallback((text, lang) => {
        return new Promise((resolve, reject) => {
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);

            if (lang) utterance.lang = lang;

            const voices = window.speechSynthesis.getVoices();

            if (!lang || lang.startsWith('ar')) {
                const arabicVoice = voices.find(v => v.lang.startsWith('ar'));
                if (arabicVoice) utterance.voice = arabicVoice;
            }

            utterance.rate = 0.9;
            utterance.pitch = 1;

            utterance.onend = () => resolve();
            utterance.onerror = reject;

            window.speechSynthesis.speak(utterance);
        });
    }, []);

    const stop = useCallback(() => {
        window.speechSynthesis.cancel();
    }, []);

    return { speak, stop };
}