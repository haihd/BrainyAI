/** Languages offered on the Translate page. `name` goes into the prompt, `code` is used for speech. */
export interface TranslateLanguage {
    name: string;
    /** Name in the language itself, shown next to `name`. */
    native: string;
    code: string;
}

export const AUTO_DETECT = 'auto';

export const TRANSLATE_LANGUAGES: TranslateLanguage[] = [
    {name: 'English', native: 'English', code: 'en-US'},
    {name: 'Vietnamese', native: 'Tiếng Việt', code: 'vi-VN'},
    {name: 'Japanese', native: '日本語', code: 'ja-JP'},
    {name: 'Korean', native: '한국어', code: 'ko-KR'},
    {name: 'Chinese (Simplified)', native: '简体中文', code: 'zh-CN'},
    {name: 'Chinese (Traditional)', native: '繁體中文', code: 'zh-TW'},
    {name: 'Thai', native: 'ภาษาไทย', code: 'th-TH'},
    {name: 'Indonesian', native: 'Bahasa Indonesia', code: 'id-ID'},
    {name: 'Malay', native: 'Bahasa Melayu', code: 'ms-MY'},
    {name: 'Hindi', native: 'हिन्दी', code: 'hi-IN'},
    {name: 'Arabic', native: 'العربية', code: 'ar-SA'},
    {name: 'Turkish', native: 'Türkçe', code: 'tr-TR'},
    {name: 'Russian', native: 'Русский', code: 'ru-RU'},
    {name: 'Ukrainian', native: 'Українська', code: 'uk-UA'},
    {name: 'Polish', native: 'Polski', code: 'pl-PL'},
    {name: 'German', native: 'Deutsch', code: 'de-DE'},
    {name: 'French', native: 'Français', code: 'fr-FR'},
    {name: 'Spanish', native: 'Español', code: 'es-ES'},
    {name: 'Portuguese', native: 'Português', code: 'pt-BR'},
    {name: 'Italian', native: 'Italiano', code: 'it-IT'},
    {name: 'Dutch', native: 'Nederlands', code: 'nl-NL'},
    {name: 'Swedish', native: 'Svenska', code: 'sv-SE'},
];

export function findLanguage(name: string): TranslateLanguage | undefined {
    return TRANSLATE_LANGUAGES.find(language => language.name === name);
}

/** The browser's language, used as the default target. */
export function browserLanguage(): string {
    const code = (navigator.language || 'en').toLowerCase();
    const match = TRANSLATE_LANGUAGES.find(language => language.code.toLowerCase() === code)
        ?? TRANSLATE_LANGUAGES.find(language => language.code.slice(0, 2).toLowerCase() === code.slice(0, 2));
    return match?.name ?? 'English';
}
