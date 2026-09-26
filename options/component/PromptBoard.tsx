import React, {useEffect, useRef, useState} from 'react';
import {useDrag, useDrop} from 'react-dnd';
import {InputNumber, Tooltip} from 'antd';
import {DeleteOutlined, EditOutlined, InboxOutlined, PlusCircleOutlined} from '@ant-design/icons';
import {getIconSrc} from "~options/component/AiEnginePage";
import {getImageSrc} from "~options/component/Card";
import {PromptTypes} from "~options/constant/PromptTypes";
import {MAX_TOOLBAR_SLOTS, MIN_TOOLBAR_SLOTS, type PromptScenario} from "~options/constant/PromptScenarios";
import type {Card} from "~options/component/SearchBar";
import IconDrag from "data-base64:~assets/icon_drag.svg";

const DRAG_TYPE = 'prompt';

type Column = 'shown' | 'archive';

interface DragItem {
    id: number;
    column: Column;
}

const SLOT_SETTING_LABELS: Record<PromptScenario, string> = {
    ask: 'Buttons in the Ask box',
    reading: 'Toolbar buttons',
    writing: 'Toolbar buttons',
};

const SLOT_HINTS: Record<PromptScenario, [string, string]> = {
    ask: ['Buttons in the Ask box', 'In the Ask box\'s dropdown'],
    reading: ['Toolbar buttons', 'In the toolbar\'s dropdown'],
    writing: ['Toolbar buttons', 'In the toolbar\'s dropdown'],
};

function PromptIcon({card}: { card: Card }) {
    const Icon = card.itemType === PromptTypes.CUSTOM ? getIconSrc(card.imageKey) : null;
    return Icon
        ? <Icon style={{fontSize: '15px', color: '#555555'}}/>
        : <img className={'w-[15px] h-[15px]'} src={getImageSrc(card.imageKey)} alt=''/>;
}

interface ItemProps {
    card: Card;
    column: Column;
    /** Moves the dragged prompt next to this one while hovering. */
    onHoverItem: (dragged: DragItem, target: Card, column: Column) => void;
    onDragEnd: (didDrop: boolean) => void;
    onEdit: (card: Card) => void;
    onToggle: (card: Card) => void;
    onDelete: (card: Card) => void;
}

function PromptItem({card, column, onHoverItem, onDragEnd, onEdit, onToggle, onDelete}: ItemProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [{isDragging}, drag] = useDrag(() => ({
        type: DRAG_TYPE,
        item: {id: card.id, column} as DragItem,
        collect: (monitor) => ({isDragging: monitor.isDragging()}),
        end: (_item, monitor) => onDragEnd(monitor.didDrop()),
    }), [card.id, column, onDragEnd]);
    const [, drop] = useDrop(() => ({
        accept: DRAG_TYPE,
        hover: (dragged: DragItem) => {
            if (dragged.id !== card.id) {
                onHoverItem(dragged, card, column);
            }
        },
    }), [card, column, onHoverItem]);
    drag(drop(ref));

    const isCustom = card.itemType === PromptTypes.CUSTOM;
    return (
        <div ref={ref} data-prompt={card.title}
            className={`group relative flex flex-row items-start bg-white rounded-[10px] border border-solid border-[#EEEEEE] px-[14px] py-[12px] mb-[8px] cursor-grab hover:shadow-[0_2px_8px_rgba(0,0,0,.08)] ${isDragging ? 'opacity-40' : ''} ${column === 'archive' ? 'bg-[#FAFAFB]' : ''}`}>
            <img src={IconDrag} className={'w-[16px] h-[16px] mt-[2px] mr-[6px] opacity-40'} alt=''/>
            <div className={'flex-1 min-w-0'}>
                <div className={'flex items-center gap-[8px]'}>
                    <PromptIcon card={card}/>
                    <span className={'text-[#333333] font-[600] text-[14px] truncate'}>{card.title}</span>
                </div>
                <div className={'text-[#8C8C8C] text-[12px] mt-[4px] truncate'}>{card.text}</div>
            </div>
            <div className={'absolute right-[10px] top-[10px] hidden group-hover:flex items-center gap-[4px] bg-white'}>
                <Tooltip title="Edit">
                    <EditOutlined aria-label="Edit" className={'p-[4px] rounded hover:bg-[#F2F5FF] text-[#5E5E5E]'} onClick={() => onEdit(card)}/>
                </Tooltip>
                <Tooltip title={column === 'shown' ? 'Archive in this tab' : 'Show on the list'}>
                    {column === 'shown'
                        ? <InboxOutlined aria-label="Archive" className={'p-[4px] rounded hover:bg-[#F2F5FF] text-[#5E5E5E]'} onClick={() => onToggle(card)}/>
                        : <PlusCircleOutlined aria-label="Show" className={'p-[4px] rounded hover:bg-[#F2F5FF] text-[#5E5E5E]'} onClick={() => onToggle(card)}/>}
                </Tooltip>
                {isCustom &&
                    <Tooltip title="Delete everywhere">
                        <DeleteOutlined aria-label="Delete" className={'p-[4px] rounded hover:bg-[#FFF1F0] text-[#FF4D4F]'} onClick={() => onDelete(card)}/>
                    </Tooltip>}
            </div>
        </div>
    );
}

