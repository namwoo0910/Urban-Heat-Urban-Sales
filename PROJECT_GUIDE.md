## 📋 프로젝트 개요


- **주요 기술**: Next.js 15, React 19, TypeScript, Three.js, Deck.GL, Mapbox
- **특징**: 실시간 파티클 애니메이션, 3D 맵 시각화, 반응형 디자인

---

## 🏗️ 프로젝트 구조 및 레이어 연결

### 1️⃣ **Core Configuration Layer (설정)**
```
📁 프로젝트 루트
├── next.config.mjs          → Next.js 설정 (Webpack 최적화, Three.js 트랜스파일)
├── tailwind.config.ts       → 스타일링 설정 (색상 체계, 애니메이션)
├── tsconfig.json           → TypeScript 설정
├── package.json            → 의존성 관리 (Deck.GL, Three.js, Mapbox 등)
└── components.json         → Shadcn UI 컴포넌트 설정
```

### 2️⃣ **App Router Layer (Next.js 앱 라우터)**
```
📁 app/
├── layout.tsx              → 전역 레이아웃 (Header + Footer + Providers)
├── page.tsx                → 홈페이지 (Hero + Portfolio + Blog)
├── globals.css             → 전역 스타일
├── blog/                   → 블로그 섹션
│   ├── page.tsx           → 블로그 목록
│   └── [slug]/page.tsx    → 개별 블로그 포스트
├── contact/page.tsx        → 연락처 페이지
├── portfolio/              → 포트폴리오 프로젝트들
│   ├── ethereal-threads/
│   ├── project-cyberscape/
│   └── quantum-leap/
└── urbanmountain/          → 메인 데이터 시각화 페이지
    ├── layout.tsx         → Urban Mountain 전용 레이아웃
    └── page.tsx           → Urban Mountain 시각화
```

**연결 관계:**
- `app/layout.tsx` ← `components/header.tsx` + `components/footer.tsx`
- `app/page.tsx` ← `components/hero.tsx` + `components/portfolio.tsx`
- `app/urbanmountain/page.tsx` ← `components/urbanmountain-complete.tsx`

### 3️⃣ **Component Layer (UI 컴포넌트)**
```
📁 components/
├── 🎯 Core Components
│   ├── header.tsx          → 네비게이션 헤더 (GSAP 애니메이션)
│   ├── footer.tsx          → 사이트 푸터
│   ├── hero.tsx            → 메인 히어로 섹션 (파티클 맵 통합)
│   └── portfolio.tsx       → 포트폴리오 그리드
│
├── 🗺️ Map Visualization
│   ├── seoul-map-optimized.tsx     → 서울 파티클 맵 (Deck.GL + Mapbox)
│   ├── urbanmountain-complete.tsx  → 3D 도시 시각화 (인구 밀도)
│   ├── urbanmountain-map.tsx       → Urban Mountain 맵 컴포넌트
│   └── wave-layer-integrated.tsx   → 파티클 웨이브 레이어
│
├── 🎮 Interactive Controls
│   ├── animation-controls.tsx      → 파티클 애니메이션 제어
│   ├── LayerManager.tsx           → 맵 레이어 관리
│   └── UnifiedControls.tsx        → 통합 컨트롤 패널
│
├── 🔄 Animation & Transitions
│   ├── transition-link.tsx        → 페이지 전환 링크
│   ├── transition-provider.tsx    → 전환 상태 관리
│   ├── gsap-provider.tsx          → GSAP 글로벌 설정
│   └── glow-scene.tsx             → 3D 글로우 효과
│
├── 📊 Project Showcases
│   └── project/
│       ├── cyberscape-scene.tsx   → Cyberscape 3D 장면
│       ├── hexagon-scene.tsx      → 헥사곤 파티클 시스템
│       ├── quantum-scene.tsx      → 양자 효과 시각화
│       ├── project-header.tsx     → 프로젝트 헤더
│       └── project-navigation.tsx → 프로젝트 내비게이션
│
└── 🧩 UI Components (Shadcn)
    └── ui/                        → 재사용 가능한 UI 컴포넌트
        ├── button.tsx, card.tsx, dialog.tsx, ...
        └── (40+ shadcn 컴포넌트들)
```

**주요 연결 관계:**
- `hero.tsx` → `seoul-map-optimized.tsx` (파티클 맵 임베드)
- `seoul-map-optimized.tsx` → `wave-layer-integrated.tsx` (웨이브 효과)
- `animation-controls.tsx` → `seoul-map-optimized.tsx` (애니메이션 제어)

### 4️⃣ **Data & Logic Layer (데이터 처리)**
```
📁 utils/
├── particle-data.ts               → 파티클 생성 로직
├── particle-data-optimized.ts     → 최적화된 파티클 시스템
├── seoul-boundaries.ts            → 서울 경계 데이터 처리
├── seoul-boundaries-optimized.ts  → 최적화된 경계 계산
└── urbanmountain-data-converter.ts → Urban Mountain 데이터 변환

📁 hooks/
├── use-particle-animations.ts     → 파티클 애니메이션 훅
├── use-particle-cache.ts          → 파티클 캐싱 시스템
├── use-particle-worker.ts         → 웹 워커 파티클 처리
├── use-wave-animation.ts          → 웨이브 애니메이션 훅
├── use-layer-state.ts             → 맵 레이어 상태 관리
└── use-mobile.tsx                 → 모바일 감지

📁 workers/
└── particle-generator.worker.ts   → 파티클 생성 웹 워커

📁 context/
└── transition-context.tsx         → 페이지 전환 컨텍스트

📁 lib/
├── utils.ts                       → 유틸리티 함수
├── blog-posts.tsx                 → 블로그 데이터
└── premium-colors.ts              → 색상 팔레트
```

