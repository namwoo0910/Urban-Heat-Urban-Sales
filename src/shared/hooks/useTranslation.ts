"use client"

import { useLanguage } from '../contexts/LanguageContext'
import { translations, getTranslation } from '../data/translations'

export function useTranslation() {
  const { language } = useLanguage()

  // Generic translation function using dot notation path
  const t = (key: string): string => {
    return getTranslation(key, language)
  }

  // Get district name in current language
  const getDistrict = (districtName: string): string => {
    const district = translations.districts[districtName]
    if (!district) return districtName
    return district[language] || districtName
  }

  // Get dong name in current language
  const getDong = (dongName: string): string => {
    const dong = translations.dongs[dongName]
    if (!dong) return dongName
    return dong[language] || dongName
  }

  // Get business type name in current language
  const getBusinessType = (businessType: string): string => {
    const type = translations.businessTypes[businessType]
    if (!type) return businessType
    return type[language] || businessType
  }

  // Get month name by number (1-12)
  const getMonth = (monthNumber: number): string => {
    const months = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ]
    const monthKey = months[monthNumber - 1]
    if (!monthKey) return String(monthNumber)
    return t(`months.${monthKey}`)
  }

  // Format year and month
  const getYearMonth = (year: number, month: number): string => {
    if (language === 'ko') {
      return `${year}년 ${month}월`
    } else {
      const monthName = getMonth(month)
      return `${monthName} ${year}`
    }
  }

  // Format currency with appropriate units
  const formatCurrency = (amount: number): string => {
    if (language === 'ko') {
      if (amount >= 100000000) {
        return `${(amount / 100000000).toFixed(1)}${t('currency.billionWon')}`
      } else if (amount >= 1000000) {
        return `${(amount / 1000000).toFixed(1)}${t('currency.millionWon')}`
      }
      return `${amount.toLocaleString()}${t('currency.won')}`
    } else {
      if (amount >= 100000000) {
        return `${(amount / 100000000).toFixed(1)} ${t('currency.billionWon')}`
      } else if (amount >= 1000000) {
        return `${(amount / 1000000).toFixed(1)} ${t('currency.millionWon')}`
      }
      return `${amount.toLocaleString()} ${t('currency.won')}`
    }
  }

  return {
    t,
    getDistrict,
    getDong,
    getBusinessType,
    getMonth,
    getYearMonth,
    formatCurrency,
    language,
  }
}