import React, {useContext, useEffect, useMemo, useRef, useState} from "react";
import {Button, Checkbox, Input, message, Popover, Select, Tooltip} from "antd";
import {
    CaretDownOutlined,
    CopyOutlined,
    DeleteOutlined,
    LoadingOutlined,
    PlusOutlined,
    ReloadOutlined,
    SettingOutlined,
    SoundOutlined,
    SwapOutlined,
} from "@ant-design/icons";
import {useStorage} from "@plasmohq/storage/dist/hook";
import {Storage} from "@plasmohq/storage";
import {API_BOTS} from "~libs/chatbot/api/ApiBot";
import {modelStorageKey} from "~libs/chatbot/api/providers";
import OllamaAPI from "~libs/chatbot/openai/OllamaAPI";
import {ResponseMessageType} from "~libs/open-ai/open-ai-interface";
import {createUuid} from "~utils";
import {SidePanelContext} from "~provider/sidepanel/SidePanelProvider";
import {AUTO_DETECT, browserLanguage, findLanguage, TRANSLATE_LANGUAGES} from "~libs/translate/languages";
import {DEFAULT_TRANSLATE_STYLES, TRANSLATE_STYLES} from "~libs/translate/styles";
import {buildTranslatePrompt} from "~libs/translate/prompt";

/** Models that can translate: the API providers and Ollama (the website-login bots no longer work). */
const TRANSLATE_BOTS = [...API_BOTS, OllamaAPI];
type TranslateBot = typeof TRANSLATE_BOTS[number];

const findBot = (name: string) => TRANSLATE_BOTS.find(bot => bot.botName === name);

interface TranslateSettings {
    /** botName of each selected model, in the order the results are shown. */
    models: string[];
    styles: string[];
    /** Styles typed by the user, offered next to the built-in ones. */
    customStyles: string[];
    source: string;
    target: string;
}

interface ModelResult {
    status: 'loading' | 'done' | 'error';
    text: string;
    error?: string;
}

/** The model a bot will use, shown under its name (e.g. "gemini-flash-latest"). */
async function modelIdOf(bot: TranslateBot): Promise<string> {
    const storage = new Storage();
    if (bot === OllamaAPI) {
        return (await storage.get('ollama-model')) ?? '';
    }
    const provider = (bot as typeof API_BOTS[number]).provider;
    return (await storage.get(modelStorageKey(provider.id))) || provider.defaultModel;
}