/** A column that accepts drops on its empty space (to append, or to archive). */
function ColumnDrop({column, onHoverColumn, onDrop, children}: {
    column: Column,
    onHoverColumn: (dragged: DragItem, column: Column) => void,
    onDrop: () => void,
    children: React.ReactNode
}) {
    const [{isOver}, drop] = useDrop(() => ({
        accept: DRAG_TYPE,
        // Items don't handle drops, so this runs for drops anywhere in the column
        drop: () => onDrop(),
        hover: (dragged: DragItem, monitor) => {
            if (monitor.isOver({shallow: true})) {
                onHoverColumn(dragged, column);
            }
        },
        collect: (monitor) => ({isOver: monitor.isOver()}),
    }), [column, onHoverColumn, onDrop]);
    return <div ref={drop} data-column={column}
        className={`min-h-[320px] rounded-[10px] p-[8px] transition-colors ${isOver ? 'bg-[#EEF3FF]' : 'bg-[#F3F4F9]'}`}>
        {children}
    </div>;
}

interface BoardProps {
    scenario: PromptScenario;
    /** All prompts. */
    cards: Card[];
    /** Ids shown in this scenario, in order. */
    shownIds: number[];
    onChange: (shownIds: number[]) => void;
    /** How many of the shown prompts are buttons; the rest are in the dropdown. */
    slots: number;
    onSlotsChange: (slots: number) => void;
    onEdit: (card: Card) => void;
    onDelete: (card: Card) => void;
}

