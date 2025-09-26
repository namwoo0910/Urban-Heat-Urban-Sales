// src/shared/ws/ctrlActions.ts
/** 컨트롤러에서 디스플레이로 송출하는 액션 문자열 유틸 */

// src/shared/ws/ctrlActions.ts
export const actions = {
  navigate: (path: string) => `display:navigate:${path}`,
  video: {
    play: () => "display:video:play",
    pause: () => "display:video:pause",
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
  },
  /** 인트로 애니메이션 트리거(디스플레이) */
  intro: {
    /** 홈(히어로)로 이동하며 인트로 재생 플래그 전달 */
    play: () => `display:navigate:/display?playIntro=1`,
  },
} as const;

export type WsSend = (action: string) => void;

