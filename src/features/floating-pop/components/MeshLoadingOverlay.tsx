/**
 * Mesh Loading Overlay Component
 * Beautiful loading animation displayed while mesh layer is being generated
 */

"use client"

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface MeshLoadingOverlayProps {
  isLoading: boolean
  progress?: number
}

export function MeshLoadingOverlay({ isLoading, progress }: MeshLoadingOverlayProps) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="relative flex flex-col items-center justify-center p-8 rounded-2xl bg-gradient-to-br from-gray-900/90 to-black/90 border border-gray-800/50 shadow-2xl"
          >
            {/* Animated Hexagon Grid */}
            <div className="relative w-64 h-48 mb-6">
              <svg
                viewBox="0 0 256 192"
                className="absolute inset-0 w-full h-full"
                style={{ filter: 'drop-shadow(0 0 20px rgba(0, 255, 225, 0.3))' }}
              >
                {/* Create hexagon grid pattern */}
                {[...Array(7)].map((_, row) => (
                  [...Array(5)].map((_, col) => {
                    const x = col * 52 + (row % 2 === 0 ? 0 : 26)
                    const y = row * 30 + 20
                    const delay = (row * 5 + col) * 0.1
                    
                    return (
                      <motion.polygon
                        key={`hex-${row}-${col}`}
                        points={`${x},${y - 15} ${x + 13},${y - 7.5} ${x + 13},${y + 7.5} ${x},${y + 15} ${x - 13},${y + 7.5} ${x - 13},${y - 7.5}`}
                        fill="none"
                        stroke="url(#hexGradient)"
                        strokeWidth="2"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{
                          opacity: [0, 1, 0.7, 1],
                          scale: [0, 1, 0.95, 1],
                        }}
                        transition={{
                          duration: 2,
                          delay,
                          repeat: Infinity,
                          repeatType: "reverse",
                          ease: "easeInOut"
                        }}
                      />
                    )
                  })
                ))}
                
                {/* Gradient definition */}
                <defs>
                  <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00FFE1" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#3B82F6" stopOpacity="1" />
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
              </svg>
              
              {/* Pulsing center hexagon */}
              <motion.div
                className="absolute top-1/2 left-1/2 w-16 h-16 -translate-x-1/2 -translate-y-1/2"
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 180, 360],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <svg viewBox="0 0 64 64" className="w-full h-full">
                  <polygon
                    points="32,4 52,16 52,48 32,60 12,48 12,16"
                    fill="none"
                    stroke="url(#centerGradient)"
                    strokeWidth="3"
                  />
                  <defs>
                    <linearGradient id="centerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#00FFE1" />
                      <stop offset="100%" stopColor="#3B82F6" />
                    </linearGradient>
                  </defs>
                </svg>
              </motion.div>
            </div>
            
            {/* Loading Text with Typewriter Effect */}
            <motion.h2
              className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              서울 426개 행정동
            </motion.h2>
            
            <motion.p
              className="text-lg text-gray-300 mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              카드매출액을 분석중입니다
            </motion.p>
            
            {/* Animated Loading Dots */}
            <div className="flex space-x-2">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                  animate={{
                    y: [0, -10, 0],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1.5,
                    delay: i * 0.2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>
            
            {/* Progress Bar (if progress is provided) */}
            {progress !== undefined && (
              <motion.div
                className="w-full mt-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 text-center">{Math.round(progress)}%</p>
              </motion.div>
            )}
            
            {/* Subtle particle effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={`particle-${i}`}
                  className="absolute w-1 h-1 bg-cyan-400/50 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    y: [-20, -100],
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0],
                  }}
                  transition={{
                    duration: 3 + Math.random() * 2,
                    delay: Math.random() * 2,
                    repeat: Infinity,
                    ease: "easeOut"
                  }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}