import type {PlasmoCSConfig, PlasmoGetStyle} from "plasmo";
import styleText from 'data-text:~base.scss';
import baseContentStyleText from 'data-text:~style/base-content.module.scss';
import * as baseContentStyle from '~style/base-content.module.scss';
import React, {useEffect, useMemo, useRef, useState} from "react";
import {
    getLatestState,
    MESSAGE_ACTION_SET_PANEL_OPEN_OR_NOT,
    MESSAGE_ACTION_SET_QUOTING_CANCEL,
    MESSAGE_ACTION_SET_QUOTING_SELECTION_CLEAR_CURSOR,
    MESSAGE_ACTION_SET_QUOTING_SELECTION_TEXT,
    openInPlugin
} from "~utils";
import Icon from "data-base64:~assets/icon.png";
import AskEditIcon from "data-base64:~assets/icon_ask_content_edit.svg";
import CTooltip from "~component/common/CTooltip";
import {Input, List, Popover} from "antd";
import {PromptTypes} from "~options/constant/PromptTypes";
import {getIconSrc} from "~options/component/AiEnginePage";
import {getImageSrc} from "~options/component/Card";
import popupSettingIcon from "data-base64:~assets/icon_popup_setting.svg";
import SmallAskAiIcon from "data-base64:~assets/icon_ask_ai_small.svg";
import askCloseIcon from "data-base64:~assets/icon_ask_close.svg";
import {IAskAi, openPanelAskAi, openPanelSearchInContent} from "~libs/open-ai/open-panel";
import SearchBannerIcon from "data-base64:~assets/icon_search_banner.svg";
import PupHeaderIcon from "data-base64:~assets/icon_pup_header.svg";
import {SearchBar} from "~options/component/SearchBar";
import {Logger} from "~utils/logger";
import {BASE_ZINDEX} from "~component/common/CPopover";
import {disableSite, isSiteDisabled, setDisabledAllSites, useSiteAccess} from "~utils/site-access";
import {usePromptLibrary} from "~utils/prompt-cards";
import {type SelectionContext, SelectionContexts} from "~options/constant/SelectionContexts";
import {PROMPT_SCENARIOS, PromptScenarios, TOOLBAR_SLOTS} from "~options/constant/PromptScenarios";

export const getStyle: PlasmoGetStyle = () => {
    const style = document.createElement("style");
    style.textContent = styleText + baseContentStyleText;
    return style;
};

export const config: PlasmoCSConfig = {
    matches: ["<all_urls>"],
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    exclude_globs: ["*opis=1*", "chrome://*", "*--oppcw*", "*--opaw*"],
    all_frames: false,
};

export function mergeAiMsg(msg:string,quotingText?:string):string{
    if(quotingText && quotingText.trim()){
        msg = msg+quotingText;
    }
    return msg;
}

/**
 * ask bar is show?
 */
let popIsShow = false;
/**
 * quick bar is show?
 */
let popIsShowByShortcuts = false;
/**
 * quick bar 1
 * ask bar 2
 */
let selectPopType = 1;

/**
 * BrainyAI is turned off on this page (Disable on this website / on all websites).
 * Module-level so the page event listeners, registered once, see the current value.
 */
let pageDisabled = true;
/** The "Hide BrainyAI" menu is open; clicks in it must not close the quick bar. */
let disableMenuShown = false;

// Input types whose text can be selected (password is deliberately excluded)
const TEXT_INPUT_TYPES = new Set(['text', 'search', 'url', 'email', 'tel', '']);

interface PageSelection {
    text: string;
    context: SelectionContext;
    /** Viewport rectangle to place the quick bar under. */
    anchor: { left: number, bottom: number };
}

/**
 * Reads the current selection. Text selected inside <input>/<textarea> is not part of
 * window.getSelection(), so it is read from the focused field instead.
 */