function speak(text: string, languageName?: string) {
    if (!text || !('speechSynthesis' in window)) {
        return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const language = languageName ? findLanguage(languageName) : undefined;
    if (language) {
        utterance.lang = language.code;
    }
    speechSynthesis.speak(utterance);
}

function StackedLogos({bots}: { bots: TranslateBot[] }) {
    if (!bots.length) {
        return <span className={'text-[13px] text-[#8C8C8C]'}>Choose models</span>;
    }
    return <span className={'flex items-center'}>
        {bots.map((bot, index) => (
            <img key={bot.botName} src={bot.logoSrc} alt={bot.botName}
                className={'w-[20px] h-[20px] rounded-full bg-white border border-solid border-white'}
                style={{marginLeft: index ? -6 : 0, zIndex: bots.length - index}}/>
        ))}
    </span>;
}

export default function Translate() {
    const {translateRequest} = useContext(SidePanelContext);
    const [settings, setSettings] = useStorage<TranslateSettings>('translateSettings', {
        models: [],
        styles: DEFAULT_TRANSLATE_STYLES,
        customStyles: [],
        source: AUTO_DETECT,
        target: browserLanguage(),
    });
    const [configured, setConfigured] = useState<Record<string, boolean>>({});
    const [modelIds, setModelIds] = useState<Record<string, string>>({});
    const [input, setInput] = useState('');
    const [results, setResults] = useState<Record<string, ModelResult>>({});
    const [newStyle, setNewStyle] = useState('');
    const runId = useRef(0);
    const lastRequestId = useRef<number>();

    const selectedBots = useMemo(() => settings.models.map(findBot).filter(Boolean) as TranslateBot[], [settings.models]);
    const isTranslating = Object.values(results).some(result => result.status === 'loading');

    const update = (patch: Partial<TranslateSettings>) => setSettings({...settings, ...patch});

    // Which models have a key / URL set, and which model id each one uses
    useEffect(() => {
        void (async () => {
            const status: Record<string, boolean> = {};
            const ids: Record<string, string> = {};
            for (const bot of TRANSLATE_BOTS) {
                const [, ok] = await bot.checkIsLogin();
                status[bot.botName] = ok;
                ids[bot.botName] = await modelIdOf(bot);
            }
            setConfigured(status);
            setModelIds(ids);
        })();
    }, []);

    // First use: pick the configured models
    useEffect(() => {
        if (!settings.models.length && Object.keys(configured).length) {
            const ready = TRANSLATE_BOTS.filter(bot => configured[bot.botName]).map(bot => bot.botName);
            if (ready.length) {
                update({models: ready.slice(0, 3)});
            }
        }
    }, [configured]);

    // Text sent from the selection toolbar. Waits until the models' status is known and a model is
    // selected (on first use the configured ones are selected just before).
    const modelsReady = Object.keys(configured).length > 0 && (selectedBots.length > 0 || !Object.values(configured).some(Boolean));
    useEffect(() => {
        if (modelsReady && translateRequest && translateRequest.requestId !== lastRequestId.current) {
            lastRequestId.current = translateRequest.requestId;
            setInput(translateRequest.text);
            const target = translateRequest.target && findLanguage(translateRequest.target) ? translateRequest.target : settings.target;
            if (target !== settings.target) {
                update({target});
            }
            void translate(translateRequest.text, target);
        }
    }, [translateRequest, modelsReady]);

    async function translate(text = input, target = settings.target) {
        const source = text.trim();
        if (!source) {
            return;
        }
        if (!selectedBots.length) {
            void message.warning('Choose at least one model.');
            return;
        }
        const run = ++runId.current;
        const prompt = buildTranslatePrompt({text: source, source: settings.source, target, styles: settings.styles});
        setResults(Object.fromEntries(selectedBots.map(bot => [bot.botName, {status: 'loading', text: ''}])));

        await Promise.all(selectedBots.map(bot => translateWith(bot, prompt, run)));
    }

    async function translateWith(bot: TranslateBot, prompt: string, run: number) {
        const set = (result: ModelResult) => {
            if (run === runId.current) {
                setResults(prev => ({...prev, [bot.botName]: result}));
            }
        };
        set({status: 'loading', text: ''});
        try {
            const instance = new bot({globalConversationId: `translate-${createUuid()}`});
            await instance.completion({
                prompt,
                rid: createUuid(),
                cb: (_rid, response) => {
                    if (response.message_type === ResponseMessageType.ERROR) {
                        set({status: 'error', text: '', error: response.error?.message ?? 'Translation failed.'});
                    } else {
                        set({
                            status: response.message_type === ResponseMessageType.DONE ? 'done' : 'loading',
                            text: response.message_text ?? '',
                        });
                    }
                },
            });
        } catch (e) {
            set({status: 'error', text: '', error: e?.message ?? String(e)});
        }
    }

    // Not available with "Detect language": there is no known source language to swap to
    const swapLanguages = () => update({source: settings.target, target: settings.source});

    const allStyles = [...TRANSLATE_STYLES.map(style => style.name), ...settings.customStyles];

    const addCustomStyle = () => {
        const name = newStyle.trim();
        if (!name || allStyles.includes(name)) {
            setNewStyle('');
            return;
        }
        update({customStyles: [...settings.customStyles, name], styles: [...settings.styles, name]});
        setNewStyle('');
    };

    const modelPicker = (
        <div className={'w-[260px]'} data-testid="translate-model-menu">
            <div className={'text-[12px] text-[#8C8C8C] px-[4px] pb-[6px]'}>Translate with</div>
            {TRANSLATE_BOTS.map(bot => {
                const ready = configured[bot.botName];
                return <label key={bot.botName}
                    className={`flex items-center gap-[8px] px-[4px] py-[6px] rounded-[6px] hover:bg-[#F2F5FF] ${ready ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>
                    <Checkbox disabled={!ready} checked={settings.models.includes(bot.botName)}
                        onChange={(e) => update({
                            models: e.target.checked
                                ? [...settings.models, bot.botName]
                                : settings.models.filter(name => name !== bot.botName),
                        })}/>
                    <img src={bot.logoSrc} className={'w-[16px] h-[16px]'} alt=''/>
                    <span className={'flex-1 min-w-0'}>
                        <span className={'block text-[13px] text-[#333333]'}>{bot.botName}</span>
                        <span className={'block text-[11px] text-[#8C8C8C] truncate'}>
                            {ready ? modelIds[bot.botName] : 'Not set up'}
                        </span>
                    </span>
                </label>;
            })}
            <div className={'border-0 border-t border-solid border-[#F0F0F0] mt-[6px] pt-[6px]'}>
                <a className={'text-[12px]'} onClick={() => window.open(chrome.runtime.getURL('options.html'))}>
                    <SettingOutlined/> Set up models in Settings
                </a>
            </div>
        </div>
    );

    const stylePicker = (
        <div className={'w-[220px]'} data-testid="translate-style-menu">
            <div className={'text-[12px] text-[#8C8C8C] px-[4px] pb-[6px]'}>Translation style</div>
            {allStyles.map(name => (
                <label key={name} className={'flex items-center gap-[8px] px-[4px] py-[5px] rounded-[6px] hover:bg-[#F2F5FF] cursor-pointer'}>
                    <Checkbox checked={settings.styles.includes(name)}
                        onChange={(e) => update({
                            // keep the list in the picker's order
                            styles: allStyles.filter(style => style === name ? e.target.checked : settings.styles.includes(style)),
                        })}/>
                    <span className={'text-[13px] text-[#333333]'}>{name}</span>
                </label>
            ))}
            <div className={'flex gap-[6px] mt-[6px]'}>
                <Input size="small" placeholder="Your own style…" value={newStyle}
                    onChange={(e) => setNewStyle(e.target.value)} onPressEnter={addCustomStyle}/>
                <Button size="small" icon={<PlusOutlined/>} onClick={addCustomStyle} aria-label="Add style"/>
            </div>
        </div>
    );

    const languageOptions = TRANSLATE_LANGUAGES.map(language => ({
        value: language.name,
        label: language.name,
        native: language.native,
    }));

    return (
        <div className={'h-full overflow-y-auto px-[12px] pb-[16px]'} data-testid="translate-page">
            {/* Models and styles */}
            <div className={'flex items-center justify-between gap-[8px] pt-[8px] pb-[10px]'}>
                <Popover content={modelPicker} trigger="click" placement="bottomLeft" arrow={false}>
                    <button data-testid="translate-models"
                        className={'flex items-center gap-[6px] h-[34px] px-[10px] rounded-[17px] bg-[#F3F4F9] hover:bg-[#EAECF5] border-0 cursor-pointer'}>
                        <StackedLogos bots={selectedBots}/>
                        <CaretDownOutlined className={'text-[10px] text-[#5E5E5E]'}/>
                    </button>
                </Popover>
                <Popover content={stylePicker} trigger="click" placement="bottomRight" arrow={false}>
                    <button data-testid="translate-styles"
                        className={'flex items-center gap-[6px] h-[34px] max-w-[62%] px-[12px] rounded-[17px] bg-[#F3F4F9] hover:bg-[#EAECF5] border-0 cursor-pointer'}>
                        <span className={'truncate text-[13px] text-[#333333]'}>
                            {settings.styles.length ? settings.styles.join(' - ') : 'Any style'}
                        </span>
                        <CaretDownOutlined className={'text-[10px] text-[#5E5E5E]'}/>
                    </button>
                </Popover>
            </div>

            {/* Languages, text and Translate */}
            <div className={'rounded-[16px] border border-solid border-[#0A4DFE] bg-white overflow-hidden shadow-[0_2px_10px_rgba(10,77,254,.08)]'}>
                <div className={'flex items-center justify-between px-[8px] py-[6px] bg-[#F7F8FC]'}>
                    <Select data-testid="translate-source" variant="borderless" className={'flex-1 min-w-0 font-[600]'}
                        labelRender={(option) => <span className={'font-[600] text-[#333333]'}>{option.label}</span>}
                        popupMatchSelectWidth={220} showSearch value={settings.source}
                        onChange={(source) => update({source})}
                        options={[{value: AUTO_DETECT, label: 'Detect language'}, ...languageOptions]}
                        optionRender={(option) => <span>{option.data.label}
                            {option.data.native && option.data.native !== option.data.label &&
                                <span className={'text-[#8C8C8C] ml-[6px]'}>{option.data.native}</span>}</span>}/>
                    <Tooltip title="Swap languages">
                        <Button type="text" size="small" icon={<SwapOutlined/>} onClick={swapLanguages}
                            aria-label="Swap languages" disabled={settings.source === AUTO_DETECT}/>
                    </Tooltip>
                    <Select data-testid="translate-target" variant="borderless" className={'flex-1 min-w-0 font-[600] text-right'}
                        labelRender={(option) => <span className={'font-[600] text-[#333333]'}>{option.label}</span>}
                        popupMatchSelectWidth={220} showSearch value={settings.target} placement="bottomRight"
                        onChange={(target) => update({target})}
                        options={languageOptions}
                        optionRender={(option) => <span>{option.data.label}
                            {option.data.native !== option.data.label &&
                                <span className={'text-[#8C8C8C] ml-[6px]'}>{option.data.native}</span>}</span>}/>
                </div>
                <Input.TextArea
                    data-testid="translate-input"
                    variant="borderless"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            void translate();
                        }
                    }}
                    placeholder="Enter or paste text to translate…"
                    autoSize={{minRows: 4, maxRows: 10}}
                    className={'px-[14px] py-[10px] text-[15px] leading-[22px]'}
                />
                <div className={'flex items-center justify-between px-[10px] pb-[10px]'}>
                    <div className={'flex items-center gap-[2px]'}>
                        <Tooltip title="Clear">
                            <Button type="text" icon={<DeleteOutlined/>} aria-label="Clear"
                                onClick={() => {
                                    setInput('');
                                    setResults({});
                                }}/>
                        </Tooltip>
                        <Tooltip title="Listen">
                            <Button type="text" icon={<SoundOutlined/>} aria-label="Listen"
                                onClick={() => speak(input, settings.source === AUTO_DETECT ? undefined : settings.source)}/>
                        </Tooltip>
                        <span className={'text-[11px] text-[#BFBFBF] ml-[4px]'}>{input.length ? `${input.length} chars` : ''}</span>
                    </div>
                    <Tooltip title="Ctrl/⌘ + Enter">
                        <Button type="primary" loading={isTranslating} disabled={!input.trim()}
                            onClick={() => void translate()}
                            style={{backgroundColor: input.trim() ? '#0A4DFE' : undefined, borderRadius: 10, fontWeight: 600}}>
                            Translate
                        </Button>
                    </Tooltip>
                </div>
            </div>

            {/* One result per model */}
            <div className={'mt-[12px] flex flex-col gap-[10px]'}>
                {selectedBots.filter(bot => results[bot.botName]).map(bot => {
                    const result = results[bot.botName];
                    return <div key={bot.botName} data-testid={`translate-result-${bot.botName}`}
                        className={'rounded-[14px] bg-white border border-solid border-[#EEEEEE] px-[14px] py-[10px]'}>
                        <div className={'flex items-center justify-between'}>
                            <div className={'flex items-center gap-[6px] min-w-0'}>
                                <img src={bot.logoSrc} className={'w-[16px] h-[16px]'} alt=''/>
                                <span className={'text-[13px] font-[600] text-[#333333]'}>{bot.botName}</span>
                                <span className={'text-[11px] text-[#8C8C8C] truncate'}>{modelIds[bot.botName]}</span>
                            </div>
                            <div className={'flex items-center'}>
                                {result.status === 'loading' && <LoadingOutlined className={'text-[#0A4DFE] mr-[6px]'}/>}
                                <Tooltip title="Copy">
                                    <Button type="text" size="small" icon={<CopyOutlined/>} aria-label="Copy"
                                        disabled={!result.text}
                                        onClick={() => {
                                            void navigator.clipboard.writeText(result.text);
                                            void message.success('Copied');
                                        }}/>
                                </Tooltip>
                                <Tooltip title="Listen">
                                    <Button type="text" size="small" icon={<SoundOutlined/>} aria-label="Listen to translation"
                                        disabled={!result.text} onClick={() => speak(result.text, settings.target)}/>
                                </Tooltip>
                                <Tooltip title="Translate again">
                                    <Button type="text" size="small" icon={<ReloadOutlined/>} aria-label="Retry"
                                        disabled={result.status === 'loading'}
                                        onClick={() => {
                                            const prompt = buildTranslatePrompt({
                                                text: input.trim(), source: settings.source, target: settings.target, styles: settings.styles,
                                            });
                                            void translateWith(bot, prompt, runId.current);
                                        }}/>
                                </Tooltip>
                            </div>
                        </div>
                        <div className={'mt-[6px] text-[15px] leading-[23px] text-[#1F1F1F] whitespace-pre-wrap break-words'}
                            data-testid="translate-result-text">
                            {result.status === 'error'
                                ? <span className={'text-[#CF1322] text-[13px]'}>{result.error}</span>
                                : result.text || <span className={'text-[#BFBFBF]'}>Translating…</span>}
                        </div>
                    </div>;
                })}
                {!selectedBots.length && Object.keys(configured).length > 0 &&
                    <div className={'text-center text-[13px] text-[#8C8C8C] py-[16px]'}>
                        {Object.values(configured).some(Boolean)
                            ? 'Choose the models to translate with (top left).'
                            : <>No model is set up yet. <a onClick={() => window.open(chrome.runtime.getURL('options.html'))}>Add an API key in Settings</a>.</>}
                    </div>}
            </div>
        </div>
    );
}
