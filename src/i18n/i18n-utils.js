// Simple i18n utility implementation
import translations from './translations'

class I18n {
  constructor() {
    this.currentLanguage = 'EN'
    this.listeners = []
  }

  setLanguage(langCode) {
    if (this.currentLanguage !== langCode) {
      this.currentLanguage = langCode
      this.notifyListeners()
    }
  }

  getCurrentLanguage() {
    return this.currentLanguage
  }

  t(key, params = {}) {
    const lang = this.currentLanguage
    const langTranslations = translations[lang] || translations['EN']
    
    let message = langTranslations[key]
    
    // Fallback to English if key not found
    if (!message) {
      message = translations['EN'][key]
    }
    
    // Fallback to key itself if still not found
    if (!message) {
      console.warn(`Translation key not found: ${key}`)
      return key
    }
    
    // Replace parameters in message
    if (params && Object.keys(params).length > 0) {
      Object.keys(params).forEach(paramKey => {
        const paramValue = params[paramKey]
        message = message.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), paramValue)
      })
    }
    
    return message
  }

  subscribe(listener) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentLanguage))
  }
}

export function createI18n() {
  return new I18n()
}

