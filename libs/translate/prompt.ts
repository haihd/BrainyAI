import {AUTO_DETECT} from "~libs/translate/languages";
import {styleInstruction} from "~libs/translate/styles";

export interface TranslateRequest {
    text: string;
    /** Language name, or AUTO_DETECT. */
    source: string;
    target: string;
    styles: string[];
}

export function buildTranslatePrompt({text, source, target, styles}: TranslateRequest): string {
    const from = source === AUTO_DETECT ? 'its original language (detect it)' : source;
    const style = styles.length
        ? `The translation should: ${styles.map(styleInstruction).join('; ')}.`
        : 'The translation should sound natural.';
    return [
        `You are a professional translator. Translate the text inside <text></text> from ${from} into ${target}.`,
        style,
        'Keep the meaning, formatting, line breaks, names, numbers, URLs and code unchanged.',
        `If the text is already in ${target}, improve it in that language instead.`,
        'Reply with the translation only: no quotes, notes, explanations or the <text> tags.',
        '',
        `<text>\n${text}\n</text>`,
    ].join('\n');
}
