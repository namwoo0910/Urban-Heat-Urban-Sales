// src/shared/ws/ctrlActions.ts
/** 컨트롤러에서 디스플레이로 송출하는 액션 문자열 유틸 */

// src/shared/ws/ctrlActions.ts
export const actions = {
  navigate: (path: string) => `display:navigate:${path}`,
  video: {
    play: () => "display:video:play",
    pause: () => "display:video:pause",
    stop: () => "display:video:stop",
    muteOn: () => "display:video:mute:on",
    muteOff: () => "display:video:mute:off",
    close: () => "display:video:close",
    /** 비디오 오버레이에 소스 지정 후 재생 */
    playSrc: (src: string) => `display:video:play;src=${encodeURIComponent(src)}`,
  },
  ai: {
    toggle: (topic: string) => `display:ai:toggle-overlay;topic=${encodeURIComponent(topic)}`,
    /** 예측 delta(℃) 지정 */
    predict: (deltaC: number) => `display:ai:predict;delta=${deltaC}`,
    /** 31일 예측 애니메이션 시작 */
    startAnimation: () => `display:ai:start-animation:31days`,
    /** 예측 애니메이션 정지 */
    stopAnimation: () => `display:ai:stop-animation`,
  },
  /** 지역경제 애니메이션 컨트롤 */
  animation: {
    /** 일일 재생 토글 */
    toggleDaily: () => `display:animation:toggle-daily`,
  },
  /** 페이지 상태 신호 */
  page: {
    /** 비디오 페이지 준비 완료 */
    videoReady: () => `ctrl:video-page:ready`,
  },
  /** 인트로 애니메이션 트리거(디스플레이) */
  intro: {
    /** 홈(히어로)로 이동하며 인트로 재생 플래그 전달 */
    play: () => `display:navigate:/display?playIntro=1`,
  },
  /** 시스템 리셋 */
  reset: {
    /** 디스플레이를 초기 상태로 리셋 */
    display: () => `display:reset:all`,
    /** 전체 시스템 리셋 (컨트롤러 + 디스플레이) */
    all: () => `system:reset:all`,
  },
} as const;

export type WsSend = (action: string) => void;

