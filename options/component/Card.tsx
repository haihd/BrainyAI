import React, {memo, useEffect, useState} from 'react';
import {useDrag, useDrop} from 'react-dnd';
import {ItemTypes} from './ItemTypes.js';
import IconDrag from "data-base64:~assets/icon_drag.svg";
import IconDelete from "data-base64:~assets/icon_delete.svg";
import IconEdit from "data-base64:~assets/icon_edit.svg";
import {PromptTypes} from "~options/constant/PromptTypes";
import AskIcon from "data-base64:~assets/icon_ask.svg";
import TranslateIcon from "data-base64:~assets/icon_translate.svg";
import SummarizeIcon from "data-base64:~assets/icon_summarize.svg";
import ExplainIcon from "data-base64:~assets/icon_explain.svg";
import RephraseIcon from "data-base64:~assets/icon_rephrase.svg";
import GammarCheckIcon from "data-base64:~assets/icon_grammar_check.svg";
import AskBlueIcon from "data-base64:~assets/icon_ask_blue.svg";
import TranslateBlueIcon from "data-base64:~assets/icon_translate_blue.svg";
import SummarizeBlueIcon from "data-base64:~assets/icon_summarize_blue.svg";
import ExplainBlueIcon from "data-base64:~assets/icon_explain_blue.svg";
import RephraseBlueIcon from "data-base64:~assets/icon_rephrase_blue.svg";
import GammarCheckBlueIcon from "data-base64:~assets/icon_grammar_check_blue.svg";
import * as Icons from "@ant-design/icons";
import {Tag} from "antd";
import {ALL_SELECTION_CONTEXTS, SELECTION_CONTEXT_LABELS, type SelectionContext} from "~options/constant/SelectionContexts";

const {CheckableTag} = Tag;
import ImproveIcon from "data-base64:~assets/icon_improve.svg";
import ImproveBlueIcon from "data-base64:~assets/icon_improve_blue.svg";
import ImproveGIcon from "data-base64:~assets/g_icon_improve.svg";
import ShortenIcon from "data-base64:~assets/icon_shorten.svg";
import ShortenBlueIcon from "data-base64:~assets/icon_shorten_blue.svg";
import ShortenGIcon from "data-base64:~assets/g_icon_shorten.svg";
import ProfessionalIcon from "data-base64:~assets/icon_professional.svg";
import ProfessionalBlueIcon from "data-base64:~assets/icon_professional_blue.svg";
import ProfessionalGIcon from "data-base64:~assets/g_icon_professional.svg";
import KeyPointsIcon from "data-base64:~assets/icon_keypoints.svg";
import KeyPointsBlueIcon from "data-base64:~assets/icon_keypoints_blue.svg";
import KeyPointsGIcon from "data-base64:~assets/g_icon_keypoints.svg";
import AskGIcon from "data-base64:~assets/g_icon_ask.svg";
import TranslateGIcon from "data-base64:~assets/g_icon_translate.svg";
import SummarizeGIcon from "data-base64:~assets/g_icon_summarize.svg";
import ExplainGIcon from "data-base64:~assets/g_icon_ask.svg";
import RephraseGIcon from "data-base64:~assets/g_icon_rephrase.svg";
import GammarCheckGIcon from "data-base64:~assets/g_icon_grammar_check.svg";


export const promptGrayImages = [
    {
        key: 'ask_ai',
        value: AskGIcon,
    },
    {
        key: 'Translate',
        value: TranslateGIcon,
    },
    {
        key: 'Summarize',
        value: SummarizeGIcon,
    },
    {
        key: 'Explain',
        value: ExplainGIcon,
    },
    {
        key: 'Rephrase',
        value: RephraseGIcon,
    },
    {
        key: 'Gammar_check',
        value: GammarCheckGIcon,
    },
    {
        key: 'Improve',
        value: ImproveGIcon,
    },
    {
        key: 'Shorten',
        value: ShortenGIcon,
    },
    {
        key: 'Professional',
        value: ProfessionalGIcon,
    },
    {
        key: 'Key_points',
        value: KeyPointsGIcon,
    }
];

export const imagesSrc = [
    {
        key: 'ask_ai',
        value: AskIcon,
    },
    {
        key: 'Translate',
        value: TranslateIcon,
    },
    {
        key: 'Summarize',
        value: SummarizeIcon,
    },
    {
        key: 'Explain',
        value: ExplainIcon,
    },
    {
        key: 'Rephrase',
        value: RephraseIcon,
    },
    {
        key: 'Gammar_check',
        value: GammarCheckIcon,
    },
    {
        key: 'Improve',
        value: ImproveIcon,
    },
    {
        key: 'Shorten',
        value: ShortenIcon,
    },
    {
        key: 'Professional',
        value: ProfessionalIcon,
    },
    {
        key: 'Key_points',
        value: KeyPointsIcon,
    }
];

export const imagesBlueSrc = [
    {
        key: 'ask_ai',
        value: AskBlueIcon,
    },
    {
        key: 'Translate',
        value: TranslateBlueIcon,
    },
    {
        key: 'Summarize',
        value: SummarizeBlueIcon,
    },
    {
        key: 'Explain',
        value: ExplainBlueIcon,
    },
    {
        key: 'Rephrase',
        value: RephraseBlueIcon,
    },
    {
        key: 'Gammar_check',
        value: GammarCheckBlueIcon,
    },
    {
        key: 'Improve',
        value: ImproveBlueIcon,
    },
    {
        key: 'Shorten',
        value: ShortenBlueIcon,
    },
    {
        key: 'Professional',
        value: ProfessionalBlueIcon,
    },
    {
        key: 'Key_points',
        value: KeyPointsBlueIcon,
    }
];

