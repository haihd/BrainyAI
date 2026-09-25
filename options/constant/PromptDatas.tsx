import {PromptTypes} from "~options/constant/PromptTypes";
import {PROMPT_PLACEHOLDER_LANG, PROMPT_PLACEHOLDER_TEXT} from "~utils";
import {PromptScenarios} from "~options/constant/PromptScenarios";

/**
 * Built-in prompts. `scenarios` lists where each one is shown by default (see PromptScenarios);
 * users rearrange or archive them per scenario in Options -> Prompt Manager.
 * `isSelect` is kept for data saved by older versions and no longer used.
 */
export const PromptDatas = [
    {
        id: 1012,
        itemType: PromptTypes.DEFAULT,
        imageKey: 'Translate',
        title: 'Translate',
        language: 'English',
        isSelect: true,
        scenarios: [PromptScenarios.ASK, PromptScenarios.READING, PromptScenarios.WRITING],
        text: `I would like you to translate the text delimited by triple quotes into ${PROMPT_PLACEHOLDER_LANG} language, ensuring that the translation is colloquial and authentic. Only give me the output and nothing else. Do not wrap responses in quotes. """ ${PROMPT_PLACEHOLDER_TEXT} """`,
    },
    {
        id: 1013,
        itemType: PromptTypes.DEFAULT,
        imageKey: 'Summarize',
        title: 'Summarize',
        language: 'English',
        isSelect: true,
        scenarios: [PromptScenarios.ASK, PromptScenarios.READING],
        text: `Condense the following paragraph :${PROMPT_PLACEHOLDER_TEXT} .Please respond in ${PROMPT_PLACEHOLDER_LANG} .`,
    },
    {
        id: 1014,
        itemType: PromptTypes.DEFAULT,
        imageKey: 'Explain',
        title: 'Explain',
        language: 'English',
        isSelect: true,
        scenarios: [PromptScenarios.ASK, PromptScenarios.READING],
        text: `Clarify and explain the following paragraph :${PROMPT_PLACEHOLDER_TEXT} .Please respond in ${PROMPT_PLACEHOLDER_LANG} .`,
    },
    {
        id: 1020,
        itemType: PromptTypes.DEFAULT,
        imageKey: 'Key_points',
        title: 'Key points',
        language: 'English',
        isSelect: true,
        scenarios: [PromptScenarios.ASK, PromptScenarios.READING],
        text: `List the key points of the following text as short bullet points: """ ${PROMPT_PLACEHOLDER_TEXT} """. Please respond in ${PROMPT_PLACEHOLDER_LANG}.`,
    },
    {
        id: 1017,
        itemType: PromptTypes.DEFAULT,
        imageKey: 'Improve',
        title: 'Improve writing',
        language: 'English',
        isSelect: true,
        scenarios: [PromptScenarios.ASK, PromptScenarios.WRITING],
        text: `Improve the writing of the following text: make it clearer and more fluent while keeping its meaning and tone. Only give me the improved text. """ ${PROMPT_PLACEHOLDER_TEXT} """ Please respond in ${PROMPT_PLACEHOLDER_LANG}.`,
    },
    {
        id: 1015,
        itemType: PromptTypes.DEFAULT,
        imageKey: 'Rephrase',
        title: 'Rephrase',
        language: 'English',
        isSelect: true,
        scenarios: [PromptScenarios.ASK, PromptScenarios.WRITING],
        text: `Rephrase the following paragraph :${PROMPT_PLACEHOLDER_TEXT} .Please respond in ${PROMPT_PLACEHOLDER_LANG} , focusing on the core topic. `,
    },
    {
        id: 1016,
        itemType: PromptTypes.DEFAULT,
        imageKey: 'Gammar_check',
        title: 'Grammar check',
        language: 'English',
        isSelect: true,
        scenarios: [PromptScenarios.ASK, PromptScenarios.WRITING],
        text: `Correct grammar mistakes, typos, and factual errors of the following paragraph :${PROMPT_PLACEHOLDER_TEXT} .Please respond in ${PROMPT_PLACEHOLDER_LANG} , focusing on the core topic. `,
    },
    {
        id: 1018,
        itemType: PromptTypes.DEFAULT,
        imageKey: 'Shorten',
        title: 'Make shorter',
        language: 'English',
        isSelect: false,
        scenarios: [PromptScenarios.ASK, PromptScenarios.WRITING],
        text: `Make the following text shorter and more concise without losing important information. Only give me the shortened text. """ ${PROMPT_PLACEHOLDER_TEXT} """ Please respond in ${PROMPT_PLACEHOLDER_LANG}.`,
    },
    {
        id: 1019,
        itemType: PromptTypes.DEFAULT,
        imageKey: 'Professional',
        title: 'Professional tone',
        language: 'English',
        isSelect: false,
        scenarios: [PromptScenarios.ASK, PromptScenarios.WRITING],
        text: `Rewrite the following text in a professional, polite tone. Only give me the rewritten text. """ ${PROMPT_PLACEHOLDER_TEXT} """ Please respond in ${PROMPT_PLACEHOLDER_LANG}.`,
    },
];
export const AskPromptId = 100001;
export const AskPromptData = {
    id: AskPromptId,
    itemType: PromptTypes.DEFAULT,
    imageKey: 'ask_ai',
    title: 'AskAI',
    language: 'English',
    isSelect: false,
    text: 'AskAI',
};

