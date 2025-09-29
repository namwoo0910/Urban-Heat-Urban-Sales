/**
 * Centralized translation data for Korean-English language support
 */

import { dongTranslations } from './dongTranslations'

export interface TranslationItem {
  ko: string
  en: string
}

export interface Translations {
  districts: Record<string, TranslationItem>
  dongs: Record<string, TranslationItem>
  businessTypes: Record<string, TranslationItem>
  controller: Record<string, TranslationItem>
  panels: Record<string, TranslationItem>
  charts: Record<string, TranslationItem>
  mapControls: Record<string, TranslationItem>
  common: Record<string, TranslationItem>
  months: Record<string, TranslationItem>
  currency: Record<string, TranslationItem>
  status: Record<string, TranslationItem>
  research: Record<string, TranslationItem>
  team: Record<string, TranslationItem>
  hero: Record<string, TranslationItem>
  video: Record<string, TranslationItem>
  loading: Record<string, TranslationItem>
  navigation: Record<string, TranslationItem>
}

export const translations: Translations = {
  // 25 Seoul Districts
  districts: {
    "강남구": { ko: "강남구", en: "Gangnam-gu" },
    "강동구": { ko: "강동구", en: "Gangdong-gu" },
    "강북구": { ko: "강북구", en: "Gangbuk-gu" },
    "강서구": { ko: "강서구", en: "Gangseo-gu" },
    "관악구": { ko: "관악구", en: "Gwanak-gu" },
    "광진구": { ko: "광진구", en: "Gwangjin-gu" },
    "구로구": { ko: "구로구", en: "Guro-gu" },
    "금천구": { ko: "금천구", en: "Geumcheon-gu" },
    "노원구": { ko: "노원구", en: "Nowon-gu" },
    "도봉구": { ko: "도봉구", en: "Dobong-gu" },
    "동대문구": { ko: "동대문구", en: "Dongdaemun-gu" },
    "동작구": { ko: "동작구", en: "Dongjak-gu" },
    "마포구": { ko: "마포구", en: "Mapo-gu" },
    "서대문구": { ko: "서대문구", en: "Seodaemun-gu" },
    "서초구": { ko: "서초구", en: "Seocho-gu" },
    "성동구": { ko: "성동구", en: "Seongdong-gu" },
    "성북구": { ko: "성북구", en: "Seongbuk-gu" },
    "송파구": { ko: "송파구", en: "Songpa-gu" },
    "양천구": { ko: "양천구", en: "Yangcheon-gu" },
    "영등포구": { ko: "영등포구", en: "Yeongdeungpo-gu" },
    "용산구": { ko: "용산구", en: "Yongsan-gu" },
    "은평구": { ko: "은평구", en: "Eunpyeong-gu" },
    "종로구": { ko: "종로구", en: "Jongno-gu" },
    "중구": { ko: "중구", en: "Jung-gu" },
    "중랑구": { ko: "중랑구", en: "Jungnang-gu" },
  },

  // Comprehensive dong translations imported from separate file
  dongs: dongTranslations,

  // 15 Business Types from businessHierarchy.ts
  businessTypes: {
    "레저/문화용품": { ko: "레저/문화용품", en: "Leisure/Cultural Goods" },
    "마트/생활잡화": { ko: "마트/생활잡화", en: "Mart/Daily Necessities" },
    "백화점": { ko: "백화점", en: "Department Store" },
    "병원": { ko: "병원", en: "Hospital" },
    "숙박": { ko: "숙박", en: "Accommodation" },
    "스포츠/헬스시설": { ko: "스포츠/헬스시설", en: "Sports/Fitness Facility" },
    "약국": { ko: "약국", en: "Pharmacy" },
    "여행": { ko: "여행", en: "Travel" },
    "오락/공연/서점": { ko: "오락/공연/서점", en: "Entertainment/Performance/Bookstore" },
    "음/식료품": { ko: "음/식료품", en: "Food/Groceries" },
    "일식/양식/중식": { ko: "일식/양식/중식", en: "Japanese/Western/Chinese Food" },
    "제과/커피/패스트푸드": { ko: "제과/커피/패스트푸드", en: "Bakery/Coffee/Fast Food" },
    "패션/잡화": { ko: "패션/잡화", en: "Fashion/Accessories" },
    "편의점": { ko: "편의점", en: "Convenience Store" },
    "한식": { ko: "한식", en: "Korean Food" },
  },

  // Controller-specific UI elements
  controller: {
    title: { ko: "Urban Heat, Urban Sales", en: "Urban Heat, Urban Sales" },
    exploreSeoul: { ko: "서울 탐색", en: "Explore Seoul" },
    viewAnalytics: { ko: "분석 보기", en: "View Analytics" },
    screenSaver: { ko: "화면 보호기", en: "Screen Saver" },
    contact: { ko: "연락처", en: "Contact" },
    back: { ko: "뒤로", en: "Back" },
    resetDemo: { ko: "데모 초기화", en: "Reset Demo" },
    wsConnected: { ko: "연결됨", en: "connected" },
    wsDisconnected: { ko: "연결 끊김", en: "disconnected" },
    statusExplored: { ko: "탐색 완료", en: "explored" },
    statusReady: { ko: "탐색 준비", en: "ready to explore" },
    clickToExplore: { ko: "클릭하여 서울의 도시 열과 매출 데이터를 탐색하세요", en: "Click to explore Seoul's urban heat and sales data" },
    clickDistrictTip: { ko: "5×5 그리드에서 구를 클릭하여 동을 보고, 특정 지역을 선택하여 분석하세요", en: "Click on any district in the 5×5 grid to see neighborhoods, then select a specific area for analysis" },
  },

  // Panel titles
  panels: {
    researchDashboard: { ko: "연구 대시보드", en: "Research Dashboard" },
    edaTitle: { ko: "EDA – 구역 선택", en: "EDA – District Selection" },
    cardSalesTitle: { ko: "카드 매출 시각화", en: "Card Sales Visualization" },
    aiPredictionTitle: { ko: "AI 예측", en: "AI Prediction" },
    localEconomyTitle: { ko: "지역 경제", en: "Local Economy" },
    visualsOfData: { ko: "데이터 시각화", en: "Visuals of Data" },
    soundOfData: { ko: "데이터의 소리", en: "Sound of Data" },
    audioPermission: { ko: "오디오 권한", en: "Audio Permission" },
    audioPermissionDesc: { ko: "비디오가 음소거로 재생 중입니다. 소리를 활성화하려면 Sound를 선택하거나, 음소거로 계속 시청하세요.", en: "Video is now playing muted. Choose Sound to enable audio with your permission, or continue watching muted." },
    sound: { ko: "소리", en: "Sound" },
    muted: { ko: "음소거", en: "Muted" },
    wait: { ko: "대기...", en: "Wait..." },
    pauseAvailable: { ko: "5초 후 일시정지 가능...", en: "Pause available in 5 seconds..." },
    pauseDaily: { ko: "일별 애니메이션 일시정지", en: "Pause the daily animation on display" },
    resumeDaily: { ko: "일별 애니메이션 재개", en: "Resume the daily animation on display" },
    navigateDaily: { ko: "디스플레이로 이동하여 일별 애니메이션 시작", en: "Navigate display and start daily animation" },
    pauseVideo: { ko: "비디오 재생 일시정지", en: "Pause video playback" },
    resumeVideo: { ko: "비디오 재생 재개", en: "Resume video playback" },
    navigateVideo: { ko: "전용 사운드 경험 페이지로 이동", en: "Navigate to dedicated sound experience page" },
    // AI Prediction Panel
    impactOfTemp: { ko: "온도가 매출에 미치는 영향", en: "Impact of Temperature on Sales" },
    howTempAffects: { ko: "온도 상승이 매출에 어떤 영향을 미칠까요?", en: "How do increasing temperatures affect sales?" },
    tempScenarios: { ko: "온도 시나리오", en: "Temperature Scenarios" },
    animationTip: { ko: "31일 애니메이션이 자동으로 실행됩니다 • 시나리오를 선택하여 열 영향을 확인하세요", en: "31-day animation runs automatically • Select scenario to see heat impact" },
  },

  // Chart labels
  charts: {
    dailySales: { ko: "일별 매출", en: "Daily Sales" },
    monthlySales: { ko: "월별 매출", en: "Monthly Sales" },
    averageSales: { ko: "평균 매출", en: "Average Sales" },
    totalSales: { ko: "총 매출", en: "Total Sales" },
    salesAmount: { ko: "매출액", en: "Sales Amount" },
    date: { ko: "날짜", en: "Date" },
    month: { ko: "월", en: "Month" },
    year: { ko: "년", en: "Year" },
  },

  // Map controls
  mapControls: {
    zoomIn: { ko: "확대", en: "Zoom In" },
    zoomOut: { ko: "축소", en: "Zoom Out" },
    reset: { ko: "초기화", en: "Reset" },
    toggle3D: { ko: "3D 전환", en: "Toggle 3D" },
    showLabels: { ko: "라벨 표시", en: "Show Labels" },
  },

  // Common UI elements
  common: {
    loading: { ko: "로딩 중...", en: "Loading..." },
    error: { ko: "오류", en: "Error" },
    retry: { ko: "다시 시도", en: "Retry" },
    close: { ko: "닫기", en: "Close" },
    open: { ko: "열기", en: "Open" },
    save: { ko: "저장", en: "Save" },
    cancel: { ko: "취소", en: "Cancel" },
    confirm: { ko: "확인", en: "Confirm" },
    search: { ko: "검색", en: "Search" },
    filter: { ko: "필터", en: "Filter" },
    all: { ko: "전체", en: "All" },
    none: { ko: "없음", en: "None" },
    select: { ko: "선택", en: "Select" },
    play: { ko: "재생", en: "Play" },
    pause: { ko: "일시정지", en: "Pause" },
    stop: { ko: "중지", en: "Stop" },
    mute: { ko: "음소거", en: "Mute" },
    unmute: { ko: "음소거 해제", en: "Unmute" },
  },

  // Months
  months: {
    january: { ko: "1월", en: "January" },
    february: { ko: "2월", en: "February" },
    march: { ko: "3월", en: "March" },
    april: { ko: "4월", en: "April" },
    may: { ko: "5월", en: "May" },
    june: { ko: "6월", en: "June" },
    july: { ko: "7월", en: "July" },
    august: { ko: "8월", en: "August" },
    september: { ko: "9월", en: "September" },
    october: { ko: "10월", en: "October" },
    november: { ko: "11월", en: "November" },
    december: { ko: "12월", en: "December" },
  },

  // Currency
  currency: {
    won: { ko: "원", en: "KRW" },
    millionWon: { ko: "백만원", en: "Million KRW" },
    billionWon: { ko: "억원", en: "Billion KRW" },
  },

  // Status messages
  status: {
    connected: { ko: "연결됨", en: "Connected" },
    disconnected: { ko: "연결 끊김", en: "Disconnected" },
    connecting: { ko: "연결 중...", en: "Connecting..." },
    ready: { ko: "준비", en: "Ready" },
    processing: { ko: "처리 중...", en: "Processing..." },
    complete: { ko: "완료", en: "Complete" },
  },

  // Research section
  research: {
    eda: { ko: "탐색적 데이터 분석", en: "Exploratory Data Analysis" },
    localEconomy: { ko: "지역 경제", en: "Local Economy" },
    prediction: { ko: "예측", en: "Prediction" },
    visualization: { ko: "시각화", en: "Visualization" },
    dataPortal: { ko: "데이터 포털", en: "Data Portal" },
  },

  // Research Modal
  researchModal: {
    selectOption: { ko: "다음 중 하나를 선택하세요", en: "Select one of the following options" },
    visualsAndSound: { ko: "데이터의 시각과 소리", en: "Visuals and Sound of Data" },
    tempImpact: { ko: "온도가 매출에 미치는 영향", en: "Impact of Temperature on Sales" },
    zoomingLocal: { ko: "지역 매출 확대", en: "Zooming into Local Sales" },
  },

  // EDA Panel
  edaPanel: {
    selectDistrict: { ko: "서울특별시 자치구 선택", en: "Select Seoul District" },
    mapLoading: { ko: "지도를 로드하는 중입니다... 잠시만 기다려주세요.", en: "Loading map... Please wait." },
    selectedGu: { ko: "선택된 구", en: "Selected District" },
    selectedDong: { ko: "선택된 동", en: "Selected Neighborhood" },
    selectNeighborhood: { ko: "행정동 선택", en: "Select Neighborhood" },
  },

  // Team/Contact
  team: {
    researchTeam: { ko: "연구팀", en: "Research Team" },
    name: { ko: "이름", en: "Name" },
    role: { ko: "역할/기여", en: "Role/Contribution" },
    email: { ko: "이메일", en: "Email" },
    institution: { ko: "기관", en: "Institution" },
    kaistAI: { ko: "KAIST AI 연구소", en: "KAIST AI Institute" },
    projectTitle: { ko: "도시 열, 도시 매출 연구 프로젝트", en: "Urban Heat, Urban Sales Research Project" },
    supervision: { ko: "감독", en: "Supervision" },
    modeling: { ko: "예측 AI 모델링, 대화형 도구 구현, 음향 작업", en: "Predictive AI Modeling, Interactive Tool Implementation, Acoustic Work" },
    dataAnalysis: { ko: "탐색적 데이터 분석", en: "Exploratory Data Analysis" },
    dataCollection: { ko: "데이터 수집", en: "Data Collection" },
  },

  // Hero/Landing page
  hero: {
    seoul: { ko: "서울", en: "SEOUL" },
    urbanAI: { ko: "도시 AI", en: "URBAN AI" },
    useController: { ko: "컨트롤러를 사용하여 탐색", en: "Use Controller to Navigate" },
    transitioning: { ko: "전환 중...", en: "TRANSITIONING..." },
    controlledRemotely: { ko: "원격 제어 중", en: "Controlled Remotely" },
  },

  // Video experience page
  video: {
    preparing: { ko: "비디오 경험 준비 중...", en: "Preparing video experience..." },
    clickToEnableAudio: { ko: "오디오 활성화하려면 클릭", en: "Click to Enable Audio" },
    videoPlaying: { ko: "🎬 비디오 재생 중 - 중지하려면 컨트롤러 사용", en: "🎬 Video playing - Use controller to stop" },
    videoReady: { ko: "⏹️ 비디오 준비 완료 - 재생하려면 컨트롤러 사용", en: "⏹️ Video ready - Use controller to play" },
    seoulSAIF: { ko: "서울 SAIF 시각화", en: "Seoul SAIF Visualization" },
    cardSalesExperience: { ko: "카드 매출 데이터 경험", en: "Card Sales Data Experience" },
  },

  // Loading messages
  loading: {
    loadingResearch: { ko: "연구 로딩 중...", en: "Loading research..." },
    loadingMapVisualization: { ko: "지도 시각화 로딩 중...", en: "Loading map visualization..." },
    loadingAIPrediction: { ko: "AI 예측 시뮬레이션 로딩 중...", en: "Loading AI prediction simulation..." },
  },

  // Navigation and controls
  navigation: {
    back: { ko: "뒤로", en: "Back" },
    backToSelection: { ko: "선택 화면으로 돌아가기", en: "Back to Selection" },
    cardSalesControls: { ko: "카드 매출 제어", en: "Card Sales Controls" },
    edaControls: { ko: "EDA 제어", en: "EDA Controls" },
    displayNavigated: { ko: "디스플레이가 EDA 페이지로 이동했습니다", en: "Display has been navigated to EDA page" },
  },
}

// Helper function to get translation by nested key path
export function getTranslation(path: string, language: 'ko' | 'en'): string {
  const keys = path.split('.')
  let current: any = translations

  for (const key of keys) {
    current = current?.[key]
    if (!current) return path // Return original path if not found
  }

  return current[language] || current.ko || path
}