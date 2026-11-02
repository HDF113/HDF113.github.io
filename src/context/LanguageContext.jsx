import { createContext, useContext, useState, useEffect } from 'react'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem('site-language')
    return saved || 'zh'
  })

  useEffect(() => {
    localStorage.setItem('site-language', lang)
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
  }, [lang])

  const toggleLanguage = () => setLang((prev) => (prev === 'zh' ? 'en' : 'zh'))

  return (
    <LanguageContext.Provider value={{ lang, toggleLanguage, isZh: lang === 'zh' }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}

export function t(zh, en) {
  const { lang } = useLanguage()
  return lang === 'zh' ? zh : en
}
