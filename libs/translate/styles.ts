/** Built-in translation styles. Users can also type their own style in the style picker. */
export interface TranslateStyle {
    name: string;
    /** What the style asks the model for; custom styles use their name. */
    instruction: string;
}

export const TRANSLATE_STYLES: TranslateStyle[] = [
    {name: 'Natural', instruction: 'sound natural and fluent, as a native speaker would write it'},
    {name: 'Concise', instruction: 'be concise, without unnecessary words'},
    {name: 'Formal', instruction: 'use a formal, polite register'},
    {name: 'Casual', instruction: 'use a casual, conversational register'},
    {name: 'Literal', instruction: 'stay as close as possible to the original wording and structure'},
    {name: 'Dynamic', instruction: 'convey the meaning and intent freely rather than word for word'},
    {name: 'Academic', instruction: 'use precise academic language'},
    {name: 'Technical', instruction: 'keep technical terms accurate and use the field\'s standard terminology'},
    {name: 'Friendly', instruction: 'use a warm, friendly tone'},
];

export const DEFAULT_TRANSLATE_STYLES = ['Natural'];

export function styleInstruction(name: string): string {
    return TRANSLATE_STYLES.find(style => style.name === name)?.instruction ?? name;
}
