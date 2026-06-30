import { callAI } from './openRouterClient';
import { useAppStore } from '../store/useAppStore';

// Определение языка по тексту (без внешних API)
function detectLanguage(text) {
    const cleanText = text.toLowerCase().trim();

    // Арабский
    const arabicRegex = /[\u0600-\u06FF]/;
    if (arabicRegex.test(cleanText)) {
        return 'ar';
    }

    // Английский
    const englishWords = ['hello', 'hi', 'yes', 'no', 'thank', 'please', 'good', 'bad', 'what', 'where', 'when', 'why', 'how', 'i am', 'my name'];
    if (englishWords.some(word => cleanText.includes(word))) {
        return 'en';
    }

    // Турецкий
    const turkishWords = ['merhaba', 'selam', 'evet', 'hayır', 'teşekkür', 'lütfen', 'iyi', 'kötü', 'ben', 'adım'];
    if (turkishWords.some(word => cleanText.includes(word))) {
        return 'tr';
    }

    // Узбекский
    const uzbekWords = ['salom', 'assalom', 'ha', 'yo\'q', 'rahmat', 'iltimos', 'yaxshi', 'yomon', 'men', 'ismim'];
    if (uzbekWords.some(word => cleanText.includes(word))) {
        return 'uz';
    }

    // Русский (по умолчанию если есть кириллица)
    const cyrillicRegex = /[\u0400-\u04FF]/;
    if (cyrillicRegex.test(cleanText)) {
        return 'ru';
    }

    return 'ru'; // Default
}

// Языковые приветствия
const GREETINGS = {
    ru: {
        male: 'Ассаляму алейкум, мой дорогой брат!',
        female: 'Ассаляму алейкум, моя дорогая сестра!',
        neutral: 'Ассаляму алейкум!'
    },
    ar: {
        male: 'السلام عليكم يا أخي العزيز',
        female: 'السلام عليكم يا أختي العزيزة',
        neutral: 'السلام عليكم'
    },
    en: {
        male: 'Peace be upon you, my dear brother!',
        female: 'Peace be upon you, my dear sister!',
        neutral: 'Peace be upon you!'
    },
    tr: {
        male: 'Selamün aleyküm, sevgili kardeşim!',
        female: 'Selamün aleyküm, sevgili kız kardeşim!',
        neutral: 'Selamün aleyküm!'
    },
    uz: {
        male: 'Assalomu alaykum, aziz birodarim!',
        female: 'Assalomu alaykum, aziz opam!',
        neutral: 'Assalomu alaykum!'
    }
};

const PERSONAS = {
    hassan: {
        ru: "Ты Хасан, терпеливый мужчина-учитель Корана. Говори ясно и кратко. Обращайся к ученику как 'брат' если он мужчина, или 'сестра' если женщина.",
        ar: "أنت حسن، معلم قرآن صبور. تحدث بوضوح واختصار. خاطب الطالب بـ 'أخي' إذا كان رجلاً، أو 'أختي' إذا كانت امرأة.",
        en: "You are Hassan, a patient male Quran teacher. Speak clearly and briefly. Address the student as 'brother' if male, or 'sister' if female.",
        tr: "Sen Hassan, sabırlı bir erkek Kur'an öğretmenisin. Açık ve kısa konuş. Öğrenciye erkekse 'kardeşim', kadınsa 'kız kardeşim' diye hitap et.",
        uz: "Sen Hassan, sabrli erkak Qur'on o'qituvchisan. Aniq va qisqa gapir. O'quvchiga erkak bo'lsa 'birodar', ayol bo'lsa 'opa' deb murojaat qil."
    },
    aisha: {
        ru: "Ты Аиша, добрая женщина-учитель Корана. Говори ясно и кратко. Обращайся к ученику как 'брат' если он мужчина, или 'сестра' если женщина.",
        ar: "أنت عائشة، معلمة قرآن لطيفة. تحدثي بوضوح واختصار. خاطبي الطالب بـ 'أخي' إذا كان رجلاً، أو 'أختي' إذا كانت امرأة.",
        en: "You are Aisha, a warm female Quran teacher. Speak clearly and briefly. Address the student as 'brother' if male, or 'sister' if female.",
        tr: "Sen Aişe, sıcak bir kadın Kur'an öğretmenisin. Açık ve kısa konuş. Öğrenciye erkekse 'kardeşim', kadınsa 'kız kardeşim' diye hitap et.",
        uz: "Sen Aisha, mehribon ayol Qur'on o'qituvchisan. Aniq va qisqa gapir. O'quvchiga erkak bo'lsa 'birodar', ayol bo'lsa 'opa' deb murojaat qil."
    }
};

