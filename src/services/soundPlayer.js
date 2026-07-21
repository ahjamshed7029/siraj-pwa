export async function listenAndTranscribe() {
  const audioBlob = await recordAudio(5); // твоя функция записи 5 сек
  const [detectedLang, setDetectedLang] = useState(navigator.language || 'ar-SA');
  // Попытка 1: Groq (самый точный)
  let text = await transcribeWithGroq(audioBlob);
  if (text) return text;

  // Попытка 2: Оффлайн (без лимита)
  try {
    text = await transcribeOffline(audioBlob);
    if (text) return text;
  } catch(e) {}

  // Попытка 3: Браузерный ar-SA
  return await transcribeWithBrowser();
}

const sounds = {
  // Общие такбиры
  correct: '/sounds/mashallah.mp3',
  excellent: '/sounds/subhanallah.mp3',
  wrong: '/sounds/allahu-akbar.mp3', // лучше замени на мягкий звук ошибки
};

let currentAudio = null;
let currentUtterance = null;

export function stopAll() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  window.speechSynthesis.cancel();
  if (currentUtterance) currentUtterance = null;
}

// Мультиязычные фразы учителей
const teacherPhrases = {
  ayisha: {
    ar: { correct: ['ما شاء الله، أحسنتِ!'], wrong: ['حاولي مرة أخرى يا أختي'] },
    ru: { correct: ['Ма ша Аллах, умница!', 'Очень красиво, сестра!'], wrong: ['Сестра, давай еще разок, послушай.', 'Тут нужно потянуть чуть дольше.'] },
    uz: { correct: ['MashaAllah, barakalla!'], wrong: ['Yana bir bor urinib ko\'ring, opa'] },
    en: { correct: ['MashaAllah, excellent!'], wrong: ['Try again please, sister'] }
  },
  hasan: {
    ar: { correct: ['ما شاء الله، أحسنت!'], wrong: ['حاول مرة أخرى يا أخي'] },
    ru: { correct: ['Ма ша Аллах, брат!', 'Хорошо читаешь, продолжаем.'], wrong: ['Брат, небольшая ошибка. Давай еще раз.', 'Обрати внимание на махрадж.'] },
    uz: { correct: ['MashaAllah, zo\'r!'], wrong: ['Yana bir bor, ukam'] },
    en: { correct: ['MashaAllah, great!'], wrong: ['Try once more, brother'] }
  }
};

function getLangCode(detectedLang) {
  if (!detectedLang) return 'en';
  if (detectedLang.startsWith('ar')) return 'ar';
  if (detectedLang.startsWith('ru')) return 'ru';
  if (detectedLang.startsWith('uz')) return 'uz';
  return 'en';
}

export function speakAsTeacher(text, teacherKey = 'hasan', detectedLang = navigator.language) {
  return new Promise((resolve) => {
    stopAll();

    const langCode = getLangCode(detectedLang);
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = null;

    if (teacherKey === 'ayisha') {
      selectedVoice = voices.find(v => v.lang === detectedLang && v.name.toLowerCase().includes('female')) ||
                      voices.find(v => v.lang.startsWith(langCode) && v.name.toLowerCase().includes('female')) ||
                      voices.find(v => v.name.includes('Milena') || v.name.includes('Alena')) ||
                      voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female')) ||
                      voices.find(v => v.lang === 'ru-RU');
    } else {
      selectedVoice = voices.find(v => v.lang === detectedLang && v.name.toLowerCase().includes('male')) ||
                      voices.find(v => v.lang.startsWith(langCode) && v.name.toLowerCase().includes('male')) ||
                      voices.find(v => v.name.includes('Yuri') || v.name.includes('Pavel')) ||
                      voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('male')) ||
                      voices.find(v => v.lang === 'ru-RU');
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedVoice?.lang || detectedLang || 'en-US';
    if (selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = 0.95;
    utterance.pitch = teacherKey === 'ayisha' ? 1.25 : 0.85;
    utterance.volume = 1;

    utterance.onend = () => {
      currentUtterance = null;
      resolve();
    };
    utterance.onerror = () => resolve();

    currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  });
}

export function speakTeacherPhrase(type, teacherKey, detectedLang = navigator.language) {
  const langCode = getLangCode(detectedLang);
  const phrase = teacherPhrases[teacherKey]?.[langCode]?.[type] || teacherPhrases[teacherKey]?.['en']?.[type];
  
  if (!phrase) return Promise.resolve();

  // Pick a random phrase if it is an array
  let selectedText = phrase;
  if (Array.isArray(phrase)) {
      selectedText = phrase[Math.floor(Math.random() * phrase.length)];
  }

  return speakAsTeacher(selectedText, teacherKey, detectedLang);
}

export function playRandomTeacherPhrase(type, teacherKey, detectedLang = navigator.language) {
  // Alias for speakTeacherPhrase since it now handles randomization natively.
  return speakTeacherPhrase(type, teacherKey, detectedLang);
}

export function playAyahAudio(url) {
  return new Promise((resolve, reject) => {
    stopAll();
    currentAudio = new Audio(url);
    currentAudio.onended = () => {
      currentAudio = null;
      resolve();
    };
    currentAudio.onerror = reject;
    currentAudio.play().catch(reject);
  });
}

export function playFeedbackSound(isCorrect) {
  stopAll();
  const src = isCorrect ? sounds.correct : sounds.wrong;
  currentAudio = new Audio(src);
  currentAudio.volume = 0.6;
  currentAudio.play().catch(() => {});
}