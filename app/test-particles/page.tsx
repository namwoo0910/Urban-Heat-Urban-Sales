"use client"

import dynamic from "next/dynamic"

// SSR 비활성화 - Mapbox와 deck.gl은 브라우저에서만 작동
const SeoulMapParticles = dynamic(
  () => import("@/components/seoul-map-particles").then((mod) => mod.SeoulMapParticles),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-lg font-light">파티클 시스템 로딩 중...</p>
          <p className="text-sm text-white/60 mt-2">10,000개의 파티클을 생성하고 있습니다</p>
        </div>
      </div>
    )
  }
)

export default function TestParticlesPage() {
  return (
    <div className="w-full h-screen bg-black">
      <SeoulMapParticles />
      
      {/* 정보 패널 */}
      <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md rounded-lg border border-purple-500/30 p-4 text-white z-10">
        <h3 className="font-bold text-lg mb-2 text-purple-300">Seoul Particle System</h3>
        <div className="text-sm text-white/80 space-y-1">
          <div>🌟 10,000개 파티클</div>
          <div>🎨 그라데이션 색상 효과</div>
          <div>✨ 실시간 애니메이션</div>
          <div>🌊 Wave 모션 효과</div>
          <div>💫 가산 블렌딩 (Glow)</div>
        </div>
      </div>
      
      {/* 하단 힌트 */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-purple-900/50 backdrop-blur-md rounded-full px-6 py-2 text-white/80 text-sm z-10">
        마우스로 드래그하여 시점을 변경할 수 있습니다
      </div>
    </div>
  )
}