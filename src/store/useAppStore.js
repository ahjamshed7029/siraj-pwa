import { create } from 'zustand';

export const useAppStore = create((set) => ({
    launched: false,
    stage: 'greeting',
    mentorName: 'hassan',
    studentGender: '',

    currentSurah: 1,
    currentAyah: 1,
    ayahText: '',
    ayahAudio: '',

    glowColor: null,
    lastResponse: '',
    isListening: false,
    lastTranscript: '',
    detectedLang: '',

    launch: () => set({ launched: true, stage: 'greeting' }),
    setStage: (stage) => set({ stage }),
    setMentor: (mentorName) => set({ mentorName }),
    setGender: (studentGender) => set({ studentGender }),
    setDetectedLang: (detectedLang) => set({ detectedLang }),
    setAyah: (currentSurah, currentAyah, ayahText, ayahAudio) =>
        set({ currentSurah, currentAyah, ayahText, ayahAudio }),
    setGlow: (glowColor) => {
        set({ glowColor });
        if (glowColor) setTimeout(() => set({ glowColor: null }), 3000);
    },
    setResponse: (lastResponse) => set({ lastResponse }),
    setListening: (isListening) => set({ isListening }),
    setTranscript: (lastTranscript) => set({ lastTranscript }),
}));