export const PdfPromptDatas = [
    {
        id: 2021,
        itemType: PromptTypes.DEFAULT,
        imageKey: null,
        title: 'Summarize',
        language: 'English',
        isSelect: false,
        text: 'Provide a 3-5 sentence summary that captures the key points and main takeaways from this file.',
    },
    {
        id: 2022,
        itemType: PromptTypes.DEFAULT,
        imageKey: null,
        title: 'Key Points',
        language: 'English',
        isSelect: false,
        text: 'Summarize 5 key points in this file by identifying 5 important points or takeaways. Ensure that the key points accurately capture the main ideas, concepts, and insights from the text in a succinct way. Avoid redundancy and focus on highlighting the most crucial and relevant information. Please use the following format:\n' +
            'Key Point 1:\n' +
            'Key Point 2:\n' +
            'Key Point 3:\n' +
            'Key Point 4:\n' +
            'Key Point 5:',
    },
    {
        id: 2023,
        itemType: PromptTypes.DEFAULT,
        imageKey: null,
        title: 'Quiz',
        language: 'English',
        isSelect: false,
        text: 'Based on this file, please generate 5 sets of quiz questions and answers. The questions should cover the key information and important concepts in the text. Ensure that the questions and answers are concise and easy to understand. Each question should have one correct answer.\n' +
            'Please provide the quiz content in the following format:\n' +
            'Quiz 1: Question: Answer;\n' +
            'Quiz 2: Question: Answer;\n' +
            'Quiz 3: Question: Answer;\n' +
            'Quiz 4: Question: Answer;\n' +
            'Quiz 5: Question: Answer;',
    },
];

export const ImagePromptDatas = [
    {
        id: 3031,
        itemType: PromptTypes.DEFAULT,
        imageKey: null,
        title: 'Describe',
        language: 'English',
        isSelect: false,
        text: 'Describe this Image',
    },
    {
        id: 3032,
        itemType: PromptTypes.DEFAULT,
        imageKey: null,
        title: 'Grab Text',
        language: 'English',
        isSelect: false,
        text: 'Extract text from this image',
    },
    {
        id: 3033,
        itemType: PromptTypes.DEFAULT,
        imageKey: null,
        title: 'Extract & Translate',
        language: 'English',
        isSelect: false,
        text: 'Extract text from this image and then translate into English',
    },
];