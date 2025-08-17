/**
 * @feature 홈페이지 - 메인 페이지
 * @description 파티클 애니메이션이 있는 홈페이지 메인 컴포넌트
 * 
 * @dependencies
 * - [로컬] ./HeroSection
 */

import dynamic from 'next/dynamic'

// Hero 섹션 동적 로드
const HeroSection = dynamic(
  () => import('./HeroSection').then(mod => mod.Hero),
  {
    loading: () => <div className="h-screen flex items-center justify-center">Loading...</div>,
    ssr: true
  }
)

export default function HomePage() {
  return (
    <div className="relative min-h-screen">
      <HeroSection />
    </div>
  )
}