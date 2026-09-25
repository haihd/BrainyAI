/** Places where prompts are offered. Each has its own ordered list of shown prompts; the rest are archived. */
export const PromptScenarios = {
    /** The Ask box (Ctrl/Cmd+J) and the side panel's prompt tags. */
    ASK: 'ask',
    /** The selection toolbar on page text. */
    READING: 'reading',
    /** The selection toolbar on text in inputs, textareas and editors. */
    WRITING: 'writing',
} as const;

export type PromptScenario = typeof PromptScenarios[keyof typeof PromptScenarios];

export const PROMPT_SCENARIOS: { id: PromptScenario, label: string, help: string }[] = [
    {
        id: PromptScenarios.ASK,
        label: 'Chat/Ask',
        help: 'Prompts offered in the Ask box (Ctrl/Cmd+J) and in the side panel chat.',
    },
    {
        id: PromptScenarios.READING,
        label: 'Reading Assistant',
        help: 'The toolbar shown when you select text on a web page.',
    },
    {
        id: PromptScenarios.WRITING,
        label: 'Writing Assistant',
        help: 'The toolbar shown when you select text you are writing: inputs, text boxes and editors.',
    },
];

/** How many of a scenario's prompts get a button; the others are in the dropdown. */
export const TOOLBAR_SLOTS: Record<PromptScenario, number> = {
    ask: 6,
    reading: 4,
    writing: 4,
};