function readPageSelection(mouse?: MouseEvent): PageSelection | null {
    const active = document.activeElement;
    if (active instanceof HTMLInputElement && !TEXT_INPUT_TYPES.has(active.type)) {
        // password, number, date... fields: never offer the quick bar
        return null;
    }
    const isTextField = active instanceof HTMLTextAreaElement || active instanceof HTMLInputElement;

    if (isTextField) {
        const field = active as HTMLInputElement | HTMLTextAreaElement;
        const {selectionStart, selectionEnd} = field;
        if (selectionStart == null || selectionEnd == null || selectionEnd <= selectionStart) {
            return null;
        }
        const text = field.value.slice(selectionStart, selectionEnd).trim();
        const rect = field.getBoundingClientRect();
        // There is no rectangle for text inside a field; use the pointer, else the field itself
        const anchor = mouse
            ? {left: mouse.clientX - 12, bottom: mouse.clientY + 6}
            : {left: rect.left, bottom: rect.bottom};
        return text ? {text, context: SelectionContexts.EDITABLE, anchor} : null;
    }

    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (!selection || selection.isCollapsed || !text) {
        return null;
    }
    const node = selection.anchorNode;
    const element = node instanceof HTMLElement ? node : node?.parentElement;
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    return {
        text,
        context: element?.isContentEditable ? SelectionContexts.EDITABLE : SelectionContexts.TEXT,
        anchor: {left: rect.left, bottom: rect.bottom},
    };
}

