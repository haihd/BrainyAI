import React, {useEffect, useState} from 'react';
import {AutoComplete, Button, Form, Input, message, Select} from 'antd';
import {Storage} from "@plasmohq/storage";
import {
    API_PROVIDERS,
    type ApiProviderConfig,
    apiKeyStorageKey,
    baseUrlStorageKey,
    modelStorageKey
} from "~libs/chatbot/api/providers";
import {Logger} from "~utils/logger";

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
    }

    useEffect(() => {
        void loadOllamaModels();
        void loadSettings();
    }, []);

    async function testProvider(provider: ApiProviderConfig) {
        const apiKey = form.getFieldValue(apiKeyStorageKey(provider.id));
        const baseUrl = ((provider.editableBaseUrl && form.getFieldValue(baseUrlStorageKey(provider.id))) || provider.baseUrl).replace(/\/+$/, '');
        const model = form.getFieldValue(modelStorageKey(provider.id)) || provider.defaultModel;
        if (!apiKey || !baseUrl || !model) {
            void message.warning(`Enter the ${provider.label} ${!baseUrl ? 'base URL, ' : ''}API key and model first.`);
            return;
        }

        setTesting(provider.id);
        try {
            const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`},
                body: JSON.stringify({model, messages: [{role: 'user', content: 'Reply with OK'}], max_tokens: 5}),
            });
            if (response.ok) {
                void message.success(`${provider.label}: connection OK (${model}).`);
            } else {
                const text = await response.text();
                let detail = text;
                try {
                    const json = JSON.parse(text);
                    detail = (Array.isArray(json) ? json[0]?.error : json.error)?.message ?? text;
                } catch {
                    // keep raw text
                }
                void message.error(`${provider.label}: HTTP ${response.status} ${detail}`.slice(0, 300));
            }
        } catch (e) {
            void message.error(`${provider.label}: ${e.message}`);
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
                                        {provider.editableBaseUrl ? 'API reference' : 'Get an API key'}
                                    </a>
                                </div>
                                {provider.editableBaseUrl &&
                                    <Form.Item label="Base URL" name={baseUrlStorageKey(provider.id)}
                                        extra="The URL before /chat/completions, e.g. https://openrouter.ai/api/v1">
                                        <Input placeholder="https://.../v1"/>
                                    </Form.Item>}
                                <Form.Item label="API Key" name={apiKeyStorageKey(provider.id)}>
                                    <Input.Password placeholder={provider.apiKeyPlaceholder} autoComplete="off"/>
                                </Form.Item>
                                <div className={'flex items-end gap-[12px]'}>
                                    <Form.Item label="Model" name={modelStorageKey(provider.id)} className={'flex-1'}>
                                        <AutoComplete
                                            options={provider.modelSuggestions.map(m => ({value: m}))}
                                            placeholder={provider.defaultModel || 'model id'}
                                            filterOption={(input, option) => (option?.value ?? '').toLowerCase().includes(input.toLowerCase())}
                                        />
                                    </Form.Item>
                                    <Form.Item>
                                        <Button loading={testing === provider.id} onClick={() => testProvider(provider)}>Test</Button>
                                    </Form.Item>
                                </div>
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
