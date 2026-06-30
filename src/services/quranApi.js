const BASE = 'https://api.alquran.cloud/v1';

// Get ayah text in Uthmani script
export async function getAyahText(surah, ayah) {
    const ref = `${surah}:${ayah}`;
    const res = await fetch(`${BASE}/ayah/${ref}/quran-uthmani`);
    const data = await res.json();
    return data.data.text;
}

// Get ayah audio URL for a specific reciter
export function getAyahAudioUrl(surah, ayah, reciter = 'ar.alafasy') {
    const ref = `${surah}:${ayah}`;
    return `${BASE}/ayah/${ref}/${reciter}`;
}

// Get full surah text
export async function getSurahText(surah) {
    const res = await fetch(`${BASE}/surah/${surah}/quran-uthmani`);
    const data = await res.json();
    return data.data.ayahs.map((a) => ({
        number: a.numberInSurah,
        text: a.text,
        audio: a.audio
    }));
}

// Get word-by-word breakdown
export async function getAyahWords(surah, ayah) {
    const ref = `${surah}:${ayah}`;
    const res = await fetch(`${BASE}/ayah/${ref}/editions/quran-word-by-word`);
    const data = await res.json();
    return data.data.words || [];
}

// List of available reciters
export const RECITERS = [
    { id: 'ar.alafasy', name: 'Mishary Alafasy' },
    { id: 'ar.abdulbasitmurattal', name: 'Abdul Basit' },
    { id: 'ar.husary', name: 'Mahmoud Al-Husary' },
    { id: 'ar.minshawi', name: 'Mohammad Al-Minshawi' },
    { id: 'ar.abdurrahmaansudais', name: 'Abdurrahman As-Sudais' },
];