**데이터 흐름:**
1. `public/seoul_boundary.geojson` → `seoul-boundaries.ts` → 파티클 맵
2. `public/urbanmountain/processed_data/` → `urbanmountain-complete.tsx`
3. `workers/particle-generator.worker.ts` → `use-particle-worker.ts` → 맵 컴포넌트

### 5️⃣ **Static Assets Layer (정적 자원)**
```
📁 public/
├── seoul_boundary.geojson          → 서울시 경계 데이터
├── dummy-hexagon-data.json         → 헥사곤 데모 데이터
├── images/                         → 프로젝트 이미지들
├── urbanmountain/
│   ├── urbanmountain.html         → 독립 실행 시각화
│   └── processed_data/            → 전처리된 인구 데이터
│       ├── grid_coordinates.json  → 그리드 좌표
│       ├── grid_population.json   → 인구 밀도 데이터
│       └── metadata.json          → 메타데이터
└── placeholder images...          → 다양한 플레이스홀더 이미지

📁 styles/
└── globals.css                    → 글로벌 CSS (app/globals.css와 동일)
```

### 6️⃣ **Type Definitions Layer (타입 정의)**
```
📁 types/
└── mapbox.d.ts                    → Mapbox 타입 확장
```

---

## 🔗 레이어별 상호작용 흐름

### **메인 페이지 렌더링 흐름**
```
1. app/layout.tsx (전역 설정)
   ↓ GSAP Provider + Transition Provider 
2. app/page.tsx (페이지 구성)
   ↓ Hero + Portfolio + Blog 컴포넌트
3. components/hero.tsx (히어로 섹션)
   ↓ 동적 임포트
4. components/seoul-map-optimized.tsx (파티클 맵)
   ↓ 데이터 로딩
5. utils/particle-data-optimized.ts (파티클 생성)
   ↓ 웹 워커 처리
6. workers/particle-generator.worker.ts (백그라운드 계산)
```

### **Urban Mountain 시각화 흐름**
```
1. app/urbanmountain/page.tsx
   ↓ 동적 임포트
2. components/urbanmountain-complete.tsx
   ↓ 데이터 로딩
3. public/urbanmountain/processed_data/ (JSON 데이터)
   ↓ 3D 렌더링
4. Deck.GL + Three.js (3D 시각화)
```

### **애니메이션 제어 흐름**
```
1. components/animation-controls.tsx (사용자 입력)
   ↓ 상태 업데이트
2. hooks/use-particle-animations.ts (애니메이션 로직)
   ↓ 파티클 업데이트
3. components/seoul-map-optimized.tsx (렌더링)
   ↓ GPU 가속 렌더링
4. Deck.GL Layers (최종 시각화)
```

---

## 🚀 설치 및 실행 방법

### **1. 시스템 요구사항**
- **Node.js**: 18.0.0 이상
- **npm/yarn/pnpm**: 최신 버전
- **Mapbox 토큰**: 환경변수 설정 필요
- **브라우저**: Chrome, Firefox, Safari (WebGL 지원)

### **2. 설치 과정**

```bash
# 1. 저장소 클론
git clone <repository-url>
cd slw_vis

# 2. 의존성 설치 (pnpm 권장)
pnpm install
# 또는
npm install
# 또는
yarn install

# 3. 환경변수 설정
# .env.local 파일 생성
echo "NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here" > .env.local
```

### **3. Mapbox 토큰 설정**
1. [Mapbox 계정](https://www.mapbox.com/) 생성
2. 액세스 토큰 발급
3. `.env.local` 파일에 토큰 추가:
```env
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJ5b3VyLXRva2VuIn0...
```

### **4. 개발 서버 실행**

```bash
# 개발 모드 실행
pnpm dev
# 또는
npm run dev
# 또는
yarn dev

# 🌐 브라우저에서 접속
# http://localhost:3000
```

### **5. 빌드 및 배포**

```bash
# 프로덕션 빌드
pnpm build
npm run build

# 빌드 결과 실행
pnpm start
npm run start

# 코드 품질 검사
pnpm lint
npm run lint
```

---

## 🛠️ 개발 팁

### **성능 모니터링**
```javascript
// 브라우저 개발자 도구에서 확인
console.log('파티클 수:', particleCount)
console.log('FPS:', currentFPS)
console.log('메모리 사용량:', performance.memory?.usedJSHeapSize)
```

### **디버깅 모드**
```javascript
// AnimationControls에서 디버그 정보 확인 가능
// Performance Monitor 컴포넌트로 실시간 모니터링
```

### **데이터 업데이트**
- Urban Mountain 데이터: `public/urbanmountain/processed_data/` 폴더
- 서울 경계 데이터: `public/seoul_boundary.geojson`
- 새 데이터 추가시 타입 정의 업데이트 필요

---

## 📚 기술 스택 상세

| 카테고리 | 기술 | 용도 |
|---------|------|------|
| **프레임워크** | Next.js 15 | SSR, 라우팅, 최적화 |
| **UI 라이브러리** | React 19 | 컴포넌트 시스템 |
| **언어** | TypeScript | 타입 안전성 |
| **스타일링** | Tailwind CSS | 유틸리티 우선 CSS |
| **3D/맵** | Three.js, Deck.GL, Mapbox | 3D 렌더링, 지도 시각화 |
| **애니메이션** | GSAP, Framer Motion | 고급 애니메이션 |
| **UI 컴포넌트** | Radix UI, Shadcn | 접근성 고려 컴포넌트 |
| **성능** | Web Workers | 백그라운드 계산 |