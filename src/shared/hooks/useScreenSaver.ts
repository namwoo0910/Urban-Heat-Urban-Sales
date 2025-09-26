"use client"

import { useState, useEffect } from 'react'

export function useScreenSaver(inactivityMinutes?: number) {
  const [isScreenSaverActive, setIsScreenSaverActive] = useState(true)

  const disableScreenSaver = () => {
    setIsScreenSaverActive(false)
  }

  const enableScreenSaver = () => {
    setIsScreenSaverActive(true)
  }

  // Reset screen saver after a period of inactivity (optional)
  useEffect(() => {
    if (isScreenSaverActive || !inactivityMinutes) return

    const timeout = setTimeout(() => {
      setIsScreenSaverActive(true)
    }, inactivityMinutes * 60 * 1000)

    return () => clearTimeout(timeout)
  }, [isScreenSaverActive, inactivityMinutes])

  return {
    isScreenSaverActive,
    disableScreenSaver,
    enableScreenSaver
  }
}