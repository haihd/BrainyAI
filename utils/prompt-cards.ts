import {useMemo} from "react";
import {useStorage} from "@plasmohq/storage/dist/hook";
import {PromptDatas} from "~options/constant/PromptDatas";
import {ALL_SELECTION_CONTEXTS, type SelectionContext} from "~options/constant/SelectionContexts";
import type {Card} from "~options/component/SearchBar";

const DEFAULT_CONTEXTS = new Map<number, SelectionContext[]>(PromptDatas.map(card => [card.id, card.contexts]));

/**
 * Brings a saved prompt list up to date: adds built-in prompts released after it was saved,
 * and gives prompts saved before contexts existed their default contexts (custom ones: everywhere).
 */
export function normalizePromptCards(stored: Card[] | undefined): Card[] {
    const cards = stored?.length ? stored : PromptDatas;
    const ids = new Set(cards.map(card => card.id));
    return [...cards, ...PromptDatas.filter(card => !ids.has(card.id))].map(card => card.contexts ? card : {
        ...card,
        contexts: DEFAULT_CONTEXTS.get(card.id) ?? ALL_SELECTION_CONTEXTS,
    });
}

export function cardShowsIn(card: Card, context: SelectionContext): boolean {
    return (card.contexts ?? ALL_SELECTION_CONTEXTS).includes(context);
}

/** The quick bar prompts ("promptData"), normalized. Saving writes the full normalized list. */
export function usePromptCards(): [Card[], (cards: Card[]) => Promise<void>] {
    const [stored, setStored] = useStorage<Card[]>('promptData', PromptDatas);
    const cards = useMemo(() => normalizePromptCards(stored), [stored]);
    return [cards, setStored];
}
