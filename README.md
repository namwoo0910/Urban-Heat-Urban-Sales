# 📚 서울시 데이터 시각화 프로젝트 구조 가이드

## 📌 프로젝트 개요

### 🛠️ 기술 스택
- **프레임워크**: Next.js 15.2.4 (App Router)
- **언어**: TypeScript 5
- **스타일링**: Tailwind CSS 3.4.17
- **UI 컴포넌트**: Radix UI, shadcn/ui
- **지도**: Mapbox GL 3.14.0, React Map GL 7.1.9
- **데이터 시각화**: Deck.gl 9.1.14
- **차트 라이브러리**: Recharts 2.15.4
- **애니메이션**: GSAP 3.13.0, Framer Motion 12.23.12
- **아이콘**: Lucide React
- **패키지 매니저**: npm

---

## 📂 디렉토리 구조

```
slw_vis/
├── 📁 app/                          # 🎯 페이지 라우팅 (App Router)
│   ├── layout.tsx                   # 최상위 레이아웃
│   ├── page.tsx                     # 홈페이지 (/)
│   ├── globals.css                  # 전역 CSS
│   ├── 📁 eda-visualization/        # EDA 시각화 페이지
│   ├── 📁 research/                 # 연구 섹션
│   │   ├── 📁 eda/                  # EDA 분석 페이지
│   │   └── 📁 local-economy/        # 지역경제 페이지
│   ├── 📁 research-section/         # 연구 섹션 메인
│   ├── 📁 urbanmountain/            # 3D 도시 시각화
│   └── 📁 contact/                  # 연락처 페이지
│
├── 📁 src/                          # 🎨 소스 코드
│   ├── 📁 features/                 # 기능별 모듈
│   │   ├── 📁 home/                 # 홈페이지 기능
│   │   │   ├── 📁 components/       # UI 컴포넌트
│   │   │   ├── 📁 hooks/            # 커스텀 Hook
│   │   │   └── 📁 utils/            # 유틸리티 함수
│   │   ├── 📁 admin-districts/      # 행정구역 지도
│   │   ├── 📁 card-sales/           # 카드 매출 시각화
│   │   └── 📁 data-portal/          # 데이터 포털
│   │
│   ├── 📁 shared/                   # 🔗 공유 모듈
│   │   ├── 📁 components/           # 공통 컴포넌트
│   │   │   ├── 📁 charts/           # 재사용 가능한 차트 컴포넌트
│   │   │   ├── 📁 layout/           # Header, Footer
│   │   │   ├── 📁 navigation/       # 네비게이션
│   │   │   └── 📁 ui/               # 기본 UI (버튼, 카드 등)
│   │   ├── 📁 constants/            # 상수 정의
│   │   ├── 📁 hooks/                # 공통 Hook
│   │   ├── 📁 providers/            # Context Provider
│   │   ├── 📁 types/                # TypeScript 타입
│   │   └── 📁 utils/                # 공통 유틸리티
│   │
│   └── 📁 workers/                  # 🔧 Web Worker
│       ├── geoJSONWorker.ts         # GeoJSON 처리
│       └── particleWorker.ts        # 파티클 계산
│
├── 📁 public/                       # 📦 정적 파일
│   ├── 📁 data/                     # 데이터 파일
│   │   ├── 📁 eda/                  # 지도 데이터 (GeoJSON)
│   │   ├── particles-*.json         # 파티클 데이터
│   │   └── 📁 processed_data/       # 전처리 데이터
│   ├── 📁 images/                   # 이미지 파일
│   └── seoul_boundary.geojson       # 서울시 경계
│
├── 📁 scripts/                      # 🔨 빌드 스크립트
├── 📁 types/                        # 🎯 전역 타입 정의
└── 📁 projects/                     # 📚 프로젝트별 분리 (미사용)
```

---

## 📄 파일별 상세 설명

### ⚙️ 설정 파일 (프로젝트 루트)

#### **package.json**
- **역할**: 프로젝트 메타데이터, 의존성 관리, 스크립트 정의
- **주요 스크립트**:
  - `dev`: 개발 서버 실행
  - `build`: 프로덕션 빌드
  - `generate-particles`: 파티클 데이터 생성
