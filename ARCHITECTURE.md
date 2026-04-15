# Exhibition Architecture: iPad Controller & Large Display System

> **Seoul City Data Visualization Project** - Interactive exhibition system with iPad remote control and large display visualization

## Table of Contents

- [System Overview](#system-overview)
- [Architecture Diagrams](#architecture-diagrams)
- [Control Panel Components (iPad)](#control-panel-components-ipad)
- [Display Components (Large Screen)](#display-components-large-screen)
- [Communication Mechanism](#communication-mechanism)
- [Screen Saver Functionality](#screen-saver-functionality)
- [Mute/Unmute Features](#muteunmute-features)
- [Control Actions Implementation](#control-actions-implementation)
- [Data Flow Examples](#data-flow-examples)
- [Key Files Reference](#key-files-reference)
- [Initialization Sequence](#initialization-sequence)
- [Error Handling & Resilience](#error-handling--resilience)

---

## System Overview

The project implements a **two-device exhibition system**:

- **iPad (Controller)**: Remote control interface at `/controller`
- **Large Display (Exhibition Screen)**: Main visualization at `/display`
- **WebSocket Server**: Real-time communication bridge (port 3003)

**Key Principle**: One-way command flow from Controller → Display (Controller is state owner)

---

## Architecture Diagrams

### Overall System Architecture

```
┌─────────────────────────────────────────┐
│         iPad (컨트롤러)                   │
│      http://[IP]:3000/controller        │
├─────────────────────────────────────────┤
│  📱 메인 대시보드                         │
│  ├─ "Explore Seoul" 버튼                │
│  ├─ "Screen Saver" 버튼                 │
│  ├─ 연구 대시보드 모달                    │
│  │   ├─ Card Sales Panel              │
│  │   ├─ AI Prediction Panel           │
│  │   └─ EDA District Selector         │
│  └─ Contact Info 모달                   │
└─────────────────┬───────────────────────┘
                  │
          WebSocket (ws://[IP]:3003)
          Room: 'main'
                  │
┌─────────────────┴───────────────────────┐
│      대형 디스플레이 (전시 화면)            │
│       http://[IP]:3000/display         │
├─────────────────────────────────────────┤
│  🖥️ 시각화 화면                          │
│  ├─ 스크린세이버 (비디오 오버레이)          │
│  ├─ Hero Section (파티클 애니메이션)      │
│  ├─ /video-experience (비디오 페이지)    │
│  ├─ /research/local-economy (카드매출)   │
│  └─ /research/prediction (AI 예측)      │
└─────────────────────────────────────────┘
```

### Communication Flow Diagram

```
iPad (Controller)
    ↓
useWS Hook sends Action
    ↓
WebSocket Server (room='main')
    ↓
Display receives via useWS
    ↓
DisplayBridgeClient handles commands
    ↓
Custom window.dispatchEvent() or router.replace()
    ↓
Target Component executes action
    ↓
[Optional] Emit status event back to Controller
```

### Component Hierarchy

```
┌──────────────────────────────────────────────────────────────┐
│                     iPad Controller                          │
├──────────────────────────────────────────────────────────────┤
│  app/controller/page.tsx                                     │
│  ├─ Main Control UI                                          │
│  │  ├─ "Explore Seoul" (hero:explore event)                 │
│  │  ├─ "Screen Saver" (display:navigate:/)                  │
│  │  └─ Research Dashboard Modal                             │
│  │     ├─ CardsalesPanel.tsx                                │
│  │     │  ├─ "Visuals of Data" (animation play/pause)       │
│  │     │  ├─ "Sound of Data" (video play/pause)             │
│  │     │  └─ Audio Permission Dialog (unmute)               │
│  │     ├─ AIPredictionPanel.tsx                             │
│  │     │  ├─ "Impact of Temperature" (AI animation)         │
│  │     │  └─ Temperature Scenario Buttons (+5°C ~ +20°C)    │
│  │     └─ DistrictGridSelector                              │
│  │        └─ District/Neighborhood Selection (EDA viz)      │
│  └─ useWS('controller', 'main') → sendAction()              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    Large Display                             │
├──────────────────────────────────────────────────────────────┤
│  app/display/page.tsx                                        │
│  ├─ Hero (Particle Animation)                                │
│  ├─ DisplayBridgeClient.tsx                                  │
│  │  └─ onAction() Handler                                    │
│  │     ├─ display:navigate:* → router.replace()             │
│  │     ├─ display:video:play: → Video playback              │
│  │     ├─ display:video:mute:* → Mute control               │
│  │     ├─ display:ai:* → AI animation control               │
│  │     └─ explore → window.dispatchEvent('hero:explore')    │
│  └─ useWS('display', 'main') → onAction callback            │
│                                                               │
│  src/features/home/components/HomePage.tsx                   │
│  ├─ useScreenSaver()                                         │
│  │  ├─ isScreenSaverActive                                  │
│  │  ├─ enableScreenSaver()                                  │
│  │  └─ disableScreenSaver()                                 │
│  ├─ VideoScreenSaver (conditional render)                   │
│  │  └─ /SLW_Final3.0.mp4 (fullscreen loop)                  │
│  └─ HeroSection (conditional render)                        │
└──────────────────────────────────────────────────────────────┘
```

---

## Control Panel Components (iPad)

### Main Controller Page
- **File**: `app/controller/page.tsx`
- **Role**: Master control interface
- **Features**:
  - "Explore Seoul" button → initiates visualization
  - "Screen Saver" button → returns display to home
  - Research dashboard modal with 3 sub-panels
  - Contact information modal with team credits

### CardsalesPanel Component
- **File**: `src/features/controller/CardsalesPanel.tsx`
- **Controls**:
  - "Visuals of Data" (Play/Pause animation) - Purple themed
  - "Sound of Data" (Play/Pause video) - Cyan themed
  - Audio permission dialog (Sound/Muted options)
- **State Management**:
  - `animationStatus`: 'stopped' | 'playing' | 'paused'
  - `videoStatus`: 'stopped' | 'playing' | 'paused' | 'error'
  - 5-second initialization delay before pause allowed
  - Listens for display status events: `video:status:*` and `animation:status:*`

### AIPredictionPanel Component
- **File**: `src/features/controller/AIPredictionPanel.tsx`
- **Controls**:
  - "Impact of Temperature on Sales" (Play/Pause animation)
  - Temperature scenario buttons (+5°C, +10°C, +15°C, +20°C)
- **State Management**:
  - `predictionStatus`: 'stopped' | 'playing' | 'paused'
  - Same 5-second initialization delay
  - Sends temperature scenario to display

### DistrictGridSelector
- **File**: `src/features/eda/components/DistrictGridSelector`
- **Purpose**: EDA district/neighborhood selection
- **Integration**: Triggers district selection on display via WebSocket

---

## Display Components (Large Screen)

### Display Page (Main Entry)
- **File**: `app/display/page.tsx`
- **Renders**: `Hero` component
- **Role**: Passive receiver of WebSocket commands
- **Action Handlers**:
  - `display:navigate:*` → Router navigation
  - `display:video:play:` → Video playback commands
  - `display:video:pause` → Video pause
  - `display:ai:predict` → AI prediction trigger

### Hero Section
- **File**: `src/features/home/components/HeroSection.tsx`
- **Features**:
  - Particle animation (circular mode → transitioning → map mode)
  - GSAP-based animations
  - Dynamic display modes controlled by display bridge
  - Center text in circular mode, top text after map forms
- **Interaction**: Listens to `hero:explore` custom event from controller

### HomePage Wrapper
- **File**: `src/features/home/components/HomePage.tsx`
- **Integrates**:
  - `VideoScreenSaver` component
  - `useScreenSaver` hook
  - WebSocket connection for screen saver control

### VideoScreenSaver Component
- **File**: `src/features/home/components/VideoScreenSaver.tsx`
- **Features**:
  - Fullscreen video overlay (`/SLW_Final3.0.mp4`)
  - Auto-loops when active
  - Shows instruction text at bottom
  - Clickable to disable

---

## Communication Mechanism

### WebSocket Server
- **File**: `server/ws-server.ts`
- **Port**: 3003 (default)
- **Features**:
  - Room-based broadcasting
  - Heartbeat/keepalive (30s ping)
  - Automatic reconnection with exponential backoff
  - Message queuing for pre-connection buffering

### useWS Hook
- **File**: `src/shared/hooks/useWS.ts`
- **Roles**: 'controller' or 'display'
- **Methods**:
  - `sendAction(action: string)`: Send command to peer
  - Automatic reconnection with exponential backoff
  - Message queue for offline buffering
  - Status tracking: 'idle' → 'connecting' → 'open' → 'closed'

### Action String Format

Commands follow prefix-based pattern:

| Category | Action | Description |
|----------|--------|-------------|
| **Navigation** | `display:navigate:/path` | Navigate display to route |
| **Video** | `display:video:play:[src]` | Play video |
|  | `display:video:pause` | Pause video |
|  | `display:video:mute:on` | Mute video |
|  | `display:video:mute:off` | Unmute video |
| **AI Prediction** | `display:ai:predict` | Trigger AI prediction |
|  | `display:ai:start-animation:31days` | Start 31-day animation |
|  | `display:ai:pause-animation` | Pause animation |
|  | `display:ai:set-temp-scenario:t050` | Set temperature scenario |
| **EDA** | `display:eda:select:district:CODE:NAME` | Select district (구) |
|  | `display:eda:select:neighborhood:CODE:NAME` | Select neighborhood (동) |
| **System** | `explore` | Disable screen saver + Hero animation |
|  | `display:enableScreenSaver` | Enable screen saver |
|  | `display:reset:all` | Reset all state |

### Control Actions Utility
- **File**: `src/shared/ws/ctrlActions.ts`
- **Purpose**: Type-safe action builder
- **Categories**:
  - `actions.navigate(path)`
  - `actions.video.*` (play, pause, muteOn, muteOff, playSrc)
  - `actions.ai.*` (startAnimation, pauseAnimation, resumeAnimation)
  - `actions.animation.toggleDaily()`
  - `actions.reset.*`

---

## Screen Saver Functionality

### useScreenSaver Hook
- **File**: `src/shared/hooks/useScreenSaver.ts`
- **State**: `isScreenSaverActive: boolean`
- **Methods**:
  - `disableScreenSaver()`: Hide video, show hero
  - `enableScreenSaver()`: Show video overlay
- **Optional**: Auto-enable after N minutes of inactivity

### Screen Saver Activation Flow

```
Display starts at /display
    ↓
HomePage renders → isScreenSaverActive = true (default)
    ↓
VideoScreenSaver shows fullscreen video
    ↓
Display remains at /display (no route change)

When Controller clicks "Screen Saver":
    ↓
sendAction('display:navigate:/')
    ↓
DisplayBridgeClient receives command
    ↓
router.replace('/') → returns to /display
    ↓
Enables screen saver via WebSocket
```

### Screen Saver Disabling

Two triggers:
1. Controller clicks "Explore Seoul" → `sendAction('explore')`
2. User clicks video → `onVideoClick={disableScreenSaver}`

Displays hero animation instead of video.

---

## Mute/Unmute Features

### Audio Control Architecture

**Video Mute State**
- **Initial State**: Video always starts **muted** (browser autoplay policy)
- **Reason**: Autoplay with audio requires user gesture

### Audio Permission Dialog
```
CardsalesPanel renders dialog after video starts:
├── "🔊 Sound" button → unmute video
├── "🔇 Muted" button → keep muted
└── "Cancel" button → close dialog
```

### Unmute Process
*(DisplayBridgeClient.tsx lines 510-562)*

```
1. Dialog: User clicks "Sound"
2. Controller: sendAction(actions.video.muteOff())
3. Display: Receives 'display:video:mute:off'
4. Bridge: v.muted = false; v.volume = 1
5. Recovery: If video paused after unmute, attempt resume
```

### Error Handling
- If unmute triggers pause (autoplay policy), automatically resume
- Shows video controls if unmute fails
- Emits `video:status:*` events back to controller

---

## Control Actions Implementation

### Action Types
- Type-safe string builders
- Standardized prefixes for routing
- Composable payloads

### Event-Based Status Updates

Custom events for controller ↔ display communication:

```typescript
// From Display → Controller
window.dispatchEvent(new CustomEvent('video:status:playing'))
window.dispatchEvent(new CustomEvent('video:status:paused'))
window.dispatchEvent(new CustomEvent('animation:status:stopped'))

// From Controller → Display (via WebSocket)
actions.video.muteOff() → 'display:video:mute:off'
actions.ai.pauseAnimation() → 'display:ai:pause-animation'
```

### State Synchronization Strategy
- **One-way flow**: Controller owns state, Display executes commands
- **No auto-sync**: Display doesn't send state to controller
- **Status feedback**: Display emits events for controller UI updates

---

## Data Flow Examples

### Screen Saver Control Flow

```
[Initial State] Display → VideoScreenSaver active (video loop playing)
                    ↓
iPad "Explore Seoul" click
                    ↓
sendAction('explore')
                    ↓
WebSocket → Display
                    ↓
window.dispatchEvent('hero:explore')
                    ↓
HeroSection: Particles scatter from circle → Seoul map
displayMode: 'circular' → 'transitioning' → 'map'
```

### Video Unmute Flow

```
Display: Video autoplay (muted=true, browser policy)
                    ↓
iPad: Audio permission dialog appears
User clicks "🔊 Sound"
                    ↓
sendAction('display:video:mute:off')
                    ↓
Display: video.muted = false, volume = 1
                    ↓
[Recovery Logic] If paused, automatically resume
                    ↓
emit('video:status:playing') → iPad status sync
```

### AI Prediction Animation Flow

```
iPad: Select temperature scenario (+5°C ~ +20°C)
                    ↓
sendAction('display:ai:set-temp-scenario:t050')
                    ↓
Display: Load scenario data
                    ↓
iPad: Click "Play" button
                    ↓
sendAction('display:ai:start-animation:31days')
                    ↓
Display: Play 31-day sales change animation
                    ↓
emit('animation:status:playing')
```

---

## Key Files Reference

| Component | Path | Purpose |
|-----------|------|---------|
| **Controller Page** | `app/controller/page.tsx` | Main iPad interface |
| **Display Page** | `app/display/page.tsx` | Main display entry |
| **WS Bridge** | `app/DisplayBridgeClient.tsx` | Central command dispatcher |
| **WS Server** | `server/ws-server.ts` | Backend WebSocket hub |
| **WS Hook** | `src/shared/hooks/useWS.ts` | Client-side WS connection |
| **Action Builders** | `src/shared/ws/ctrlActions.ts` | Type-safe command creation |
| **Screen Saver Hook** | `src/shared/hooks/useScreenSaver.ts` | Screen saver state management |
| **Screen Saver Component** | `src/features/home/components/VideoScreenSaver.tsx` | Video overlay UI |
| **Home Page** | `src/features/home/components/HomePage.tsx` | Screen saver integration |
| **Hero Section** | `src/features/home/components/HeroSection.tsx` | Home visualization |
| **Card Sales Panel** | `src/features/controller/CardsalesPanel.tsx` | Video & animation controls |
| **AI Prediction Panel** | `src/features/controller/AIPredictionPanel.tsx` | Prediction animation controls |

### File Tree Structure

```
프로젝트 루트/
├─ server/
│  └─ ws-server.ts ⭐ WebSocket 서버 (포트 3003)
├─ app/
│  ├─ controller/page.tsx ⭐ iPad 메인 UI
│  ├─ display/page.tsx ⭐ 디스플레이 메인 UI
│  └─ DisplayBridgeClient.tsx ⭐ 명령 핸들러
├─ src/shared/
│  ├─ hooks/
│  │  ├─ useWS.ts ⭐ WebSocket 연결 훅
│  │  └─ useScreenSaver.ts ⭐ 스크린세이버 상태
│  └─ ws/
│     └─ ctrlActions.ts ⭐ 타입 안전 액션 빌더
└─ src/features/
   ├─ controller/
   │  ├─ CardsalesPanel.tsx ⭐ 비디오/애니메이션 제어
   │  └─ AIPredictionPanel.tsx ⭐ AI 예측 제어
   └─ home/components/
      ├─ HomePage.tsx ⭐ 스크린세이버 통합
      ├─ VideoScreenSaver.tsx ⭐ 비디오 오버레이
      └─ HeroSection.tsx ⭐ 파티클 애니메이션
```

---

## Initialization Sequence

```
User opens iPad (Controller):
1. Controller page loads
2. useWS() connects to ws://[host]:3003/ws
3. Sends { type: 'hello', role: 'controller', room: 'main' }
4. Sets status to 'open'
5. User can now send commands

User opens Large Screen (Display):
1. Display page loads
2. Layout mounts DisplayBridgeClient globally
3. DisplayBridgeClient useWS() connects
4. Sends { type: 'hello', role: 'display', room: 'main' }
5. Initializes video overlay DOM
6. Hero with screen saver renders
7. Listens for incoming actions

Controller clicks "Explore Seoul":
1. sendAction('explore')
2. Server broadcasts to display
3. DisplayBridgeClient receives 'explore'
4. Dispatches window event 'hero:explore'
5. Hero component animates particle scattering
6. displayMode: 'circular' → 'transitioning' → 'map'
```

---

## Error Handling & Resilience

### WebSocket Resilience
- Automatic reconnection with exponential backoff (max 15s)
- Message queuing when disconnected
- Heartbeat ping every 30 seconds (server)
- 15-second heartbeat on client side

### Video Playback Resilience
- Starts muted to ensure autoplay compliance
- Waits for readyState >= 2 before playback
- Recovery logic if unmute triggers pause
- Shows manual controls as fallback

### Screen Saver Reliability
- Always renders by default
- WebSocket actions can toggle state
- Click handlers provide manual override

---

## Security & Architecture Notes

### Strengths
- One-way command pattern prevents state conflicts
- Room-based isolation in WebSocket server
- Clear separation of concerns (UI, logic, communication)
- Fallback mechanisms for browser autoplay policies

### Considerations
- No authentication on WebSocket (assumes private network)
- All commands as plain strings (could be enhanced with validation)
- No persistent state on display (ephemeral)
- Relies on controller ownership for consistency

---

## Summary

This architecture enables a seamless exhibition experience where the iPad acts as a remote control for the large display, with robust communication, screen saver functionality, and audio control features. The system is designed for:

- **Reliability**: Auto-reconnection, message queuing, heartbeats
- **Simplicity**: String-based commands, one-way flow
- **Flexibility**: Room-based WebSocket, custom events
- **User Experience**: Smooth animations, audio control, screen saver

The design prioritizes exhibition use cases where a presenter controls a large visualization screen using an iPad, with minimal setup and maximum reliability.