export default function Base() {
    const [toolPositions, setToolPositions] = useState([0, 0]); // [x, y]
    const [showTool, setShowTool] = useState(false);
    const [selectedText, setSelectedText] = useState("");
    const divRef = useRef<HTMLDivElement>(null);
    const [showAskContent, setShowAskContent] = useState(false);
    const [showAskSearch, setShowAskSearch] = useState(false);
    const [askInputValue, setAskInputValue] = useState('');
    const [visible, setVisible] = useState(null);
    const [visiblePop, setVisiblePop] = useState(null);
    /**
     * quick bar Keyboard shortcuts is show?
     */
    const [visibleAsk, setVisibleAsk] = useState(false);
    const {cards, shown} = usePromptLibrary();
    const [selectionContext, setSelectionContext] = useState<SelectionContext>(SelectionContexts.TEXT);
    // Page text -> Reading Assistant prompts, text fields -> Writing Assistant prompts
    const scenario = selectionContext === SelectionContexts.EDITABLE ? PromptScenarios.WRITING : PromptScenarios.READING;
    const contextCards = useMemo(() => shown(scenario), [shown, scenario]);
    const askCards = useMemo(() => shown(PromptScenarios.ASK), [shown]);
    const [disableMenuOpen, setDisableMenuOpen] = useState(false);
    const [barHovered, setBarHovered] = useState(false);
    const siteAccess = useSiteAccess();
    const hostname = window.location.hostname;
    const disabledHere = !siteAccess.loaded || isSiteDisabled(siteAccess, hostname);

    useEffect(() => {
        pageDisabled = disabledHere;
        if (disabledHere) {
            // Hide everything, but leave the page's own text selection alone
            setShowTool(false);
            setShowAskSearch(false);
            setDisableMenuOpen(false);
            disableMenuShown = false;
        }
    }, [disabledHere]);

    function checkSelection(mouse?: MouseEvent) {
        if (pageDisabled) {
            return;
        }
        const pageSelection = readPageSelection(mouse);

        if (pageSelection) {
            const {text: selectionText, context, anchor} = pageSelection;
            Logger.log('selectionText================', context, selectionText);
            setSelectedText(selectionText);
            setSelectionContext(context);

            let x = anchor.left + window.scrollX;

            let toolTipWidth = 280;

            if (divRef.current) {
                toolTipWidth = divRef.current.offsetWidth;
            }

            if (x + toolTipWidth > window.innerWidth) {
                x = window.innerWidth - toolTipWidth - 10;
            }

            setToolPositions([Math.max(x, 0), anchor.bottom + window.scrollY + 10]);
            void chrome.runtime.sendMessage({action: MESSAGE_ACTION_SET_QUOTING_SELECTION_TEXT, data:selectionText});
            void showToolByConfig();
            setVisibleAsk(false);
            setShowAskSearch(false);
        } else {
            if(!popIsShowByShortcuts && !disableMenuShown){
                setShowTool(false);
                sendMessageQuotingCancel();
            }
        }
    }

    async function showToolByConfig(){
        if (!pageDisabled) {
            setShowTool(true);
        }
    }

    function showAskBar(isSelectText = false) {
        if (pageDisabled) {
            return;
        }
        if(isSelectText){
            setShowAskContent(true);
        }else {
            setSelectedText('');
            setShowAskContent(false);
        }
        window?.getSelection()?.removeAllRanges();
        setShowTool(false);
        setAskInputValue('');
        setShowAskSearch(true);
    }


    const setPanelOpenOrNot = function () {
        void chrome.runtime.sendMessage({action: MESSAGE_ACTION_SET_PANEL_OPEN_OR_NOT});
    };

    const sendMessageQuotingCancel = function () {
        void chrome.runtime.sendMessage({action: MESSAGE_ACTION_SET_QUOTING_CANCEL});
    };

    const askBarContentCopy = function (e: React.MouseEvent<HTMLImageElement, MouseEvent>) {
        e.stopPropagation();
        Logger.log("askAi=========");
        setAskInputValue(selectedText);
        setShowAskContent(false);
        setSelectedText('');
    };

    const quickBarHeaderClick = function (e: React.MouseEvent<HTMLImageElement, MouseEvent>) {
        e.stopPropagation();
        Logger.log("askAi=========");
        showAskBar(true);
    };

    function goToSearch(msg:string) {
        if (msg && msg.trim()) {
            Logger.log(`search=========${msg}`);
            openPanelSearchInContent(msg);
            closeAllPop();
        }
    }

    async function goToSearchByAskBar() {
        const isQuotShow = await getLatestState(setShowAskContent);
        const quotingText = await getLatestState(setSelectedText);
        const askBarText = await getLatestState(setAskInputValue);
        const isAskBarShow = await getLatestState(setShowAskSearch);
        if(isAskBarShow){
            if (isQuotShow && quotingText && quotingText.trim() && askBarText && askBarText.trim()) {
                goToSearch(mergeAiMsg(askBarText,quotingText));
            } else if (askBarText && askBarText.trim()) {
                goToSearch(askBarText);
            } else if (isQuotShow && quotingText && quotingText.trim()) {
                goToSearch(quotingText);
            }
        }
    }

    async function sendAskAIDefault() {
        const isAskBarShow = await getLatestState(setShowAskSearch);
        const isQuotShow = await getLatestState(setShowAskContent);
        const askBarText = await getLatestState(setAskInputValue);
        const quotingText = await getLatestState(setSelectedText);
        Logger.log('sendAskAIDefault================',isAskBarShow,isQuotShow,askBarText,quotingText);
        if(isAskBarShow && askBarText && askBarText.trim()){
            if(isQuotShow && quotingText && quotingText.trim()){
                goToAskEngine(askBarText,undefined,quotingText);
            }else {
                goToAskEngine(askBarText);
            }
        }
    }

    async function sendAskAI(id:number) {
        const isQuotShow = await getLatestState(setShowAskContent);
        const quotingText = await getLatestState(setSelectedText);
        const askBarText = await getLatestState(setAskInputValue);
        const isAskBarShow = await getLatestState(setShowAskSearch);
        if(isAskBarShow){
            if (isQuotShow && quotingText && quotingText.trim() && askBarText && askBarText.trim()) {
                goToAskEngine(askBarText, id, quotingText);
            } else if (askBarText && askBarText.trim()) {
                goToAskEngine(askBarText, id, undefined);
            } else if (isQuotShow && quotingText && quotingText.trim()) {
                goToAskEngine(quotingText, id, undefined);
            }
        }
    }

    function goToAskEngine(msg:string,cardId?:number,quotingText?:string) {
        if (msg && msg.trim()) {
            if(cardId){
                Logger.log(`goToAskEngine===============${msg}`);
                const card = cards.find((card) => card.id === cardId);
                if (card != null) {
                    const iAskAI = new IAskAi({
                        prompt: card.text,
                        lang: card.language,
                        text: msg,
                        promptText:mergeAiMsg(msg,quotingText),
                        appendix: quotingText,
                        promptImageUri:card.imageKey,
                        promptImageTitle:card.title,
                        promptType: card.itemType==PromptTypes.CUSTOM?2:1
                    });
                    openPanelAskAi(iAskAI);
                }
            }else {
                const iAskAI = new IAskAi({
                    prompt: mergeAiMsg(msg,quotingText),
                    text:msg,
                    appendix: quotingText,
                });
                openPanelAskAi(iAskAI);
            }
            closeAllPop();
        }
    }

    function closeAllPop(isCancelQuot = true) {
        setShowTool(false);
        if(isCancelQuot){
            sendMessageQuotingCancel();
        }
        setShowAskContent(false);
        setShowAskSearch(false);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        setVisiblePop(false);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        setVisible(false);
        setSelectedText('');
        window?.getSelection()?.removeAllRanges();
    }

    useEffect(() => {
        Logger.log('chrome.runtime.onMessage.addListener============');
        chrome.runtime.onMessage.addListener(handleMessage);
        if (!openInPlugin(location.href)) {
            document.body.addEventListener('mouseup', (e) => {
                Logger.log(`mouseup ===============${showAskSearch}`);
                setTimeout(() => checkSelection(e));
            });

            document.body.addEventListener('mousedown', () => {
                Logger.log(`addEventListener mousedown ===============`);
                if(!popIsShowByShortcuts && !disableMenuShown){
                    Logger.log(`mousedown popIsShowByShortcuts=============${popIsShowByShortcuts}`);
                    setShowTool(false);
                    sendMessageQuotingCancel();
                }
                if(!popIsShow){
                    Logger.log(`mousedown popIsShow=============${popIsShow}`);
                    setShowAskSearch(false);
                }

            });

            document.body.addEventListener('keydown', (e) => {
                if (pageDisabled && !((e.metaKey || e.ctrlKey) && e.key === 'i')) {
                    return;
                }
                if (e.shiftKey && e.metaKey && e.key === 'Enter') {
                    Logger.log('viewGroup shiftKey and metaKey and Enter ==============');
                    goToSearchByAskBar().then(() => {
                        Logger.log('goToSearchByAskBar is completed');
                    }).catch((error) => {
                        Logger.log('goToSearchByAskBar is Error: ', error);
                    });
                }else if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
                    e.preventDefault();
                    e.stopPropagation();
                    showAskBar();
                } else if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
                    Logger.log('i clicked');
                    e.preventDefault();
                    e.stopPropagation();
                    setPanelOpenOrNot();
                }

            });
        }
        return () => {
            Logger.log('chrome.runtime.onMessage.removeListener============');
            chrome.runtime.onMessage.removeListener(handleMessage);
        };
    }, []);

    function handleMessage(message: any) {
        Logger.log('message================', message);
        switch (message.action) {
        case MESSAGE_ACTION_SET_QUOTING_SELECTION_CLEAR_CURSOR:
            Logger.log('MESSAGE_ACTION_SET_QUOTING_SELECTION_CLEAR_CURSOR================');
            closeAllPop(false);
            break;
        }
    }

    const popupPrompt =  (
        <div className={baseContentStyle.popupPrompt}>
            <div className={baseContentStyle.header}>
                <div className={baseContentStyle.title} >
                    Shortcut Menu
                    <span className={baseContentStyle.titleContext}> · {PROMPT_SCENARIOS.find(item => item.id === (selectPopType == 1 ? scenario : PromptScenarios.ASK))?.label}</span>
                </div>
                <img className={baseContentStyle.iconImage} src={popupSettingIcon} alt='' onClick={() => {
                    window.open(`chrome-extension://${chrome.runtime.id}/options.html`);
                }}/>
            </div>
            <List
                itemLayout="vertical"
                dataSource={selectPopType == 1 ? contextCards : askCards}
                bordered={false}
                split={false}
                className={`hideScrollBar ${baseContentStyle.listWrap}`}
                renderItem={(car, index) => {
                    const ItemIcon = getIconSrc(car.imageKey);
                    return (
                        <List.Item className={baseContentStyle.listItem} onClick={(e) => itemClick(car,index,e)}>
                            <div className={baseContentStyle.listContent}>
                                <div className={baseContentStyle.leading} >
                                    {car.itemType === PromptTypes.CUSTOM ?
                                        <ItemIcon style={{fontSize: '16px', color: '#5E5E5E'}}/> :
                                        <img className={baseContentStyle.leadingIcon} src={getImageSrc(car.imageKey)} alt={''}/>}
                                    <div className={baseContentStyle.leadingText}>{car.title}</div>
                                </div>
                            </div>
                        </List.Item>
                    );
                }
                }>
            </List>
        </div>
    );

    async function disableBrainyAI(e: React.MouseEvent<HTMLElement, MouseEvent>, scope: 'site' | 'all') {
        e.stopPropagation();
        setDisableMenuOpen(false);
        disableMenuShown = false;
        if (scope === 'site') {
            await disableSite(hostname);
        } else {
            await setDisabledAllSites(true);
        }
        Logger.log(`BrainyAI disabled on ${scope === 'site' ? hostname : 'all websites'}`);
    }

    const disableMenu = (
        // preventDefault keeps the page's text selection when an option is clicked
        <div className={baseContentStyle.popupQuickConfig} onMouseDown={(e) => e.preventDefault()}>
            <div className={baseContentStyle.menuTitle}>Hide BrainyAI</div>
            <div className={baseContentStyle.menuItem} onClick={(e) => disableBrainyAI(e, 'site')}>
                <span className={baseContentStyle.menuLabel}>Disable on this website</span>
                <span className={baseContentStyle.menuSub}>{hostname}</span>
            </div>
            <div className={baseContentStyle.menuItem} onClick={(e) => disableBrainyAI(e, 'all')}>
                <span className={baseContentStyle.menuLabel}>Disable on all websites</span>
            </div>
            <div className={baseContentStyle.menuFooter}>
                Turn it back on in <a className={baseContentStyle.menuLink} onClick={(e) => {
                    e.stopPropagation();
                    setDisableMenuOpen(false);
                    disableMenuShown = false;
                    window.open(`chrome-extension://${chrome.runtime.id}/options.html`);
                }}>Settings → Websites</a>.
            </div>
        </div>
    );

    async function itemClick(car: any, index: number,e: React.MouseEvent<HTMLDivElement>) {
        e.stopPropagation();
        let msg = '';
        if(selectPopType == 1){
            msg = await getLatestState(setSelectedText);
        }else if(selectPopType == 2){
            msg = await getLatestState(setAskInputValue);
        }
        Logger.log('itemClick===============', car.id, index, msg);
        goToAskEngine(msg,car.id,undefined);
    }

    const handleKeyDown = (e) => {
        if (e.shiftKey && e.metaKey && e.key === 'Enter') {
            Logger.log('input shiftKey and metaKey and Enter ==============');
            e.preventDefault();
            goToSearchByAskBar().then(() => {
                Logger.log('goToSearchByAskBar is completed');
            }).catch((error) => {
                Logger.log('goToSearchByAskBar is Error: ', error);
            });
        } else if (((e.metaKey || e.ctrlKey) || e.shiftKey) && e.key === 'Enter') {
            e.preventDefault();
            setAskInputValue(askInputValue + '\n');
        } else if (e.key === 'Enter') {
            Logger.log('e.Enter ==============');
            e.preventDefault();
            sendAskAIDefault().then(() => {
                Logger.log('sendAskAIDefault is completed');
            }).catch((error) => {
                Logger.log('sendAskAIDefault is Error: ', error);
            });
        }
    };

    if (disabledHere) {
        return null;
    }

    return <div>
        {
            <div ref={divRef} style={{
                left: `${toolPositions[0]}px`,
                top: `${toolPositions[1]}px`,
                display: showTool ? 'block' : 'none',
                padding: '6px',
            }} className={'relative'}
            onMouseEnter={() => setBarHovered(true)}
            onMouseLeave={() => {
                setBarHovered(false);
                setVisibleAsk(false);
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                }}
                className={'bg-white shadow-[0_2px_8px_0px_rgba(0,0,0,.16)] border border-[#0000000F] z-[1] overflow-hidden rounded-[6px] h-[26px] items-center'}>
                    <div
                        className={'pl-[2px] box-border flex justify-center cursor-pointer items-center'}>
                        <div className={'flex w-[22px] h-[22px] rounded-[4px] justify-center items-center bg-white hover:bg-[#F2F5FF]'}>
                            <img onClick={quickBarHeaderClick} className={'block w-[16px] h-[16px]'}
                                src={PupHeaderIcon} alt=''/>
                        </div>
                        <div className={"w-[1px] h-[14px] bg-[#000000] opacity-[.12] mx-[3px]"}></div>
                    </div>
                    <div >
                        <SearchBar compact cards={contextCards.slice(0, TOOLBAR_SLOTS[scenario])} showSearch={selectionContext === SelectionContexts.TEXT} popupPrompt={popupPrompt} isVisible={visiblePop ?? false} onOpenChange={(visiblePopup) =>{
                            if(visiblePopup) {
                                selectPopType = 1;
                            }
                            popIsShowByShortcuts = visiblePopup;
                            Logger.log(`popIsShowByShortcuts=================${popIsShowByShortcuts}`);
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-expect-error
                            setVisiblePop(visiblePopup);}} onItemClick={(id)=>{goToAskEngine(selectedText,id,null);}} onItemSearchClick={()=>{goToSearch(selectedText);}}/>
                    </div>
                    <div className={"w-[1px] h-[14px] bg-[#000000] opacity-[.12] ms-[4px]"}></div>

                    <div onClick={() => {showAskBar();}} className={"cursor-pointer flex justify-center items-center"}>
                        <img className={'w-[16px] h-[16px] ms-[5px] me-[5px] cursor-pointer'} src={SmallAskAiIcon}
                            onMouseEnter={() => {
                                setVisibleAsk(true);
                            }} alt=''/>
                        {visibleAsk &&
                            <div className={'text-[#0A4DFE] text-[11px] font-[400] justify-start items-center me-[8px] whitespace-nowrap'}>⌘
                                + J</div>}
                    </div>

                </div>
                <Popover zIndex={BASE_ZINDEX+100} overlayInnerStyle={{padding: '6px 0'}} title={null} content={disableMenu}
                    arrow={false} placement='rightTop' align={{offset: [6, -4]}} trigger='click' open={disableMenuOpen}
                    onOpenChange={(open) => {
                        disableMenuShown = open;
                        setDisableMenuOpen(open);
                    }}>
                    <img className={'w-[14px] h-[14px] absolute top-0 right-0 cursor-pointer'}
                        style={{visibility: barHovered || disableMenuOpen ? 'visible' : 'hidden'}}
                        title={'Disable BrainyAI'} src={askCloseIcon} alt='Disable BrainyAI'
                        onMouseDown={(e) => {
                            // keep the page selection and the quick bar while the menu opens
                            e.preventDefault();
                            e.stopPropagation();
                        }}/>
                </Popover>
            </div>
        }
        <div onClick={setPanelOpenOrNot}
            className={'fixed group right-[-50px] hover:quick-text:block transition-all bg-white hover:bg-[#CEDBFF] hover:right-0 cursor-pointer bottom-[18%] flex items-center rounded-l-[20px] h-[40px] w-[90px] shadow-[0_4px_24px_0px_rgba(0,0,0,.2)]'}>
            <img className={'block  w-[24px] h-[24px] ml-[8px]'} src={Icon} alt=''/>
            <div className={'quick-text text-[15px] hidden group-hover:block ml-[8px] text-[#0A4DFE]'}>⌘ + I</div>
        </div>

        <div onClick={() => showAskBar()}
            className={'fixed right-[6px] transition-all hover:right-[8px] cursor-pointer bottom-[calc(18%+65px)] flex justify-center items-center bg-white rounded-full h-[32px] w-[32px] shadow-xl transform hover:scale-110'}>
            <CTooltip title={'⌘ + J'} autoAdjustOverflow={true} placement="left" overlayStyle={{
                width: '70px',
                background: '#000000',
                borderRadius: '8px',
                boxShadow: '0 4px 12px 0px rgba(0,0,0,.2)'
            }} overlayInnerStyle={{textAlign: 'center'}}>
                <img className={'block w-[20px] h-[20px] mx-auto my-auto'} src={SearchBannerIcon} alt=''/>
            </CTooltip>
        </div>

        {showAskSearch && <div
            style={{
                position: 'fixed',
                left: `0`,
                right: '0',
                top: `25%`,
                minWidth: '378px',
                maxWidth: '600px',
                width:'40%',
                margin: "auto"
            }}
            className={'bg-white shadow-[0_4px_12px_0px_rgba(0,0,0,.2)] overflow-hidden rounded-[8px] relative flex flex-col'}>
            <div
                style={{display: showAskContent ? 'flex' : 'none'}}
                className={'justify-start bg-[#F2F5FF] leading-[24px] p-[16px] text-black font-weight-400 text-[15px]'}>
                <p>
                    {selectedText}
                    <CTooltip title="Edit a quote" autoAdjustOverflow={true} placement="bottom" overlayStyle={{
                        background: '#000000',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px 0px rgba(0,0,0,.2)'
                    }} overlayInnerStyle={{textAlign: 'center'}}>
                        <img onClick={askBarContentCopy}
                            className={'ml-[8px] inline-block align-text-bottom w-[16px] h-[16px]'} src={AskEditIcon}
                            alt=''/>
                    </CTooltip>
                </p>
            </div>
            <div style={{display: 'flex', flexDirection: 'column', minHeight: '97px'}}>
                <Input.TextArea
                    value={askInputValue}
                    onChange={(e) => {
                        setAskInputValue(e.target.value);
                    }}
                    className={'p-[16px] border-none font-sans text-[15px] text-black leading-tight focus:outline-none focus:shadow-outline bg-transparent align-top overflow-auto whitespace-pre-wrap resize-none'}
                    placeholder={'Input your Question'}
                    autoFocus={true}
                    onKeyDown={(e) =>handleKeyDown(e)}
                />
                <div className={'flex flex-row justify-between mt-[8px] me-[16px] items-center mb-[8px]'}>
                    <div
                        className={'h-[25px] text-[#C2C2C2] bg-[#F3F4F9] rounded-tr-[8px] rounded-br-[8px] px-[8px] py-[4px] text-[12px] font-[400] me-[12px] whitespace-nowrap cursor-pointer flex justify-center items-center'} onClick={()=>sendAskAIDefault()}>{'⏎ AskAI'}</div>
                    <SearchBar cards={askCards.slice(0, TOOLBAR_SLOTS.ask)} popupPrompt={popupPrompt} isVisible={visible ?? false}
                        onOpenChange={(visibleAskPop) => {
                            Logger.log(`visibleAskPop=================${visibleAskPop}`);
                            if (visibleAskPop) {
                                selectPopType = 2;
                            }
                            popIsShow = visibleAskPop;
                            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                            // @ts-expect-error
                            setVisible(visibleAskPop);
                        }}
                        onItemClick={(id) => sendAskAI(id)}
                        onItemSearchClick={() => goToSearchByAskBar()}
                    />
                </div>
            </div>
        </div>
        }
    </div>;
}
