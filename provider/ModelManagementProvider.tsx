import React, {createContext, useEffect, useRef, useState} from "react";
import {getLatestState} from "~utils";
import {Llavav1634b} from "~libs/chatbot/perplexity/Llavav1634b";
import {KimiBot} from "~libs/chatbot/kimi";
import {CopilotBot} from "~libs/chatbot/copilot";
import ChatGPT35Turbo from "~libs/chatbot/openai/ChatGPT35Turbo";
import {Gemma7bIt} from "~libs/chatbot/perplexity/Gemma7bIt";
import {Mistral822b} from "~libs/chatbot/perplexity/Mistral822b";
import {Llama3SonarLarge32KChat} from "~libs/chatbot/perplexity/Llama3SonarLarge32KChat";
import {Storage} from "@plasmohq/storage";
import {Llama3SonarLarge32kOnline} from "~libs/chatbot/perplexity/Llama3SonarLarge32kOnline";
import {Claude3Haiku} from "~libs/chatbot/perplexity/Claude3Haiku";
import {Llama370bInstruct} from "~libs/chatbot/perplexity/Llama370bInstruct";
import  ChatGPT4Turbo from "~libs/chatbot/openai/ChatGPT4Turbo";
import {Logger} from "~utils/logger";
import ChatGPT4O from "~libs/chatbot/openai/ChatGPT4o";
import {API_BOTS, type ApiBotClass} from "~libs/chatbot/api/ApiBot";
import OllamaAPI from "~libs/chatbot/openai/OllamaAPI";

export type M = (
    typeof ChatGPT35Turbo
    | typeof CopilotBot
    | typeof KimiBot
    | typeof Gemma7bIt
    | typeof Llavav1634b
    | typeof Mistral822b
    | typeof Llama3SonarLarge32KChat
    | typeof Llama370bInstruct
    | typeof Claude3Haiku
    | typeof Llama3SonarLarge32kOnline
    | typeof ChatGPT4Turbo
    | typeof ChatGPT4O
    | ApiBotClass
    | typeof OllamaAPI
    )

export type Ms = M[]

export interface CMsItem {
    label: string;
    models: M[];
}
export type CMs = CMsItem[]

interface IModelManagementProvider {
    currentBots: Ms;
    setCurrentBots: React.Dispatch<React.SetStateAction<Ms>>;
    allModels: React.MutableRefObject<Ms>;
    categoryModels: React.MutableRefObject<CMs>;
    saveCurrentBotsKeyLocal: () => void;
}

export const ModelManagementContext = createContext({} as IModelManagementProvider);

export default function ModelManagementProvider({children}) {
    const defaultModels: Ms = [OllamaAPI];
    const [currentBots, setCurrentBots] = useState<IModelManagementProvider['currentBots']>(defaultModels);
    // The website-based bots (ChatGPT web, Copilot, Kimi web, Perplexity Labs) are no longer
    // offered: those sites changed their private APIs and the models were retired.
    // Their code is kept for now; the same vendors are available through their official APIs.
    const allModels = useRef<Ms>([...API_BOTS, OllamaAPI]);
    const storage = new Storage();
    const [isLoaded, setIsLoaded] = useState(false);
    const categoryModels = useRef<CMs>([
        ...API_BOTS.map(bot => ({
            label: `${bot.provider.vendor} (API key)`,
            models: [bot] as Ms
        })),
        {
            label: "Local",
            models: [OllamaAPI]
        }]
    );

    const handleModelStorge = async () => {
        try {
            const value = await storage.get<string[]>("currentModelsKey");

            const arr: Ms = [];

            if (value && value.length) {
                Logger.log('local currentModels:',value);
                value.forEach((ele) => {
                    allModels.current.forEach((item) => {
                        if (item.botName === ele) {
                            arr.push(item);
                        }
                    });
                });

                if (arr.length) {
                    setCurrentBots(arr);
                }else {
                    setCurrentBots(defaultModels);
                }
            }
        }catch (e) {
            // ignore
        }
        finally {
            setIsLoaded(true);
        }
    };

    useEffect(()=>{
        void handleModelStorge();
    },[]);

    const getCurrentModelKey = async () => {
        const cbots: Ms = await getLatestState(setCurrentBots);
        return cbots.map(model => model.botName);
    };

    const saveCurrentBotsKeyLocal = async () => {
        void storage.set("currentModelsKey", await getCurrentModelKey());
        Logger.log('s-get', storage.get("currentModelsKey"));
    };

    return (
        <ModelManagementContext.Provider value={{currentBots, allModels, categoryModels, setCurrentBots: setCurrentBots, saveCurrentBotsKeyLocal}}>
            {isLoaded && children}
        </ModelManagementContext.Provider>
    );
}
