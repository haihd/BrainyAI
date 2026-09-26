import React, {useEffect, useState} from 'react';
import {AutoComplete, Button, Form, Input, message, Select, Tooltip} from 'antd';
import {ReloadOutlined} from '@ant-design/icons';
import {Storage} from "@plasmohq/storage";
import {
    API_PROVIDERS,
    type ApiProviderConfig,
    apiKeyStorageKey,
    baseUrlStorageKey,
    modelStorageKey
} from "~libs/chatbot/api/providers";
import {Logger} from "~utils/logger";
import {fetchModelList, getCachedModelList, pickRecommendedModel} from "~libs/chatbot/api/models";

const OLLAMA_URL_KEY = 'ollama-url';
const OLLAMA_MODEL_KEY = 'ollama-model';

const providerStorageKeys = (provider: ApiProviderConfig) => [
    apiKeyStorageKey(provider.id),
    modelStorageKey(provider.id),
    ...(provider.editableBaseUrl ? [baseUrlStorageKey(provider.id)] : []),
];

const ALL_KEYS = [...API_PROVIDERS.flatMap(providerStorageKeys), OLLAMA_URL_KEY, OLLAMA_MODEL_KEY];

export default function ApiKeyPage() {
    const [form] = Form.useForm();
    const storage = new Storage();
    const [ollamaModels, setOllamaModels] = useState<string[]>([]);
    const [testing, setTesting] = useState<string | null>(null);
    const [modelLists, setModelLists] = useState<Record<string, string[]>>({});
    const [loadingModels, setLoadingModels] = useState<Record<string, boolean>>({});

    const providerConnection = (provider: ApiProviderConfig) => ({
        apiKey: (form.getFieldValue(apiKeyStorageKey(provider.id)) ?? '').trim(),
        baseUrl: ((provider.editableBaseUrl && form.getFieldValue(baseUrlStorageKey(provider.id))) || provider.baseUrl).trim().replace(/\/+$/, ''),
    });

    /** Loads the models this key can use from the provider. Returns undefined on failure. */
    async function loadModelList(provider: ApiProviderConfig, showErrors = true): Promise<string[] | undefined> {
        const {apiKey, baseUrl} = providerConnection(provider);
        if (!apiKey || !baseUrl) {
            if (showErrors) {
                void message.warning(`Enter the ${provider.label} ${!baseUrl ? 'base URL and ' : ''}API key first.`);
            }
            return undefined;
        }

        setLoadingModels(prev => ({...prev, [provider.id]: true}));
        try {
            const ids = await fetchModelList(provider, apiKey, baseUrl);
            setModelLists(prev => ({...prev, [provider.id]: ids}));
            return ids;
        } catch (e) {
            Logger.error(`Failed to load ${provider.label} models`, e);
            if (showErrors) {
                void message.error(`${provider.label}: ${e.message}`.slice(0, 300));
            }
            return undefined;
        } finally {
            setLoadingModels(prev => ({...prev, [provider.id]: false}));
        }
    }

    async function loadOllamaModels(url?: string) {
        const ollamaUrl = url || await storage.get(OLLAMA_URL_KEY) || 'http://localhost:11434';
        try {
            const response = await fetch(`${ollamaUrl}/api/tags`);
            const data = await response.json();
            setOllamaModels(data.models.map((model: any) => model.name));
        } catch (error) {
            setOllamaModels([]);
            Logger.error('Failed to load ollama models:', error);
        }
    }

    async function loadSettings() {
        const values: Record<string, string | undefined> = {};
        for (const key of ALL_KEYS) {
            values[key] = await storage.get(key);
        }
        form.setFieldsValue(values);

        const cached: Record<string, string[]> = {};
        for (const provider of API_PROVIDERS) {
            cached[provider.id] = await getCachedModelList(provider);
        }
        setModelLists(cached);

        // Refresh in the background so newly released models show up without any action.
        for (const provider of API_PROVIDERS) {
            void loadModelList(provider, false);
        }
    }

    useEffect(() => {
        void loadOllamaModels();
        void loadSettings();
    }, []);

    /** Checks the key by listing models (free, and works for every model family) and that the chosen model exists. */
    async function testProvider(provider: ApiProviderConfig) {
        setTesting(provider.id);
        try {
            const ids = await loadModelList(provider);
            if (!ids) {
                return;
            }

            const model = form.getFieldValue(modelStorageKey(provider.id)) || provider.defaultModel;
            if (!model) {
                void message.success(`${provider.label}: key OK, ${ids.length} models available. Pick one in the Model field.`);
            } else if (ids.includes(model)) {
                void message.success(`${provider.label}: key OK, ${model} is available.`);
            } else {
                const recommended = pickRecommendedModel(provider, ids);
                void message.warning(`${provider.label}: key OK, but ${model} is not in your model list.` +
                    (recommended ? ` Try ${recommended}.` : ''), 6);
            }
        } finally {
            setTesting(null);
        }
    }

    const onFinish = async (values: Record<string, string | undefined>) => {
        try {
            for (const key of ALL_KEYS) {
                const value = values[key]?.trim();
                if (value) {
                    await storage.set(key, value);
                } else {
                    await storage.remove(key);
                }
            }
            void message.success('Settings saved.');
        } catch (error) {
            void message.error('Saving settings failed.');
        }
    };

    const sectionTitle = 'text-[#333333] font-[600] text-[16px] mb-[12px] flex items-center justify-between';

    return (
        <div>
            <div
                className={'bg-white shadow-[0_4px_12px_0px_rgba(0,0,0,.2)] overflow-hidden rounded-tl-[24px] rounded-tr-[24px] px-[56px] py-[32px] mt-[32px] flex flex-col'}>
                <div className={'text-[#333333] font-[700] text-[20px] justify-start'}>API Keys & Models</div>
                <div className={'text-[#5E5E5E] text-[13px] mt-[4px]'}>
                    Only providers you configure appear as usable in the model picker. Keys are stored in your browser only.
                </div>
                <div className="p-4">
                    <Form form={form} onFinish={onFinish} layout="vertical">
                        {API_PROVIDERS.map(provider => (
                            <div key={provider.id} className={'border border-[#EEEEEE] rounded-[12px] px-[20px] pt-[16px] mb-[16px]'}>
                                <div className={sectionTitle}>
                                    <span className={'flex items-center'}>
                                        <img src={provider.logoSrc} className={'w-[18px] h-[18px] mr-[8px]'} alt=''/>
                                        {provider.vendor}
                                    </span>
                                    <a href={provider.apiKeyUrl} target="_blank" rel="noreferrer" className={'text-[13px] font-[400]'}>
                                        {provider.apiKeyLinkLabel ?? 'Get an API key'}
                                    </a>
                                </div>
                                {provider.editableBaseUrl &&
                                    <Form.Item label="Base URL" name={baseUrlStorageKey(provider.id)} extra={provider.baseUrlHint}>
                                        <Input placeholder={provider.baseUrl || 'https://.../v1'}/>
                                    </Form.Item>}
                                <Form.Item label="API Key" name={apiKeyStorageKey(provider.id)}>
                                    <Input.Password placeholder={provider.apiKeyPlaceholder} autoComplete="off"
                                        onBlur={() => void loadModelList(provider, false)}/>
                                </Form.Item>
                                <ModelField provider={provider} models={modelLists[provider.id] ?? []}
                                    loading={!!loadingModels[provider.id]} testing={testing === provider.id}
                                    onRefresh={() => loadModelList(provider)} onTest={() => testProvider(provider)}
                                    onUseModel={(model) => form.setFieldValue(modelStorageKey(provider.id), model)}/>
                            </div>
                        ))}

                        <div className={'border border-[#EEEEEE] rounded-[12px] px-[20px] pt-[16px] mb-[16px]'}>
                            <div className={sectionTitle}>Ollama (local)</div>
                            <Form.Item label="URL" name={OLLAMA_URL_KEY}>
                                <Input placeholder="http://localhost:11434" onChange={(e) => {
                                    if (e.target.value) {
                                        void loadOllamaModels(e.target.value);
                                    } else {
                                        setOllamaModels([]);
                                    }
                                }}/>
                            </Form.Item>
                            <Form.Item label="Model" name={OLLAMA_MODEL_KEY}>
                                <Select style={{minWidth: 120}} allowClear
                                    options={ollamaModels.map(m => ({value: m, label: m}))}/>
                            </Form.Item>
                        </div>

                        <Form.Item>
                            <Button
                                type="primary"
                                htmlType="submit"
                                className="z-10 relative bg-green-600 hover:bg-green-700"
                                style={{backgroundColor: '#10B981'}}
                            >
                                Save
                            </Button>
                        </Form.Item>
                    </Form>
                </div>
            </div>
        </div>
    );
}

