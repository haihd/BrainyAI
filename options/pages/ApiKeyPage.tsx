import React from 'react';
import { Form, Input, Button, message } from 'antd';
import { Storage } from "@plasmohq/storage";

export default function ApiKeyPage() {
    const [form] = Form.useForm();
    const storage = new Storage();

    React.useEffect(() => {
        async function loadApiKeys() {
            const openaiKey = await storage.get('openai-api-key');
            const ollamaSetting = JSON.parse(await storage.get('ollama-setting') || '{}');
            form.setFieldsValue({
                'openai-api-key': openaiKey,
                'ollama-url': ollamaSetting.url,
                'ollama-model': ollamaSetting.model,
            });
        }
        loadApiKeys();
    }, []);

    const onFinish = async (values: any) => {
        try {
            if (values['openai-api-key']) {
                await storage.set('openai-api-key', values['openai-api-key']);
            }
            if (values['ollama-url'] && values['ollama-model']) {
                await storage.set('ollama-setting', {
                    url: values['ollama-url'],
                    model: values['ollama-model'],
                });
            }
            
            if (!values['openai-api-key']) {
                message.error('Please enter OpenAI API Key.');
                return;
            }

            if (!values['ollama-url'] || !values['ollama-model']) {
                message.error('Please enter Ollama setting info.');
                return;
            }
            
            message.success('Update API Key successfully.');
        } catch (error) {
            message.error('Update API Key failed.');
        }
    };

    return (
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
                        <Input placeholder="Input URL"/>
                    </Form.Item>

                    <Form.Item
                        label="Model"
                        name="ollama-model"
                    >
                        <Input placeholder="Input model name"/>
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
    );
} 