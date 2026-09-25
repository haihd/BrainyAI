import React from "react";
import CTooltip from "~component/common/CTooltip";
import newSearchIcon from "data-base64:~assets/icon_search_new.svg";
import {getIconSrc} from "~options/component/AiEnginePage";
import {PromptTypes} from "~options/constant/PromptTypes";
import {getImageSrc} from "~options/component/Card";
import {Popover} from "antd";
import TriangleIcon from "data-base64:~assets/icon_triangle.svg";
import {Logger} from "~utils/logger";
import type {PromptScenario} from "~options/constant/PromptScenarios";
export type PromptTypesType = typeof PromptTypes[keyof typeof PromptTypes];

export interface Card {
    id: number,
    itemType: PromptTypesType
    imageKey: string,
    title: string,
    language: string,
    /** Only used by older versions. */
    isSelect?: boolean,
    text: string,
    /** Built-in prompts: the scenarios they are shown in by default. */
    scenarios?: PromptScenario[],
}

export interface SearchBarProps {
    cards: Card[],
    popupPrompt: React.ReactNode,
    isVisible: boolean
    onOpenChange: (visible: boolean) => void
    onItemClick: (id: number) => void
    onItemSearchClick: () => void
    /** Smaller buttons and hover labels, used by the quick bar shown on text selection. */
    compact?: boolean
    /** Show the web Search button (not useful for text being written in a field). */
    showSearch?: boolean
}

const tooltipStyle = {
    background: '#000000',
    borderRadius: '8px',
    boxShadow: '0 4px 12px 0px rgba(0,0,0,.2)'
};
const compactTooltipStyle = {...tooltipStyle, borderRadius: '6px'};
const tooltipInnerStyle = {textAlign: 'center' as const};
const compactTooltipInnerStyle = {textAlign: 'center' as const, minHeight: 'auto', padding: '3px 8px', fontSize: '12px', lineHeight: '18px', borderRadius: '6px'};

export const SearchBar = ({ cards, popupPrompt,isVisible,onOpenChange,onItemClick,onItemSearchClick, compact = false, showSearch = true}: SearchBarProps) => {
    const buttonClass = compact
        ? 'flex w-[22px] h-[22px] rounded-[4px] justify-center items-center bg-white hover:bg-[#F2F5FF] cursor-pointer'
        : 'flex w-[28px] h-[28px] rounded-[4px] justify-center items-center bg-white hover:bg-[#F2F5FF]';
    const iconSize = compact ? 14 : 16;
    const tooltipProps = {
        autoAdjustOverflow: true,
        placement: 'top' as const,
        overlayStyle: compact ? compactTooltipStyle : tooltipStyle,
        overlayInnerStyle: compact ? compactTooltipInnerStyle : tooltipInnerStyle,
    };
    return <div style={{
        display: 'flex',
        justifyContent: 'start',
        flexDirection: 'row',
        alignItems: 'center',
    }}>
        <div className={'flex flex-row justify-start max-w-[500px] overflow-x-auto overflow-y-hidden hideScrollBar'}>
            {showSearch &&
            <CTooltip title='Search' {...tooltipProps}>
                <div className={buttonClass} role="button" aria-label="Search">
                    <img style={{width: iconSize, height: iconSize}} className={'cursor-pointer'} src={newSearchIcon} alt=''
                        onClick={() => {
                            onItemSearchClick();
                        }}/>
                </div>
            </CTooltip>}
            {
                cards.map((car) => {
                    const ItemIcon = getIconSrc(car.imageKey);
                    return (
                        <CTooltip key={car.title} title={car.title} {...tooltipProps}>
                            <div
                                className={`${buttonClass} ${compact ? 'ml-[1px]' : 'ml-[2px]'}`}
                                role="button" aria-label={car.title}
                                onClick={() => {
                                    onItemClick(car.id);
                                }}>
                                {car.itemType === PromptTypes.CUSTOM ?
                                    <ItemIcon style={{
                                        cursor: 'pointer',
                                        fontSize: `${iconSize}px`,
                                        color: '#555555',
                                    }}/> :
                                    <div style={{width: iconSize, height: iconSize}}>
                                        <img style={{
                                            cursor: 'pointer',
                                            height: '100%',
                                            flex: 'block',
                                        }} src={getImageSrc(car.imageKey)} alt={''}/>
                                    </div>
                                }
                            </div>
                        </CTooltip>
                    );
                })
            }
        </div>
        <Popover overlayInnerStyle={{paddingLeft: 0, paddingRight:0,paddingTop:'8px',paddingBottom:'8px'}} title={null} align={{offset: [0, 20]}} content={popupPrompt} arrow={false} placement='bottomRight' open={isVisible}
            onOpenChange={(visible) => {
                Logger.log(`onOpenChange=================${visible}`);
                onOpenChange(visible);
            }}>
            <img className={compact ? 'w-[12px] h-[12px] cursor-pointer ml-[1px]' : 'w-[16px] h-[16px] justify-start ms-[2px] cursor-pointer ml-[2px]'} src={TriangleIcon} alt=''/>
        </Popover>
    </div>;
};
