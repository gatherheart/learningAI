import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";

export const LOCALES = [{ code: "en", label: "English" }] as const;

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en } },
    lng: "en",
    fallbackLng: "en",
    supportedLngs: ["en"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage"],
      caches: ["localStorage"],
      lookupLocalStorage: "learningAI:lang",
    },
  });

document.documentElement.lang = "en";
document.documentElement.dir = "ltr";

export default i18n;