const FORCED = {
    ru: "НИКОГДА не используй Markdown или спецсимволы. Выводи ТОЛЬКО чистый текст для озвучивания. Отвечай кратко, 1-2 предложения. Используй 'Субханаллах' за правильное чтение. Используй 'Машааллах' за мелкие ошибки. Используй 'Аллаху Акбар' за серьезные ошибки.",
    ar: "لا تستخدم أبداً Markdown أو الرموز الخاصة. أخرج نصاً فقط للقراءة الصوتية. أجب باختصار، 1-2 جمل. استخدم 'سبحان الله' للقراءة الصحيحة. استخدم 'ما شاء الله' للأخطاء البسيطة. استخدم 'الله أكبر' للأخطاء الجسيمة.",
    en: "NEVER use Markdown or special characters. Output ONLY clean text for voice synthesis. Reply briefly, 1-2 sentences. Use 'Subhanallah' for correct recitation. Use 'Mashaallah' for minor mistakes. Use 'Allahu Akbar' for serious mistakes.",
    tr: "ASLA Markdown veya özel karakterler kullanma. Sadece ses sentezi için temiz metin çıkar. Kısa cevap ver, 1-2 cümle. Doğru okuma için 'Sübhanallah' kullan. Küçük hatalar için 'Maşallah' kullan. Ciddi hatalar için 'Allahu Ekber' kullan.",
    uz: "HECH QACHON Markdown yoki maxsus belgilarni ishlatma. Faqat ovoz chiqarish uchun toza matn chiqar. Qisqa javob ber, 1-2 jumla. To'g'ri o'qish uchun 'Subhanalloh' ishlat. Kichik xatolar uchun 'Mashaalloh' ishlat. Jiddiy xatolar uchun 'Allohu Akbar' ishlat."
};

function detectGender(text) {
    const lower = text.toLowerCase();
    const maleWords = ['мужчина', 'мальчик', 'брат', 'мужской', 'я парень', 'я мужчина', 'брат', 'son', 'man', 'boy', 'brother', 'male', 'أنا ذكر', 'أخي', 'ولد', 'رجل', 'erkak', 'aka', 'birodar', 'o\'g\'il'];
    const femaleWords = ['женщина', 'девочка', 'сестра', 'женский', 'я девушка', 'я женщина', 'дочь', 'daughter', 'woman', 'girl', 'sister', 'female', 'أنا أنثى', 'أختي', 'بنت', 'امرأة', 'ayol', 'opa', 'singil', 'qiz'];

    for (const w of femaleWords) {
        if (lower.includes(w)) return 'female';
    }
    for (const w of maleWords) {
        if (lower.includes(w)) return 'male';
    }
    return null;
}

