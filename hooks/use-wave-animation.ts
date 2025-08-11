import { useState, useCallback } from 'react'

export interface WaveAnimationConfig {
  enabled: boolean
  speed: number        // 애니메이션 속도 (0.5x - 2x)
  amplitude: number    // 진폭 (높이 변화 범위)
  baseScale: number    // 기본 elevationScale
  minScale: number     // 최소 elevationScale
  maxScale: number     // 최대 elevationScale
}

export interface WaveAnimationState {
  currentScale: number
  isAnimating: boolean
}

/**
 * 간소화된 파도 애니메이션 훅
 * deck.gl의 내장 애니메이션 시스템을 활용하기 위해 단순화
 * 
 * deck.gl 권장 패턴:
 * - animated: true 속성 사용
 * - elevationScale을 함수로 설정하여 tick 매개변수 활용
 * - React state 기반 requestAnimationFrame 대신 deck.gl 시스템 활용
 */
export function useWaveAnimation(config: WaveAnimationConfig) {
  const [isUserInteracting, setIsUserInteracting] = useState(false)
  
  const [animationState, setAnimationState] = useState<WaveAnimationState>({
    currentScale: config.baseScale,
    isAnimating: config.enabled
  })

  // 애니메이션 토글
  const toggleAnimation = useCallback(() => {
    const newState = !animationState.isAnimating
    setAnimationState(prev => ({
      ...prev,
      isAnimating: newState,
      currentScale: newState ? config.baseScale : config.baseScale
    }))
  }, [animationState.isAnimating, config.baseScale])

  // 사용자 인터랙션 감지 (지도 조작시 애니메이션 일시정지)
  const handleUserInteractionStart = useCallback(() => {
    setIsUserInteracting(true)
  }, [])

  const handleUserInteractionEnd = useCallback(() => {
    // 1초 후 애니메이션 재개
    setTimeout(() => {
      setIsUserInteracting(false)
    }, 1000)
  }, [])

  return {
    // 현재 상태
    currentScale: animationState.currentScale,
    isAnimating: animationState.isAnimating && config.enabled && !isUserInteracting,
    isUserInteracting,
    
    // 제어 함수
    toggleAnimation,
    
    // 인터랙션 핸들러
    onInteractionStart: handleUserInteractionStart,
    onInteractionEnd: handleUserInteractionEnd,
    
    // 설정
    config
  }
}

export default useWaveAnimation