import surahsData from '../data/surahs.json';

/**
 * 1. УНИВЕРСАЛЬНЫЙ ПОИСК СУРЫ (По номеру или названиям на любых языках)
 */
export function findSurahNumberByText(transcript) {
    if (!transcript) return null;

    // Приводим текст к нижнему регистру и удаляем знаки препинания
    const text = transcript.toLowerCase().replace(/[-.,!?]/g, ' ').trim();

    // А. Если пользователь назвал номер (например: "сура 36" или просто "67")
    const matchNum = text.match(/\d+/);
    if (matchNum) {
        const num = parseInt(matchNum[0], 10);
        if (num >= 1 && num <= 114) return num;
    }

    // Б. Ищем совпадение по нашему словарю surahs.json
    for (const surah of surahsData) {
        for (const alias of surah.names) {
            if (text.includes(alias)) {
                return surah.id;
            }
        }
    }

    return null;
}

/**
 * 2. НАДЕЖНАЯ ЗАГРУЗКА ЭТАЛОНА через EveryAyah CDN (Мишари Рашид)
 */
export async function getAyahData(surahNumber, ayahNumber = 1) {
    try {
        // Форматируем номера в 3 цифры (например: 001, 036, 067)
        const surahPadded = String(surahNumber).padStart(3, '0');
        const ayahPadded = String(ayahNumber).padStart(3, '0');

        // Прямая гарантированная ссылка на чистый аудиофайл с EveryAyah
        const audioUrl = `https://everyayah.com/data/Alafasy_128kbps/${surahPadded}${ayahPadded}.mp3`;

        return {
            surahNumber,
            ayahNumber,
            audioUrl
        };
    } catch (err) {
        console.error('Ошибка получения эталонного аята:', err);
        return null;
    }
}