export async function getTeacherResponse(studentText) {
    const store = useAppStore.getState();
    const { stage, mentorName, currentSurah, currentAyah, ayahText, studentGender } = store;

    // Определяем язык пользователя
    const userLang = detectLanguage(studentText);
    const detectedLang = userLang || 'ru';

    // Stage: greeting - определяем пол и язык
    if (stage === 'greeting') {
        const gender = detectGender(studentText);

        if (gender) {
            const newMentor = gender === 'male' ? 'hassan' : 'aisha';
            store.setGender(gender);
            store.setMentor(newMentor);
            store.setDetectedLang(detectedLang);

            const mentorLabel = newMentor === 'hassan' ?
                (detectedLang === 'ar' ? 'حسن' : detectedLang === 'en' ? 'Hassan' : detectedLang === 'tr' ? 'Hasan' : detectedLang === 'uz' ? 'Hasan' : 'Хасан') :
                (detectedLang === 'ar' ? 'عائشة' : detectedLang === 'en' ? 'Aisha' : detectedLang === 'tr' ? 'Aişe' : detectedLang === 'uz' ? 'Aisha' : 'Аиша');

            const genderLabel = gender === 'male' ?
                (detectedLang === 'ar' ? 'أخي' : detectedLang === 'en' ? 'brother' : detectedLang === 'tr' ? 'kardeşim' : detectedLang === 'uz' ? 'birodar' : 'брат') :
                (detectedLang === 'ar' ? 'أختي' : detectedLang === 'en' ? 'sister' : detectedLang === 'tr' ? 'kız kardeşim' : detectedLang === 'uz' ? 'opa' : 'сестра');

            let greeting = '';
            if (detectedLang === 'ar') {
                greeting = `السلام عليكم يا ${genderLabel} العزيز. أنا ${mentorLabel}، معلمك القرآن.`;
            } else if (detectedLang === 'en') {
                greeting = `Peace be upon you, dear ${genderLabel}. I am ${mentorLabel}, your Quran teacher.`;
            } else if (detectedLang === 'tr') {
                greeting = `Selamün aleyküm, sevgili ${genderLabel}. Ben ${mentorLabel}, Kur'an öğretmenin.`;
            } else if (detectedLang === 'uz') {
                greeting = `Assalomu alaykum, aziz ${genderLabel}. Men ${mentorLabel}, Qur'on o'qituvchingiz.`;
            } else {
                greeting = `Ассаляму алейкум, мой дорогой ${genderLabel}. Я ${mentorLabel}, ваш учитель Корана.`;
            }

            return {
                text: greeting + ` ${detectedLang === 'ar' ? 'أي سورة تريد أن تتعلم؟' : detectedLang === 'en' ? 'Which surah would you like to study?' : detectedLang === 'tr' ? 'Hangi sureyi öğrenmek istersin?' : detectedLang === 'uz' ? 'Qaysi surani o\'rganmoqchisiz?' : 'Какую суру вы хотите учить?'}`,
                reciter: null,
                color: null,
                nextStage: 'select_surah',
                language: detectedLang
            };
        }

        // Пол не определен - спрашиваем
        let askText = '';
        if (detectedLang === 'ar') {
            askText = 'السلام عليكم. هل أنت أخ أم أخت؟';
        } else if (detectedLang === 'en') {
            askText = 'Peace be upon you. Are you a brother or sister?';
        } else if (detectedLang === 'tr') {
            askText = 'Selamün aleyküm. Kardeş misiniz, kız kardeş mi?';
        } else if (detectedLang === 'uz') {
            askText = 'Assalomu alaykum. Siz birodarmisiz yoki opamisiz?';
        } else {
            askText = 'Ассаляму алейкум. Вы брат или сестра?';
        }

        return {
            text: askText,
            reciter: null,
            color: null,
            nextStage: 'greeting',
            language: detectedLang
        };
    }

    // Stage: select surah
    if (stage === 'select_surah') {
        const persona = PERSONAS[mentorName]?.[detectedLang] || PERSONAS.hassan.ru;
        const forced = FORCED[detectedLang] || FORCED.ru;
        const systemPrompt = `${persona} ${forced} Student wants to study Quran. Ask which surah by number or name. If they said a surah name, respond with SURAH:number where number is 1-114, and nothing else. Respond in ${detectedLang.toUpperCase()} language.`;

        const aiText = await callAI(systemPrompt, studentText);

        const surahMatch = aiText.match(/SURAH:(\d+)/);
        if (surahMatch) {
            const num = parseInt(surahMatch[1]);
            if (num >= 1 && num <= 114) {
                store.setAyah(num, 1, '', '');

                let askReciter = '';
                if (detectedLang === 'ar') {
                    askReciter = `سورة ${num}. أي قارئ تحب؟ مثلاً مشاري العفاسي، عبد الباسط، حصري، منشاوي.`;
                } else if (detectedLang === 'en') {
                    askReciter = `Surah ${num}. Which reciter do you like? For example Mishari Alafasy, Abdulbasit, Husary, Minshawi.`;
                } else if (detectedLang === 'tr') {
                    askReciter = `Sure ${num}. Hangi hafızı seversin? Örneğin Mişari Afasi, Abdülbasit, Husari, Minşavi.`;
                } else if (detectedLang === 'uz') {
                    askReciter = `Sura ${num}. Qaysi qoriyni yoqtirasiz? Masalan Mishari Alafasy, Abdulbasit, Husary, Minshawi.`;
                } else {
                    askReciter = `Сура ${num}. Какой чтец вам нравится? Например Мишари Афаси, Абдульбасит, Хусари, Миншави.`;
                }

                return {
                    text: askReciter,
                    reciter: null,
                    color: null,
                    nextStage: 'quran_practice',
                    language: detectedLang
                };
            }
        }

        return {
            text: aiText,
            reciter: null,
            color: null,
            nextStage: 'select_surah',
            language: detectedLang
        };
    }

    // Stage: quran practice
    if (stage === 'quran_practice') {
        const persona = PERSONAS[mentorName]?.[detectedLang] || PERSONAS.hassan.ru;
        const forced = FORCED[detectedLang] || FORCED.ru;

        // Проверяем, есть ли аят
        const ayahDisplay = ayahText || 'загрузка...';

        const systemPrompt = (
            `${persona} ${forced} `
            + `Correct ayah text: "${ayahDisplay}". `
            + `Student said: "${studentText}". `
            + `Assess recitation. If correct say ${detectedLang === 'ar' ? 'سبحان الله' : detectedLang === 'en' ? 'Subhanallah' : detectedLang === 'tr' ? 'Sübhanallah' : detectedLang === 'uz' ? 'Subhanalloh' : 'Субханаллах'}. `
            + `Minor mistakes say ${detectedLang === 'ar' ? 'ما شاء الله' : detectedLang === 'en' ? 'Mashaallah' : detectedLang === 'tr' ? 'Maşallah' : detectedLang === 'uz' ? 'Mashaalloh' : 'Машааллах'}. `
            + `Serious mistakes say ${detectedLang === 'ar' ? 'الله أكبر' : detectedLang === 'en' ? 'Allahu Akbar' : detectedLang === 'tr' ? 'Allahu Ekber' : detectedLang === 'uz' ? 'Allohu Akbar' : 'Аллаху Акбар'}. `
            + `If student asks for a reciter, respond with ONLY RECITER:ar.name and nothing else. `
            + `Available: ar.alafasy, ar.abdulbasitmurattal, ar.husary, ar.minshawi, ar.abdurrahmaansudais. `
            + `Respond in ${detectedLang.toUpperCase()} language.`
        );

        const aiText = await callAI(systemPrompt, studentText);

        // Check reciter request
        const reciterMatch = aiText.match(/RECITER:(ar\.\w+)/);
        if (reciterMatch) {
            return {
                text: '',
                reciter: reciterMatch[1],
                color: null,
                nextStage: 'quran_practice',
                language: detectedLang
            };
        }

        // Detect color
        let color = null;
        const colorWords = {
            ar: ['الله أكبر', 'أكبر'],
            en: ['Allahu Akbar', 'allahu akbar'],
            tr: ['Allahu Ekber', 'allahuekber'],
            uz: ['Allohu Akbar', 'allohu akbar'],
            ru: ['Аллаху Акбар', 'акбар']
        };
        const mashaWords = {
            ar: ['ما شاء الله'],
            en: ['Mashaallah', 'mashaallah'],
            tr: ['Maşallah', 'masallah'],
            uz: ['Mashaalloh', 'mashaalloh'],
            ru: ['Машааллах', 'машааллах']
        };
        const subhanWords = {
            ar: ['سبحان الله'],
            en: ['Subhanallah', 'subhanallah'],
            tr: ['Sübhanallah', 'subhanallah'],
            uz: ['Subhanalloh', 'subhanalloh'],
            ru: ['Субханаллах', 'субханаллах']
        };

        if ((colorWords[detectedLang] || colorWords.ru).some(w => aiText.includes(w))) color = 'red';
        else if ((mashaWords[detectedLang] || mashaWords.ru).some(w => aiText.includes(w))) color = 'yellow';
        else if ((subhanWords[detectedLang] || subhanWords.ru).some(w => aiText.includes(w))) color = 'green';

        return {
            text: aiText,
            reciter: null,
            color,
            nextStage: 'quran_practice',
            language: detectedLang
        };
    }

    // Fallback
    const fallbackTexts = {
        ar: 'أعد من فضلك.',
        en: 'Please repeat.',
        tr: 'Lütfen tekrar edin.',
        uz: 'Iltimos, takrorlang.',
        ru: 'Повтори пожалуйста.'
    };

    return {
        text: fallbackTexts[detectedLang] || fallbackTexts.ru,
        reciter: null,
        color: null,
        nextStage: stage,
        language: detectedLang
    };
}