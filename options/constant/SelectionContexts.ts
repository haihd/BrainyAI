/** Where the selected text is; the quick bar offers different prompts for each. */
export const SelectionContexts = {
    /** Text on the page: paragraphs, headings, list items... Reading prompts. */
    TEXT: 'text',
    /** Text inside an input, textarea or rich-text editor. Writing prompts. */
    EDITABLE: 'editable',
} as const;

export type SelectionContext = typeof SelectionContexts[keyof typeof SelectionContexts];

export const ALL_SELECTION_CONTEXTS: SelectionContext[] = [SelectionContexts.TEXT, SelectionContexts.EDITABLE];

export const SELECTION_CONTEXT_LABELS: Record<SelectionContext, string> = {
    text: 'Page text',
    editable: 'Text fields',
};