interface ModelFieldProps {
    provider: ApiProviderConfig;
    models: string[];
    loading: boolean;
    testing: boolean;
    onRefresh: () => void;
    onTest: () => void;
    onUseModel: (model: string) => void;
}

function ModelField({provider, models, loading, testing, onRefresh, onTest, onUseModel}: ModelFieldProps) {
    const recommended = models.length ? pickRecommendedModel(provider, models) : undefined;
    const suggestions = models.length ? models : provider.modelSuggestions;
    const selected: string | undefined = Form.useWatch(modelStorageKey(provider.id));
    const current = selected || provider.defaultModel;
    const missing = !!current && models.length > 0 && !models.includes(current);

    const extra = models.length
        ? <span>
            {models.length} models available from {provider.vendor}.
            {recommended && recommended !== current && <> Recommended: <a onClick={() => onUseModel(recommended)}>{recommended}</a>.</>}
            {missing && <span className={'text-[#D46B08]'}> {current} is not in this list; it may be retired.</span>}
        </span>
        : `Enter your API key to load the model list from ${provider.vendor}. Leave empty to use ${provider.defaultModel || 'the recommended model'}.`;

    return <div className={'flex items-start gap-[12px]'}>
        <Form.Item label="Model" name={modelStorageKey(provider.id)} className={'flex-1'} extra={extra}>
            <AutoComplete
                allowClear
                options={suggestions.map(m => ({value: m, label: m === recommended ? `${m}  (recommended)` : m}))}
                placeholder={provider.defaultModel || recommended || 'model id'}
                filterOption={(input, option) => (option?.value ?? '').toLowerCase().includes(input.toLowerCase())}
            />
        </Form.Item>
        <Form.Item label=" ">
            <div className={'flex gap-[8px]'}>
                <Tooltip title="Reload the model list from the provider">
                    <Button icon={<ReloadOutlined/>} loading={loading} onClick={onRefresh}/>
                </Tooltip>
                <Button loading={testing} onClick={onTest}>Test</Button>
            </div>
        </Form.Item>
    </div>;
}
