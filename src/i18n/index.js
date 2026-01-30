// i18n configuration and setup
import { createI18n } from './i18n-utils'

// Supported languages
export const SUPPORTED_LANGUAGES = [
  { code: 'EN', name: 'English' },
  { code: 'RU', name: 'Русский' },
  { code: 'DE', name: 'Deutsch' },
  { code: 'IT', name: 'Italiano' },
  { code: 'NL', name: 'Nederlands' },
  { code: 'PL', name: 'Polski' },
  { code: 'FR', name: 'Français' },
  { code: 'ES', name: 'Español' },
  { code: 'ID', name: 'Indonesian' },
  { code: 'TR', name: 'Türkçe' }
]

// Default language
export const DEFAULT_LANGUAGE = 'EN'

// Create i18n instance
export const i18n = createI18n()

// Export translation function
export const t = (key, params = {}) => {
  return i18n.t(key, params)
}

// Export function to change language
export const changeLanguage = (langCode) => {
  i18n.setLanguage(langCode)
  // Store in localStorage
  localStorage.setItem('lottery_language', langCode)
}

// Export function to get current language
export const getCurrentLanguage = () => {
  return i18n.getCurrentLanguage()
}

// Export function to subscribe to language changes
export const subscribeToLanguageChange = (listener) => {
  return i18n.subscribe(listener)
}

// Initialize language from localStorage or default
export const initLanguage = (userLanguageCode) => {
  // Priority: userLanguageCode from API > localStorage > default
  const storedLang = localStorage.getItem('lottery_language')
  const langToUse = userLanguageCode || storedLang || DEFAULT_LANGUAGE
  
  // Validate language code
  const isValidLang = SUPPORTED_LANGUAGES.some(lang => lang.code === langToUse)
  const finalLang = isValidLang ? langToUse : DEFAULT_LANGUAGE
  
  i18n.setLanguage(finalLang)
  if (finalLang !== storedLang) {
    localStorage.setItem('lottery_language', finalLang)
  }
  
  // Make translation function available globally for vanilla JS files
  if (typeof window !== 'undefined') {
    window.__lotteryTranslate = t
  }
  
  return finalLang
}

