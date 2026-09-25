import {useCallback, useMemo} from "react";
import {useStorage} from "@plasmohq/storage/dist/hook";
import {PromptDatas} from "~options/constant/PromptDatas";
import {PROMPT_SCENARIOS, type PromptScenario} from "~options/constant/PromptScenarios";
import type {Card} from "~options/component/SearchBar";

/** Per scenario, the ids of the prompts shown, in order. Prompts not listed are archived there. */
export type PromptLayout = Record<PromptScenario, number[]> & {
    /** Every prompt id the layout has seen, so prompts added later (new built-ins) can be placed once. */
    known: number[];
};

const PROMPT_LAYOUT_KEY = 'promptLayout';
const ALL_SCENARIOS = PROMPT_SCENARIOS.map(s => s.id);
const BUILT_IN_SCENARIOS = new Map<number, PromptScenario[]>(PromptDatas.map(card => [card.id, card.scenarios]));

/** Where a prompt goes when it is first seen: built-ins by their definition, custom prompts everywhere. */
function defaultScenarios(card: Card): PromptScenario[] {
    return BUILT_IN_SCENARIOS.get(card.id) ?? ALL_SCENARIOS;
}

/** Adds built-in prompts released after the list was saved. */
export function normalizePromptCards(stored: Card[] | undefined): Card[] {
    const cards = stored?.length ? stored : PromptDatas;
    const ids = new Set(cards.map(card => card.id));
    return [...cards, ...PromptDatas.filter(card => !ids.has(card.id))];
}

/** Places prompts the layout has not seen yet and drops ids of deleted prompts. */
export function normalizePromptLayout(cards: Card[], stored: PromptLayout | undefined): PromptLayout {
    const known = new Set(stored?.known ?? []);
    const existing = new Set(cards.map(card => card.id));
    const layout = {known: cards.map(card => card.id)} as PromptLayout;
    for (const scenario of ALL_SCENARIOS) {
        const ids = (stored?.[scenario] ?? []).filter(id => existing.has(id));
        const added = cards.filter(card => !known.has(card.id) && defaultScenarios(card).includes(scenario)).map(card => card.id);
        layout[scenario] = [...ids, ...added.filter(id => !ids.includes(id))];
    }
    return layout;
}

export interface PromptLibrary {
    /** Every prompt, shown or archived anywhere. */
    cards: Card[];
    layout: PromptLayout;
    /** The prompts shown in a scenario, in order. */
    shown: (scenario: PromptScenario) => Card[];
    /** The prompts archived in a scenario. */
    archived: (scenario: PromptScenario) => Card[];
    setCards: (cards: Card[]) => Promise<void>;
    /** Sets the shown ids of one scenario (order matters). */
    setShown: (scenario: PromptScenario, ids: number[]) => Promise<void>;
    setLayout: (layout: PromptLayout) => Promise<void>;
}

/** The prompt definitions ("promptData") and where each one is shown ("promptLayout"). */
export function usePromptLibrary(): PromptLibrary {
    const [storedCards, setStoredCards] = useStorage<Card[]>('promptData', PromptDatas);
    const [storedLayout, setStoredLayout] = useStorage<PromptLayout>(PROMPT_LAYOUT_KEY);
    const cards = useMemo(() => normalizePromptCards(storedCards), [storedCards]);
    const layout = useMemo(() => normalizePromptLayout(cards, storedLayout), [cards, storedLayout]);
    const byId = useMemo(() => new Map(cards.map(card => [card.id, card])), [cards]);

    const shown = useCallback((scenario: PromptScenario) =>
        layout[scenario].map(id => byId.get(id)).filter(Boolean) as Card[], [layout, byId]);
    const archived = useCallback((scenario: PromptScenario) =>
        cards.filter(card => !layout[scenario].includes(card.id)), [layout, cards]);
    const setShown = useCallback((scenario: PromptScenario, ids: number[]) =>
        setStoredLayout({...layout, [scenario]: ids}), [layout, setStoredLayout]);

    return {cards, layout, shown, archived, setCards: setStoredCards, setShown, setLayout: setStoredLayout};
}
