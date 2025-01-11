import React, { useState, useEffect } from 'react';
import { Form, Input, Button, message, Dropdown, Space, type MenuProps, Select } from 'antd';
import { Storage } from "@plasmohq/storage";
import { url } from 'inspector';

export default function ApiKeyPage() {
    const [form] = Form.useForm();
    const storage = new Storage();
    const [selectedModel, setSelectedModel] = useState<string | undefined>(undefined);
    const [models, setModelList] = useState<{ key: string, label: string }[]>([]);

    async function loadOllamaModels() {
        let ollamaUrl = await storage.get('ollama-url');
        if (!ollamaUrl) {
            ollamaUrl = 'http://localhost:11434';
        }
        
        try {
            const url = `${ollamaUrl}/api/tags`;
            const response = await fetch(url);
            const data = await response.json();
            const modelNames = data.models.map((model: any) => ({
                key: model.name,
                label: model.name
            }));
            setModelList(modelNames);

            console.log('models:', modelNames);
        } catch (error) {
            console.error('Failed to load ollama models:', error);  
        }
    }

    async function loadApiKeys() {
        const openaiKey = await storage.get('openai-api-key');
        const ollamaUrl = await storage.get('ollama-url');
        const ollamaModel = await storage.get('ollama-model');
        form.setFieldsValue({
            'openai-api-key': openaiKey,
            'ollama-url': ollamaUrl,
            'ollama-model': ollamaModel,
        });
    }

    useEffect(() => {
        loadOllamaModels();
        loadApiKeys();
    }, []);

    const updateOllamaUrl = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value) {
            loadOllamaModels();
        } else {
            setModelList([]);
        }
    };

    const onFinish = async (values: any) => {
        try {
            if (values['openai-api-key']) {
                await storage.set('openai-api-key', values['openai-api-key']);
            } else {
                message.error('Please enter OpenAI API Key.');
                return;
            }
            if (values['ollama-url'] && values['ollama-model']) {
                // Store ollama setting
                await storage.set('ollama-url', values['ollama-url']);
                await storage.set('ollama-model', values['ollama-model']);
            } else {
                message.error('Please enter Ollama setting info.');
                return;
            }
            
            message.success('Update API Key successfully.');
        } catch (error) {
            message.error('Update API Key failed.');
        }
    };

    return (
        <div>
            <div
                className={'bg-white shadow-[0_4px_12px_0px_rgba(0,0,0,.2)] overflow-hidden rounded-tl-[24px] rounded-tr-[24px] px-[56px] py-[32px] mt-[32px] flex flex-col'}>
                <div className={'text-[#333333] font-[700] text-[20px] justify-start'}>API Key & Ollama</div>
                <div className="p-4">
                    <Form form={form} onFinish={onFinish} layout="vertical">
                        <Form.Item
                            label="OpenAI API Key"
                            name="openai-api-key"
                        >
                            <Input.Password placeholder="sk-..." />
                        </Form.Item>
                        
                        <Form.Item label="Ollama Setting">
                            <Form.Item
                                label="URL"
                                name="ollama-url"
                            >
                                <Input placeholder="Input URL" onChange={updateOllamaUrl}/>
                            </Form.Item>

                            <Form.Item
                                label="Model"
                                name="ollama-model"
                            >
                                <Select
                                style={{ minWidth: 120 }}
                                value={selectedModel}>
                                {models.map(model => (
                                    <Select.Option key={model.key} value={model.key}>
                                        {model.label}
                                    </Select.Option>
                                ))}
                        </Select>
                            </Form.Item>
                        </Form.Item>
                        

                        <Form.Item>
                            <Button 
                                type="primary" 
                                htmlType="submit"
                                className="z-10 relative bg-green-600 hover:bg-green-700"
                                style={{ backgroundColor: '#10B981' }}
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