"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type Language = 'ko' | 'en'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  toggleLanguage: () => void
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

const STORAGE_KEY = 'app-language'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ko')
  const [isHydrated, setIsHydrated] = useState(false)

  // Load language preference from localStorage after hydration
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'ko') {
      setLanguageState(stored)
    }
    setIsHydrated(true)
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem(STORAGE_KEY, lang)
  }

  const toggleLanguage = () => {
    const newLang = language === 'ko' ? 'en' : 'ko'
    setLanguage(newLang)
  }

  // Listen for remote language change events
  useEffect(() => {
    const handleRemoteToggle = () => {
      console.log('[LanguageContext] Remote toggle received')
      setLanguageState((prevLang) => {
        const newLang = prevLang === 'ko' ? 'en' : 'ko'
        localStorage.setItem(STORAGE_KEY, newLang)
        return newLang
      })
    }

    const handleRemoteSet = (e: Event) => {
      const customEvent = e as CustomEvent<Language>
      console.log('[LanguageContext] Remote set received:', customEvent.detail)
      setLanguageState(customEvent.detail)
      localStorage.setItem(STORAGE_KEY, customEvent.detail)
    }

    window.addEventListener('remote-language-toggle', handleRemoteToggle)
    window.addEventListener('remote-language-set', handleRemoteSet)

    return () => {
      window.removeEventListener('remote-language-toggle', handleRemoteToggle)
      window.removeEventListener('remote-language-set', handleRemoteSet)
    }
  }, [])  // No dependencies needed

  // Provide a safe context value even during pre-hydration to prevent errors
  const contextValue: LanguageContextType = {
    language: language,  // Always use current state
    setLanguage: isHydrated ? setLanguage : () => {},  // No-op before hydration
    toggleLanguage: isHydrated ? toggleLanguage : () => {}  // No-op before hydration
  }

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}