- **의존성**: React, Next.js, Deck.gl, Mapbox, GSAP 등

#### **tsconfig.json**
- **역할**: TypeScript 컴파일러 설정
- **주요 설정**:
  - `strict: true`: 엄격한 타입 체크
  - `paths`: 경로 별칭 (@/, @src/, @features/ 등)
  - `target: ES6`: ES6 문법 사용

#### **next.config.mjs**
- **역할**: Next.js 프레임워크 설정
- **주요 설정**:
  - 이미지 최적화 (webp, avif)
  - Webpack 번들 최적화
  - 캐싱 정책
  - Three.js 트랜스파일

#### **tailwind.config.ts**
- **역할**: Tailwind CSS 설정
- **내용**:
  - 커스텀 색상 테마
  - 반응형 브레이크포인트
  - 애니메이션 설정

#### **postcss.config.mjs**
- **역할**: PostCSS 플러그인 설정
- **기능**: Tailwind CSS 처리

#### **components.json**
- **역할**: shadcn/ui 컴포넌트 설정
- **내용**: 스타일, 경로 별칭, 아이콘 라이브러리

---

### 🎯 페이지 파일 (app/)

#### **app/layout.tsx**
- **역할**: 최상위 레이아웃 (모든 페이지 감싸기)
- **포함 요소**:
  - Header, Footer
  - GsapProvider (애니메이션)
  - TransitionProvider (페이지 전환)
- **중요 기능**: Mapbox 리소스 프리로드

#### **app/page.tsx**
- **역할**: 홈페이지 진입점
- **연결**: HomePage 컴포넌트 렌더링

#### **app/eda-visualization/page.tsx**
- **역할**: EDA 데이터 시각화 페이지
- **연결**: AdminDistrictsPage 컴포넌트

#### **app/research/[하위]/page.tsx**
- **역할**: 연구 섹션 각 페이지
- **페이지들**:
  - eda: EDA 분석
  - local-economy: 지역경제

---

### 🎨 기능별 컴포넌트 (src/features/)

#### **📁 home/ - 홈페이지 기능**