/** "Show on the list" and "Archive" columns for one scenario, with drag and drop between them. */
export function PromptBoard({scenario, cards, shownIds, onChange, slots, onSlotsChange, onEdit, onDelete}: BoardProps) {
    // While dragging, the order lives here and is saved once on drop (chrome.storage.sync limits writes per minute)
    const [draft, setDraft] = useState<number[] | null>(null);
    const draftRef = useRef<number[] | null>(null);
    const ids = draft ?? shownIds;

    useEffect(() => {
        draftRef.current = null;
        setDraft(null);
    }, [scenario, shownIds.join()]);

    const update = (next: number[]) => {
        draftRef.current = next;
        setDraft(next);
    };

    const onHoverItem = (dragged: DragItem, target: Card, column: Column) => {
        const current = draftRef.current ?? shownIds;
        const without = current.filter(id => id !== dragged.id);
        if (column === 'shown') {
            const at = without.indexOf(target.id);
            const next = [...without.slice(0, at), dragged.id, ...without.slice(at)];
            if (next.join() !== current.join()) {
                dragged.column = 'shown';
                update(next);
            }
        } else if (current.includes(dragged.id)) {
            dragged.column = 'archive';
            update(without);
        }
    };

    const onHoverColumn = (dragged: DragItem, column: Column) => {
        const current = draftRef.current ?? shownIds;
        if (column === 'shown' && !current.includes(dragged.id)) {
            dragged.column = 'shown';
            update([...current, dragged.id]);
        } else if (column === 'archive' && current.includes(dragged.id)) {
            dragged.column = 'archive';
            update(current.filter(id => id !== dragged.id));
        }
    };

    const onDrop = () => {
        const next = draftRef.current;
        if (next && next.join() !== shownIds.join()) {
            onChange(next);
        }
    };

    // Dropped outside the columns (or cancelled): forget the unsaved order. After a drop in a
    // column the saved list arrives through shownIds, which clears the draft (effect above).
    const onDragEnd = (didDrop: boolean) => {
        if (!didDrop) {
            draftRef.current = null;
            setDraft(null);
        }
    };

    const toggle = (card: Card) => {
        onChange(ids.includes(card.id) ? ids.filter(id => id !== card.id) : [...ids, card.id]);
    };

    const byId = new Map(cards.map(card => [card.id, card]));
    const shown = ids.map(id => byId.get(id)).filter(Boolean) as Card[];
    const archived = cards.filter(card => !ids.includes(card.id));
    const [aboveHint, belowHint] = SLOT_HINTS[scenario];
    const itemProps = {onHoverItem, onDragEnd, onEdit, onToggle: toggle, onDelete};

    return (
        <div className={'grid grid-cols-2 gap-[16px] mt-[12px]'}>
            <div>
                <div className={'flex items-center justify-between h-[24px] mb-[8px]'}>
                    <div className={'flex items-center gap-[6px] text-[#333333] font-[600] text-[14px]'}>
                        Show on the list <span className={'text-[#8C8C8C] font-[400]'}>({shown.length})</span>
                    </div>
                    <Tooltip title={`The first ${slots} prompts are buttons; the others are in the dropdown.`}>
                        <label className={'flex items-center gap-[6px] text-[#5E5E5E] text-[13px]'}>
                            {SLOT_SETTING_LABELS[scenario]}
                            <InputNumber size="small" className={'w-[56px]'} aria-label={SLOT_SETTING_LABELS[scenario]}
                                min={MIN_TOOLBAR_SLOTS} max={MAX_TOOLBAR_SLOTS} value={slots} precision={0}
                                onChange={(value) => value != null && onSlotsChange(value)}/>
                        </label>
                    </Tooltip>
                </div>
                <ColumnDrop column="shown" onHoverColumn={onHoverColumn} onDrop={onDrop}>
                    {shown.length === 0 &&
                        <div className={'text-[#8C8C8C] text-[13px] text-center py-[40px]'}>Drag prompts here to show them.</div>}
                    {shown.map((card, index) => (
                        <React.Fragment key={card.id}>
                            {index === 0 && slots > 0 && <SlotLabel text={aboveHint}/>}
                            {index === slots && <SlotLabel text={belowHint}/>}
                            <PromptItem card={card} column="shown" {...itemProps}/>
                        </React.Fragment>
                    ))}
                </ColumnDrop>
            </div>
            <div>
                <div className={'flex items-center gap-[6px] h-[24px] text-[#333333] font-[600] text-[14px] mb-[8px]'}>
                    <InboxOutlined/> Archive <span className={'text-[#8C8C8C] font-[400]'}>({archived.length})</span>
                </div>
                <ColumnDrop column="archive" onHoverColumn={onHoverColumn} onDrop={onDrop}>
                    {archived.length === 0 &&
                        <div className={'text-[#8C8C8C] text-[13px] text-center py-[40px]'}>Drag prompts here to hide them in this tab.</div>}
                    {archived.map(card => <PromptItem key={card.id} card={card} column="archive" {...itemProps}/>)}
                </ColumnDrop>
            </div>
        </div>
    );
}

function SlotLabel({text}: { text: string }) {
    return <div className={'text-[11px] uppercase tracking-[.04em] text-[#8C8C8C] px-[4px] pt-[2px] pb-[6px]'}>{text}</div>;
}
