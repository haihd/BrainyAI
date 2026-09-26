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