**components/**
- `HomePage.tsx`: 홈페이지 메인 컴포넌트
- `HeroSection.tsx`: 히어로 섹션 (메인 비주얼)
- `ParticleMapSeoul.tsx`: 서울 파티클 지도 시각화
- `ParticleAnimationControls.tsx`: 파티클 애니메이션 컨트롤

**hooks/**
- `useParticleAnimation.ts`: 파티클 애니메이션 로직
- `useParticleWorker.ts`: Web Worker 통신
- `useParticleCache.ts`: 파티클 데이터 캐싱
- `useWaveEffect.ts`: 웨이브 효과

**utils/**
- `particleGenerator.ts`: 파티클 생성 로직
- `particleOptimizer.ts`: 파티클 최적화

#### **📁 admin-districts/ - 행정구역 지도**

**components/**
- `AdminDistrictsPage.tsx`: 행정구역 페이지 메인
- `EDAMapVisualization.tsx`: Mapbox 지도 시각화

**utils/**
- `boundaryProcessor.ts`: 경계 데이터 처리

#### **📁 card-sales/ - 카드 매출 시각화**

**components/**
- `HexagonLayer3D.tsx`: 3D 육각형 레이어 (Deck.gl)
- `LayerManager.tsx`: 레이어 관리
- `SalesDataControls.tsx`: 데이터 컨트롤 UI

**components/charts/** - 매출 차트 컴포넌트
- `SalesChartPanel.tsx`: 차트 대시보드 메인 패널
- `SalesLineChart.tsx`: 일별 매출 추이 차트
- `SalesAreaChart.tsx`: 누적 매출 영역 차트
- `SalesBarChart.tsx`: 업종별 막대 차트
- `SalesPieChart.tsx`: 연령대별 파이 차트
- `SalesRadarChart.tsx`: 요일별 패턴 레이더 차트
- `SalesComposedChart.tsx`: 복합 분석 차트
- `SalesHeatmapChart.tsx`: 히트맵 시각화

**hooks/**
- `useCardSalesData.ts`: 카드 매출 데이터 관리
- `useWaveAnimation.ts`: 웨이브 애니메이션

**data/**
- `salesChartData.ts`: 차트용 샘플 데이터

**utils/**
- `premiumColors.ts`: 프리미엄 색상 팔레트

#### **📁 data-portal/ - 데이터 포털**

**components/**
- `DataFeatureCard.tsx`: 데이터 기능 카드
- `PortalNavigation.tsx`: 포털 네비게이션
- `ResearchHeader.tsx`: 연구 헤더
- `ResearchSection.tsx`: 연구 섹션

---

### 🔗 공유 모듈 (src/shared/)

#### **📁 components/charts/ - 재사용 가능한 차트 컴포넌트**
- `LineChart.tsx`: 선 그래프 컴포넌트
- `AreaChart.tsx`: 영역 차트 컴포넌트
- `BarChart.tsx`: 막대 차트 컴포넌트
- `PieChart.tsx`: 파이 차트 컴포넌트
- `RadarChart.tsx`: 레이더 차트 컴포넌트
- `RadialBarChart.tsx`: 방사형 막대 차트
- `ComposedChart.tsx`: 복합 차트 컴포넌트
- `ScatterChart.tsx`: 산점도 차트
- `FunnelChart.tsx`: 깔때기 차트
- `TreemapChart.tsx`: 트리맵 차트
- `HeatmapChart.tsx`: 히트맵 차트
- `index.ts`: 차트 컴포넌트 내보내기
- `types.ts`: 차트 타입 정의

#### **📁 components/ui/ - UI 컴포넌트**
- `button.tsx`: 버튼 컴포넌트
- `card.tsx`: 카드 컴포넌트
- `input.tsx`: 입력 필드
- `select.tsx`: 선택 박스
- `slider.tsx`: 슬라이더
- `switch.tsx`: 스위치
- `tabs.tsx`: 탭
- `chart.tsx`: 차트 컨테이너 및 툴팁 컴포넌트
- 기타 Radix UI 기반 컴포넌트

#### **📁 components/layout/**
- `AppHeader.tsx`: 헤더 컴포넌트
- `AppFooter.tsx`: 푸터 컴포넌트

#### **📁 components/navigation/**
- `TransitionLink.tsx`: 페이지 전환 링크

#### **📁 providers/**
- `GSAPProvider.tsx`: GSAP 애니메이션 전역 설정
- `TransitionProvider.tsx`: 페이지 전환 관리
- `TransitionContext.tsx`: 전환 컨텍스트

#### **📁 constants/**
- `colors.ts`: 색상 상수 정의
- `mapConfig.ts`: 지도 설정 (초기 위치, 스타일 등)

#### **📁 hooks/**
- `useGeoJSONWorker.ts`: GeoJSON Web Worker Hook

#### **📁 utils/**
- `cn.ts`: 클래스명 병합 유틸리티
- `dataCompressor.ts`: 데이터 압축
- `geoJSONLoader.ts`: GeoJSON 로더
- `mathHelpers.ts`: 수학 헬퍼 함수

#### **📁 types/**
- `index.ts`: 공통 타입 정의
  - ParticleData, AnimationConfig
  - MapViewport, SeoulBoundaryData
  - HexagonLayerData, LayerConfig
  - WorkerMessage, WorkerResponse

---

### 🔧 Web Workers (src/workers/)

#### **geoJSONWorker.ts**
- **역할**: GeoJSON 파일 백그라운드 처리
- **기능**: 파싱, 필터링, 단순화

#### **particleWorker.ts**
- **역할**: 파티클 계산 백그라운드 처리
- **기능**: 위치 계산, 애니메이션 처리

---

### 📦 정적 파일 (public/)

#### **📁 data/**
- `eda/*.geojson`: 서울시 구, 동, 동네 경계
- `particles-*.json`: 파티클 애니메이션 데이터
- `wave-grid.json`: 웨이브 그리드 데이터
- `color-themes.json`: 색상 테마 설정

#### **📁 images/**
- 프로젝트 이미지 (webp, png 포맷)
- KAIST AI 로고
- 데이터 시각화 썸네일

---

## 🚀 개발 가이드

### 📄 새 페이지 추가하기

**수정할 파일들:**
1. **app/[페이지명]/page.tsx** 생성
   ```tsx
   // 페이지 컴포넌트 import
   import MyPage from '@/src/features/[기능명]/components/MyPage'
   
   export default function Page() {
     return <MyPage />
   }
   ```

2. **src/features/[기능명]/** 폴더 생성
   - `components/MyPage.tsx`: 페이지 메인 컴포넌트
   - `hooks/`: 필요한 Hook
   - `utils/`: 유틸리티 함수

3. **src/shared/components/layout/AppHeader.tsx** 수정
   - 네비게이션 메뉴에 링크 추가

### 🧩 새 컴포넌트 추가하기

**일반 컴포넌트:**
1. **src/features/[기능명]/components/[컴포넌트명].tsx** 생성
2. 필요시 **src/shared/types/index.ts**에 타입 추가
3. 부모 컴포넌트에서 import하여 사용

**공통 UI 컴포넌트:**
1. **src/shared/components/ui/[컴포넌트명].tsx** 생성
2. Radix UI 사용시 **package.json** 의존성 확인
3. **tailwind.config.ts**에 필요한 스타일 추가

### 🎨 스타일 변경하기

**전역 스타일:**
- **app/globals.css** 수정

**Tailwind 설정:**
- **tailwind.config.ts** 수정
  - colors: 색상 테마
  - extend: 커스텀 클래스

**컴포넌트 스타일:**
- 각 컴포넌트 파일 내 className 수정
- **src/shared/utils/cn.ts** 활용하여 조건부 스타일

### 📊 데이터 시각화 추가하기

**Deck.gl 레이어:**
1. **src/features/[기능명]/components/[레이어명].tsx** 생성
2. **package.json** 확인 (@deck.gl/* 패키지)
3. 데이터 파일을 **public/data/**에 추가
4. **src/shared/types/index.ts**에 데이터 타입 정의

**Mapbox 지도:**
1. **src/features/[기능명]/components/[지도명].tsx** 생성
2. **src/shared/constants/mapConfig.ts**에 설정 추가
3. react-map-gl 컴포넌트 사용

### 📈 차트 컴포넌트 추가하기

**새로운 차트 타입 추가:**
1. **src/shared/components/charts/**에 기본 차트 컴포넌트 활용
   ```typescript
   import { LineChart } from '@/src/shared/components/charts'
   
   export function MyChart() {
     return (
       <LineChart
         data={myData}
         xDataKey="date"
         yDataKey="value"
         strokeColor="#3b82f6"
         height={300}
       />
     )
   }
   ```

2. **차트 패널 생성 (탭 형식):**
   ```typescript
   import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/shared/components/ui/tabs'
   import { MyChart1, MyChart2 } from './charts'
   
   export function ChartPanel() {
     return (
       <Tabs defaultValue="chart1">
         <TabsList>
           <TabsTrigger value="chart1">차트 1</TabsTrigger>
           <TabsTrigger value="chart2">차트 2</TabsTrigger>
         </TabsList>
         <TabsContent value="chart1"><MyChart1 /></TabsContent>
         <TabsContent value="chart2"><MyChart2 /></TabsContent>
       </Tabs>
     )
   }
   ```

3. **차트 데이터 타입 정의:**
   ```typescript
   // src/features/[기능명]/data/chartData.ts
   export interface ChartDataPoint {
     name: string
     value: number
     category?: string
   }
   
   export const chartData: ChartDataPoint[] = [
     { name: '1월', value: 100 },
     { name: '2월', value: 150 },
   ]
   ```

**사용 가능한 차트 컴포넌트:**
- LineChart: 선 그래프 (시계열 데이터)
- AreaChart: 영역 차트 (누적 데이터)
- BarChart: 막대 차트 (카테고리 비교)
- PieChart: 파이 차트 (비율 표시)
- RadarChart: 레이더 차트 (다차원 비교)
- HeatmapChart: 히트맵 (2차원 데이터)
- ComposedChart: 복합 차트 (여러 차트 타입 결합)
- ScatterChart: 산점도 (상관관계)
- FunnelChart: 깔때기 차트 (단계별 전환)
- TreemapChart: 트리맵 (계층적 데이터)

### 🚀 하이브리드 데이터 아키텍처

#### **최적화된 데이터 구조**
프로젝트는 **정적 지오메트리**와 **동적 매출 데이터**를 분리한 하이브리드 구조를 사용합니다.

**주요 특징:**
- 🔷 **정적 지오메트리**: 한 번만 로드, 모든 날짜에서 재사용
- 📊 **월별 매출 데이터**: 필요시 로드, 일별 필터링은 메모리에서 처리
- ⚡ **성능 개선**: 초기 로딩 91% 감소, 날짜 변경 즉시 처리

#### **데이터 파일 구조**
```
public/data/
├── 📁 binary/                       # 🚀 Binary 형식 (NEW!)
│   └── 📁 optimized/
│       ├── geometry-static.bin      # 지오메트리 (1.99MB, 89.8% 감소)
│       ├── geometry-static.bin.gz   # 압축 버전 (0.94MB)
│       ├── 📁 monthly/              # 월별 Binary 데이터
│       │   ├── sales-2024-01.bin   # (0.3MB, 97.6% 감소)
│       │   └── sales-2024-01.bin.gz # 압축 (0.11MB)
│       └── index.json               # Binary 인덱스
├── 📁 optimized/                    # JSON 형식 (폴백)
│   ├── geometry-static.json         # 정적 지오메트리 (20MB)
│   │   └── 426개 동의 좌표, centroid, boundingBox
│   ├── 📁 monthly/                  # 월별 매출 데이터
│   │   ├── sales-2024-01.json      # 1월 (31일 데이터, 12MB)
│   │   ├── sales-2024-02.json      # 2월 (29일 데이터)
│   │   └── ...                     # 12개월 데이터
│   └── metadata.json                # 메타데이터 및 성능 정보
├── 📁 local_economy/                # 원본 데이터
│   ├── local_economy_dong.geojson  # 동 경계 GeoJSON
│   └── 📁 monthly/                 # 월별 원본 데이터
│       └── 2024-01.json            # 원본 매출/기상 데이터
```

#### **🚀 Binary 형식 성능 개선**
- **파일 크기**: 167MB → 5.55MB (**96.7% 감소**)
- **로딩 속도**: **10배 향상**
- **메모리 사용**: **50% 감소**
- **환경 변수로 제어**: `NEXT_PUBLIC_USE_BINARY_FORMAT=true`

#### **데이터 로딩 플로우**
```typescript
// 1. 최적화된 월별 데이터 Hook 사용
import { useOptimizedMonthlyData } from '@/features/card-sales/hooks/useOptimizedMonthlyData'

// 2. 데이터 로드 (자동 캐싱)
const { 
  features,      // 합성된 동별 데이터
  dongMap,       // 동코드 → 데이터 맵
  isLoading,     // 로딩 상태
  error          // 에러 상태
} = useOptimizedMonthlyData({
  selectedDate: '2024-01-15'  // YYYY-MM-DD 형식
})

// 3. 데이터 접근
const dongData = dongMap.get(11110515)  // 동코드로 조회
console.log(dongData.height)            // 3D 높이값
console.log(dongData.totalSales)        // 총 매출액
console.log(dongData.fillColorRGB)      // 테마별 색상
```

#### **데이터 구조 예시**
```typescript
// OptimizedDongFeature 타입
{
  dongCode: 11110515,
  dongName: "종로1·2·3·4가동",
  sggName: "종로구",
  // 사전 계산된 값
  height: 5,                    // 3D 높이 (0-1000)
  totalSales: 88248797,         // 매출액
  percentile: 19,               // 백분위
  colorIndex: 1,                // 색상 인덱스 (0-5)
  // 지오메트리
  centroid: [126.996, 37.570],
  boundingBox: [126.99, 37.56, 127.00, 37.58],
  coordinates: [[[...]]]        // 원본 좌표 (정밀도 유지)
}
```

#### **데이터 생성 및 업데이트**
```bash
# 최적화된 데이터 생성 (local_economy/monthly 데이터 기반)
npm run generate-optimized-data

# 생성 프로세스:
# 1. GeoJSON에서 정적 지오메트리 추출
# 2. 월별 매출 데이터를 일별로 분리
# 3. 매출액 기준 높이/색상 계산
# 4. 정수화 최적화 (매출/기상 데이터)
# 5. 각 파일 저장 (geometry + monthly/)
```

#### **성능 최적화 전략**
| 구분 | 기존 | 최적화 후 | 개선율 |
|------|------|-----------|--------|
| **초기 로딩** | 25MB × 365일 | 20MB + 12MB | 91% 감소 |
| **날짜 변경** | 25MB 재로드 | 0ms (메모리) | 즉시 처리 |
| **월 변경** | 25MB | 12MB | 52% 감소 |
| **캐싱** | 없음 | 3개월 LRU | 메모리 효율 |

### 🔌 API 연동하기

**데이터 fetching:**
1. **src/features/[기능명]/hooks/use[데이터명].ts** 생성
   ```typescript
   export function useMyData() {
     const [data, setData] = useState()
     
     useEffect(() => {
       fetch('/api/mydata')
         .then(res => res.json())
         .then(setData)
     }, [])
     
     return data
   }
   ```

2. **app/api/[엔드포인트]/route.ts** 생성 (API 라우트)

3. 컴포넌트에서 Hook 사용

### 🎬 애니메이션 추가하기

**GSAP 애니메이션:**
1. **src/features/[기능명]/hooks/use[애니메이션명].ts** 생성
2. gsap 라이브러리 import
3. useEffect 내에서 애니메이션 정의
4. **src/shared/providers/GSAPProvider.tsx** 확인

**Framer Motion:**
1. 컴포넌트에서 motion 컴포넌트 사용
2. **package.json**에서 framer-motion 확인

### 🗺️ 지도 기능 수정하기

**지도 스타일:**
- **src/shared/constants/mapConfig.ts** 수정
  - mapStyle: Mapbox 스타일 URL
  - initialViewport: 초기 위치/줌

**GeoJSON 데이터:**
1. **public/data/eda/**에 .geojson 파일 추가
2. **src/shared/hooks/useGeoJSONWorker.ts** 사용하여 로드
3. **src/workers/geoJSONWorker.ts**에서 처리 로직 수정

### 🚦 상태 관리하기

**로컬 상태:**
- useState, useReducer 사용

**전역 상태:**
1. **src/shared/providers/**에 Provider 생성
2. **app/layout.tsx**에 Provider 추가
3. useContext로 상태 사용

### 🔧 Web Worker 사용하기

**새 Worker 추가:**
1. **src/workers/[워커명].ts** 생성
2. **src/features/[기능명]/hooks/use[워커명].ts** Hook 생성
3. postMessage/onmessage로 통신

### 📦 빌드 및 배포

**개발 서버:**
```bash
npm run dev
```

**프로덕션 빌드:**
```bash
npm run build
npm run start
```

**정적 파일 생성:**
```bash
npm run generate-particles
```

### 🐛 디버깅 팁

**TypeScript 에러:**
- **tsconfig.json**의 strict 설정 확인
- **src/shared/types/**에 타입 정의 추가

**스타일 문제:**
- 브라우저 개발자 도구에서 Tailwind 클래스 확인
- **tailwind.config.ts** 설정 확인

**성능 문제:**
- React DevTools Profiler 사용
- **next.config.mjs**의 최적화 설정 확인
- Web Worker로 무거운 계산 이동

---

## 📚 추가 리소스

- [Next.js 공식 문서](https://nextjs.org/docs)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [Deck.gl 문서](https://deck.gl/docs)
- [Mapbox GL JS 문서](https://docs.mapbox.com/mapbox-gl-js/)
- [GSAP 문서](https://gsap.com/docs/)