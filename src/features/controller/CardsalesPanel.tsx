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

  const onShowViz = () => {
    if (disabled) return;

    if (animationStatus === 'playing') {
      // If currently playing, pause the animation
      sendAction(actions.animation.toggleDaily());
      setAnimationStatus('paused');
    } else if (animationStatus === 'paused') {
      // If paused, resume the animation
      sendAction(actions.animation.toggleDaily());
      setAnimationStatus('playing');
    } else {
      // If stopped, start fresh
      sendAction(actions.navigate("/research/local-economy"));
      setTimeout(() => {
        sendAction(actions.animation.toggleDaily());
        setAnimationStatus('playing');
      }, 300);
    }
  };

  const onToggleVideo = () => {
    if (disabled) return;

    if (videoStatus === 'playing') {
      // If currently playing, pause the video (stay on current page)
      sendAction(actions.video.pause());
      setVideoStatus('paused');
    } else if (videoStatus === 'paused') {
      // If paused, resume playback without resetting src
      sendAction(actions.video.play()); // Resume without src parameter
      setVideoStatus('playing');
    } else {
      // If stopped, show audio dialog first
      setShowAudioDialog(true);
    }
  };

  const handleAudioPermission = (allowAudio: boolean) => {
    setShowAudioDialog(false);

    if (allowAudio) {
      // Navigate to video page and start playing with audio permission
      sendAction(actions.navigate("/video-experience"));

      // Start video playback after delay
      setTimeout(() => {
        sendAction(actions.video.playSrc("/0923.mp4"));
        setVideoStatus('playing');

        // Since user clicked "OK", we have permission to unmute
        setTimeout(() => {
          sendAction(actions.video.muteOff());
          console.log('[Controller] Sent unmute command with user permission');
        }, 800); // Wait for video to start before unmuting
      }, 1200);
    }
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
          break;
        case 'video:status:error':
          setVideoStatus('error');
          break;
      }
    };

    window.addEventListener('video:status:playing', handleVideoStatus);
    window.addEventListener('video:status:paused', handleVideoStatus);
    window.addEventListener('video:status:stopped', handleVideoStatus);
    window.addEventListener('video:status:error', handleVideoStatus);

    return () => {
      window.removeEventListener('video:status:playing', handleVideoStatus);
      window.removeEventListener('video:status:paused', handleVideoStatus);
      window.removeEventListener('video:status:stopped', handleVideoStatus);
      window.removeEventListener('video:status:error', handleVideoStatus);
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
            className={cn(
              "w-full py-5 px-8 rounded-2xl bg-gradient-to-r from-purple-600 via-cyan-600 to-purple-700 text-white font-bold text-lg shadow-xl transform transition-all duration-300 hover:scale-105 hover:shadow-purple-500/30 border border-white/10",
              disabled && "pointer-events-none opacity-50 grayscale"
            )}
            onClick={onShowViz}
          >
            <span className="text-3xl flex items-center justify-center gap-3">
              <span>
                {animationStatus === 'playing' ? '⏸️' :
                 animationStatus === 'paused' ? '▶️' : '▶️'}
                {animationStatus === 'playing' ? 'Pause' :
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
              ? "Pause the daily animation on display"
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
            <span>Sounds of Data</span>
          </h3>

          {/* Video Toggle Control */}
          <div className="mb-6">
            <button
              disabled={disabled}
              className={cn(
                "w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-600 to-purple-600 text-white font-bold shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-cyan-500/30",
                disabled && "opacity-50 grayscale cursor-not-allowed"
              )}
              onClick={() => {
                if (disabled) return;
                onToggleVideo();
              }}
            >
              <span className="text-3xl flex items-center justify-center gap-3">
                <span>
                  {videoStatus === 'playing' ? '⏸️' :
                   videoStatus === 'paused' ? '▶️' : '▶️'}
                  {videoStatus === 'playing' ? 'Pause' :
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
                ? "Pause video playback"
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
              Audio will play during the video experience. Click "OK" to enable sound and start the video.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleAudioPermission(false)}
                className="flex-1 py-3 px-6 rounded-xl bg-slate-700 text-white font-medium hover:bg-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAudioPermission(true)}
                className="flex-1 py-3 px-6 rounded-xl bg-gradient-to-r from-cyan-600 to-purple-600 text-white font-bold hover:from-cyan-500 hover:to-purple-500 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
