/**
 * @feature 행정구역 분석 - 메인 페이지
 * @description 서울시 행정구역 EDA 시각화 메인 컴포넌트
 * 
 * @dependencies
 * - [공통] @shared/components/navigation/TransitionLink
 * - [로컬] ./EDAMapVisualization
 */

'use client'

import dynamic from 'next/dynamic'

// EDA 시각화 컴포넌트 동적 로드 (SSR 비활성화)
const EDAMapVisualization = dynamic(
  () => import('./EDAMapVisualization'),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center text-white">
          <div className="w-16 h-16 border-4 border-white border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
          <div>행정구역 EDA 시각화 로딩 중...</div>
        </div>
      </div>
    )
  }
)

export default function AdminDistrictsPage() {
  return (
    <div className="w-full h-screen">
      <EDAMapVisualization />
    </div>
  )
}