export const getImageSrc = (key: string) => {
    return imagesSrc.filter((item) => item.key === key)[0].value;
};

export const getImageBlueSrc = (key: string) => {
    return imagesBlueSrc.filter((item) => item.key === key)[0].value;
};

export const getGrayImageSrc = (key: string) => {
    return promptGrayImages.filter((item) => item.key === key)[0].value;
};

export type PromptTypes = typeof PromptTypes[keyof typeof PromptTypes];

interface CardProps {
    id: string;
    contexts: SelectionContext[];
    pinned: boolean;
    toggleContext: (id: string, context: SelectionContext) => void;
    togglePinned: (id: string) => void;
    text: string;
    title: string;
    itemType: PromptTypes;
    imageKey: string;
    moveCard: (id: string, atIndex: number) => void;
    findCard: (id: string) => { card: any; index: number };
    editCard: (id: string) => void;
    deleteCard: (id: string) => void;
}

export const Card = memo(function Card({ id, title, text, itemType, imageKey, contexts, pinned, toggleContext, togglePinned, moveCard, findCard, editCard, deleteCard }: CardProps) {
    const originalIndex = findCard(id).index;
    const [defaultImage, setDefaultImage] = useState('');

    const [SelectedIcon, _setSelectedIcon] = useState<any>(null);
    const setSelectedIcon = (key?: string) => _setSelectedIcon(getIconSrc(key));

    useEffect(() => {
        if(itemType === PromptTypes.DEFAULT){
            setSelectedIcon(undefined);
            setDefaultImage(getImageSrc(imageKey));
        }else{
            setSelectedIcon(imageKey);
        }
    }, [imageKey]);

    function getIconSrc(key?: string) {
        if (key && Icons && Object.prototype.hasOwnProperty.call(Icons, key)) {
            return Icons[key];
        } 
        return null;
        
    }

    const [, drag] = useDrag(
        () => ({
            type: ItemTypes.CARD,
            item: { id, originalIndex },
            collect: (monitor) => ({
                isDragging: monitor.isDragging(),
            }),
            end: (item, monitor) => {
                const { id: droppedId, originalIndex } = item;
                const didDrop = monitor.didDrop();
                if (!didDrop) {
                    moveCard(droppedId, originalIndex);
                }
            },
        }),
        [id, originalIndex, moveCard],
    );
    const [, drop] = useDrop(
        () => ({
            accept: ItemTypes.CARD,
            hover({ id: draggedId }) {
                if (draggedId !== id) {
                    const { index: overIndex } = findCard(id);
                    moveCard(draggedId, overIndex);
                }
            },
        }),
        [findCard, moveCard],
    );

    return (
        <div ref={(node) => drag(drop(node))} className={'flex flex-col justify-start mt-[16px]'}>
            <div className={'h-[92px] w-full flex flex-row'}>
                <div className={'cursor-grab  h-full w-[7%] flex items-center justify-start'}>
                    <img src={IconDrag} className={'h-[32px] w-[32px]'} alt=''/>
                </div>
                <div className={'h-full w-[76%] max-w-[550px] flex flex-col justify-center'}>
                    <div className={'flex items-center justify-start flex-row'}>
                        {SelectedIcon ? <SelectedIcon
                            style={{cursor: 'pointer', fontSize: '16px', color: '#555555'}}/> :
                            <img className={'h-[16px] w-[16px]'} src={defaultImage} alt={''}/>}
                        <div style={{fontWeight: 600}} className={'text-[#333333] text-[15px] ms-[8px] flex justify-start items-center'}>{title}</div>
                    </div>
                    <div className={'justify-start items-center text-[#5E5E5E] font-[400] text-[12px] mt-[4px] text-ellipsis whitespace-pre-wrap line-clamp-2 '}  >{text}</div>
                    <div className={'flex flex-row items-center gap-[6px] mt-[6px]'} data-testid={`card-contexts-${id}`}>
                        {ALL_SELECTION_CONTEXTS.map(context => (
                            <CheckableTag key={context} checked={contexts.includes(context)}
                                onChange={() => toggleContext(id, context)}>
                                {SELECTION_CONTEXT_LABELS[context]}
                            </CheckableTag>
                        ))}
                        <span className={'w-[1px] h-[14px] bg-[#DADCE0] mx-[4px]'}/>
                        <CheckableTag checked={pinned} onChange={() => togglePinned(id)}>
                            {pinned ? 'Pinned to bar' : 'In dropdown'}
                        </CheckableTag>
                    </div>
                </div>
                <div className={'h-full w-[17%] flex items-center justify-start flex-row-reverse'}>
                    <img src={IconDelete} className={'h-[24px] w-[24px] cursor-pointer'}
                        onClick={() => deleteCard(id)} alt=''/>
                    <img src={IconEdit} className={'h-[24px] w-[24px] mr-[16px] cursor-pointer'}
                        onClick={() => editCard(id)} alt=''/>
                </div>
            </div>
            <div className={'h-[1px] bg-[#DADCE0] w-full px-[2px] justify-start mt-[16px]'}/>
        </div>
    );
});
