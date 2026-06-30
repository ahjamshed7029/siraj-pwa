async function detectLocation() {
    try {
        // 1. Пытаемся получить часовой пояс прямо из настроек устройства пользователя
        // Например: "Europe/Moscow", "Asia/Tashkent" и т.д.
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Moscow';

        // 2. Получаем системный язык браузера (например: "ru-RU", "uz-UZ", "en-US")
        const systemLang = navigator.language || 'ru-RU';
        const shortLang = systemLang.split('-')[0]; // 'ru', 'uz', 'en'

        // 3. Быстро определяем страну по названию таймзоны (безопасный фолбек)
        let country = 'RU';
        let countryName = 'Россия';
        let city = 'Москва';

        if (timezone.includes('Tashkent') || timezone.includes('Uzbekistan')) {
            country = 'UZ';
            countryName = 'Узбекистан';
            city = 'Ташкент';
        } else if (timezone.includes('Almaty')) {
            country = 'KZ';
            countryName = 'Казахстан';
            city = 'Алматы';
        }

        const locationData = {
            country: country,
            countryName: countryName,
            city: city,
            language: shortLang,
            timezone: timezone
        };

        console.log("📍 Location detected successfully (Device Native):", locationData);
        return locationData;

    } catch (error) {
        console.error("Ошибка детекции, используем дефолт:", error);
        return {
            country: 'RU',
            countryName: 'Россия',
            city: 'Москва',
            language: 'ru',
            timezone: 'Europe/Moscow'
        };
    }
}