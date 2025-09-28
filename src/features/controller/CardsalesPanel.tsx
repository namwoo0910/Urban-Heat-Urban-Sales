// src/features/controller/CardsalesPanel.tsx
"use client";

import { useState, useEffect } from "react";
import { actions, WsSend } from "@/src/shared/ws/ctrlActions";
import { cn } from "@/src/shared/utils/cn";

export default function CardsalesPanel({
  wsStatus,
  sendAction,
}: {
  wsStatus?: "idle" | "connecting" | "open" | "closing" | "closed";
  sendAction: WsSend;
}) {
  const disabled = wsStatus !== "open";
  const [animationStatus, setAnimationStatus] = useState<'stopped' | 'playing' | 'paused'>('stopped');
  const [videoStatus, setVideoStatus] = useState<'stopped' | 'playing' | 'paused' | 'error'>('stopped');
  const [showAudioDialog, setShowAudioDialog] = useState(false);
  const [canPauseVideo, setCanPauseVideo] = useState(false);
  const [canPauseAnimation, setCanPauseAnimation] = useState(false);

  const onShowViz = () => {
    if (disabled) return;

    if (animationStatus === 'playing') {
      // Only allow pause if 5 seconds have passed
      if (!canPauseAnimation) {
        console.log('[Controller] Animation pause blocked - waiting for initialization to complete (10s)');
        return;
      }
      // If currently playing, pause the animation
      sendAction(actions.animation.toggleDaily());
      setAnimationStatus('paused');
      setCanPauseAnimation(false); // Reset pause availability
    } else if (animationStatus === 'paused') {
      // If paused, resume the animation
      sendAction(actions.animation.toggleDaily());
      setAnimationStatus('playing');
      // Set 5-second timer before allowing pause again
      setTimeout(() => {
        setCanPauseAnimation(true);
        console.log('[Controller] Animation pause button now available after resume');
      }, 5000);
    } else {
      // If stopped, start fresh
      sendAction(actions.navigate("/research/local-economy"));
      setTimeout(() => {
        sendAction(actions.animation.toggleDaily());
        setAnimationStatus('playing');

        // Enable pause after 5 seconds
        setTimeout(() => {
          setCanPauseAnimation(true);
          console.log('[Controller] Animation pause button now available after 5 seconds');
        }, 5000);
      }, 300);
    }
  };

  const onToggleVideo = () => {
    if (disabled) return;

    if (videoStatus === 'playing') {
      // Only allow pause if 5 seconds have passed
      if (!canPauseVideo) {
        console.log('[Controller] Pause blocked - waiting for initialization to complete (5s)');
        return;
      }
      // If currently playing, pause the video (stay on current page)
      sendAction(actions.video.pause());
      setVideoStatus('paused');
      setCanPauseVideo(false); // Reset pause availability
    } else if (videoStatus === 'paused') {
      // If paused, resume playback without resetting src
      sendAction(actions.video.play()); // Resume without src parameter
      setVideoStatus('playing');
      // Set 5-second timer before allowing pause again
      setTimeout(() => {
        setCanPauseVideo(true);
        console.log('[Controller] Pause button now available after resume');
      }, 5000);
    } else {
      // If stopped, start video muted and show sound popup
      sendAction(actions.navigate("/video-experience"));

      setTimeout(() => {
        sendAction(actions.video.playSrc("/0923.mp4"));
        setVideoStatus('playing');

        // Show audio dialog with user gesture
        setShowAudioDialog(true);

        // Enable pause after 5 seconds
        setTimeout(() => {
          setCanPauseVideo(true);
          console.log('[Controller] Pause button now available after 5 seconds');
        }, 5000);
      }, 1200);
    }
  };

  const handleAudioPermission = (option: 'cancel' | 'muted' | 'sound') => {
    console.log('🎛️ [CONTROLLER] Audio permission:', option);
    setShowAudioDialog(false);

    if (option === 'sound') {
      // Video is already playing muted, just unmute it
      console.log('🎛️ [CONTROLLER] Sending unmute command...');
      sendAction(actions.video.muteOff());
      console.log('🎛️ [CONTROLLER] Unmute command sent');
    }
    // If 'muted' or 'cancel', do nothing - video continues muted
  };

  // Listen for video status events from display
  useEffect(() => {
    const handleVideoStatus = (event: Event) => {
      const eventType = event.type;
      switch (eventType) {
        case 'video:status:playing':
          setVideoStatus('playing');
          break;
        case 'video:status:paused':
          setVideoStatus('paused');
          break;
        case 'video:status:stopped':
          setVideoStatus('stopped');
          setCanPauseVideo(false); // Reset pause availability
          break;
        case 'video:status:error':
          setVideoStatus('error');
          setCanPauseVideo(false); // Reset pause availability
          break;
      }
    };

    const handleAnimationStatus = (event: Event) => {
      const eventType = event.type;
      if (eventType === 'animation:status:stopped') {
        setAnimationStatus('stopped');
        setCanPauseAnimation(false); // Reset pause availability
      }
    };

    window.addEventListener('video:status:playing', handleVideoStatus);
    window.addEventListener('video:status:paused', handleVideoStatus);
    window.addEventListener('video:status:stopped', handleVideoStatus);
    window.addEventListener('video:status:error', handleVideoStatus);
    window.addEventListener('animation:status:stopped', handleAnimationStatus);

    return () => {
      window.removeEventListener('video:status:playing', handleVideoStatus);
      window.removeEventListener('video:status:paused', handleVideoStatus);
      window.removeEventListener('video:status:stopped', handleVideoStatus);
      window.removeEventListener('video:status:error', handleVideoStatus);
      window.removeEventListener('animation:status:stopped', handleAnimationStatus);
    };
  }, []);



  return (
    <section className="space-y-8">
      {/* Card Sales Visualization */}
      <div className="group relative rounded-3xl border border-purple-500/30 bg-gradient-to-br from-slate-800/60 to-purple-900/40 p-8 backdrop-blur-xl shadow-2xl hover:shadow-purple-500/20 transition-all duration-500">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative z-10">
          <h3 className="text-4xl font-bold mb-4 text-white flex items-center gap-3">
            <span>🖼️</span>
            <span>Visuals of Data</span>
          </h3>
          <button
            disabled={disabled || (animationStatus === 'playing' && !canPauseAnimation)}
            className={cn(
              "w-full py-5 px-8 rounded-2xl bg-gradient-to-r from-purple-600 via-cyan-600 to-purple-700 text-white font-bold text-lg shadow-xl transform transition-all duration-300 hover:scale-105 hover:shadow-purple-500/30 border border-white/10",
              (disabled || (animationStatus === 'playing' && !canPauseAnimation)) && "pointer-events-none opacity-50 grayscale"
            )}
            onClick={onShowViz}
          >
            <span className="text-3xl flex items-center justify-center gap-3">
              <span>
                {animationStatus === 'playing' ? (canPauseAnimation ? '⏸️' : '⏸️') :
                 animationStatus === 'paused' ? '▶️' : '▶️'}
                {animationStatus === 'playing' ? (canPauseAnimation ? 'Pause' : 'Wait...') :
                 animationStatus === 'paused' ? 'Resume' : 'Play'}
              </span>
              <div className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                animationStatus === 'playing' ? "bg-red-400 animate-pulse" :
                animationStatus === 'paused' ? "bg-yellow-400 animate-pulse" :
                "bg-white animate-ping"
              )}></div>
            </span>
          </button>
          <div className="text-sm text-purple-200/80 mt-3 text-center">
            {animationStatus === 'playing'
              ? (canPauseAnimation ? "Pause the daily animation on display" : "Pause available in 5 seconds...")
              : animationStatus === 'paused'
              ? "Resume the daily animation on display"
              : "Navigate display and start daily animation"}
          </div>
        </div>
      </div>

      {/* Experience Card Sales */}
      <div className="group relative rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-slate-800/60 to-cyan-900/40 p-8 backdrop-blur-xl shadow-2xl hover:shadow-cyan-500/20 transition-all duration-500">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative z-10">
          <h3 className="text-4xl font-bold mb-4 text-white flex items-center gap-3">
            <span>🎧</span>
            <span>Sound of Data</span>
          </h3>

          {/* Video Toggle Control */}
          <div className="mb-6">
            <button
              disabled={disabled || (videoStatus === 'playing' && !canPauseVideo)}
              className={cn(
                "w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-600 to-purple-600 text-white font-bold shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-cyan-500/30",
                (disabled || (videoStatus === 'playing' && !canPauseVideo)) && "opacity-50 grayscale cursor-not-allowed"
              )}
              onClick={() => {
                if (disabled) return;
                onToggleVideo();
              }}
            >
              <span className="text-3xl flex items-center justify-center gap-3">
                <span>
                  {videoStatus === 'playing' ? (canPauseVideo ? '⏸️' : '⏸️') :
                   videoStatus === 'paused' ? '▶️' : '▶️'}
                  {videoStatus === 'playing' ? (canPauseVideo ? 'Pause' : 'Wait...') :
                   videoStatus === 'paused' ? 'Resume' : 'Play'} 
                </span>
                <div className={cn(
                  "w-2 h-2 rounded-full transition-all duration-300",
                  videoStatus === 'playing' ? "bg-red-400 animate-pulse" :
                  videoStatus === 'paused' ? "bg-yellow-400 animate-pulse" :
                  "bg-white animate-ping"
                )}></div>
              </span>
            </button>

            {/* Video Status Description */}
            <div className="text-sm text-cyan-200/80 mt-3 text-center">
              {videoStatus === 'playing'
                ? (canPauseVideo ? "Pause video playback" : "Pause available in 5 seconds...")
                : videoStatus === 'paused'
                ? "Resume video playback"
                : "Navigate to dedicated sound experience page"}
            </div>
          </div>

        </div>
      </div>

      {/* Audio Permission Dialog */}
      {showAudioDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 border border-cyan-500/30 shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span>🔊</span>
              <span>Audio Permission</span>
            </h3>
            <p className="text-slate-300 mb-6">
              Video is now playing muted. Choose Sound to enable audio with your permission, or continue watching muted.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleAudioPermission('sound')}
                className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold hover:from-green-500 hover:to-emerald-500 transition-colors flex items-center justify-center gap-2"
              >
                🔊 Sound
              </button>
              <button
                onClick={() => handleAudioPermission('muted')}
                className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-medium hover:from-blue-500 hover:to-cyan-500 transition-colors flex items-center justify-center gap-2"
              >
                🔇 Muted
              </button>
              <button
                onClick={() => handleAudioPermission('cancel')}
                className="w-full py-3 px-4 rounded-xl bg-slate-700 text-slate-300 font-medium hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
