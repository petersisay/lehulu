import React, { createContext, useContext, useState, useEffect } from 'react';
import { en } from '../locales/en';
import { am } from '../locales/am';
const LanguageContext = createContext(undefined);
export const LanguageProvider = ({ children }) => {
    const [language, setLanguageState] = useState(() => {
        const saved = localStorage.getItem('lehulu_language');
        return saved === 'en' || saved === 'am' ? saved : 'am'; // Default to Amharic for local Ethiopian context
    });
    const setLanguage = (lang) => {
        setLanguageState(lang);
        localStorage.setItem('lehulu_language', lang);
        document.documentElement.lang = lang;
    };
    useEffect(() => {
        document.documentElement.lang = language;
    }, [language]);
    const dict = language === 'am' ? am : en;
    const t = (path) => {
        const keys = path.split('.');
        let current = dict;
        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            }
            else {
                // Fallback to English
                let fallback = en;
                for (const fbKey of keys) {
                    if (fallback && typeof fallback === 'object' && fbKey in fallback) {
                        fallback = fallback[fbKey];
                    }
                    else {
                        return path;
                    }
                }
                return typeof fallback === 'string' ? fallback : path;
            }
        }
        return typeof current === 'string' ? current : path;
    };
    return (<LanguageContext.Provider value={{ language, setLanguage, dict, t }}>
      {children}
    </LanguageContext.Provider>);
};
export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
