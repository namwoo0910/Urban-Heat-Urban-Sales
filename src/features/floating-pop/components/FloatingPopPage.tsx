/**
 * @feature 유동인구 분석 - 메인 페이지
 * @description 서울시 유동인구 어반마운틴 3D 시각화 메인 컴포넌트
 * 
 * @dependencies
 * - [로컬] ./UrbanMountain3D
 */

'use client'

import dynamic from 'next/dynamic'

// 어반마운틴 컴포넌트 동적 로드 (SSR 비활성화)
const UrbanMountain3D = dynamic(
  () => import('./UrbanMountain3D').then(mod => mod.UrbanMountainComplete),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-screen flex items-center justify-center bg-black">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <div>Urban Mountain 시각화 로딩 중...</div>
        </div>
      </div>
    )
  }
)

export default function FloatingPopPage() {
  return (
    <div className="w-full h-screen">
      <UrbanMountain3D className="w-full h-full" />
    </div>
  )
}