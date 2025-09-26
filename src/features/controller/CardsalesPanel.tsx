// src/features/controller/CardsalesPanel.tsx
"use client";

import { useState } from "react";
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

  const onShowViz = () => {
    sendAction(actions.navigate("/research/local-economy"));
  };

  const onPlayMovie = () => {
    // First ensure we're on the local-economy page, then play video
    sendAction(actions.navigate("/research/local-economy"));
    // Small delay to ensure page loads before playing video
    setTimeout(() => {
      sendAction(actions.video.playSrc("/0923.mp4"));
    }, 300);
  };

  const onPauseMovie = () => {
    sendAction(actions.video.pause());
  };



  return (
    <section className="space-y-8">
      {/* Card Sales Visualization */}
      <div className="group relative rounded-3xl border border-purple-500/30 bg-gradient-to-br from-slate-800/60 to-purple-900/40 p-8 backdrop-blur-xl shadow-2xl hover:shadow-purple-500/20 transition-all duration-500">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative z-10">
          <h3 className="text-4xl font-bold mb-4 text-white flex items-center gap-3">
            <span>💳</span>
            <span>Card Sales Visualization</span>
          </h3>
          <button
            className={cn(
              "w-full py-5 px-8 rounded-2xl bg-gradient-to-r from-purple-600 via-cyan-600 to-purple-700 text-white font-bold text-lg shadow-xl transform transition-all duration-300 hover:scale-105 hover:shadow-purple-500/30 border border-white/10",
              disabled && "pointer-events-none opacity-50 grayscale"
            )}
            onClick={onShowViz}
          >
            <span className="text-3xl flex items-center justify-center gap-3">
              <span>🚀 Launch Visualization</span>
              <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
            </span>
          </button>
          <div className="text-sm text-purple-200/80 mt-3 text-center">
            Navigate display to interactive card sales data visualization
          </div>
        </div>
      </div>

      {/* Experience Card Sales */}
      <div className="group relative rounded-3xl border border-cyan-500/30 bg-gradient-to-br from-slate-800/60 to-cyan-900/40 p-8 backdrop-blur-xl shadow-2xl hover:shadow-cyan-500/20 transition-all duration-500">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative z-10">
          <h3 className="text-4xl font-bold mb-4 text-white flex items-center gap-3">
            <span>🎬</span>
            <span>Experience Card Sales</span>
          </h3>

          {/* Main Play/Pause Controls */}
          <div className="flex gap-4 mb-6">
            <button
              className={cn(
                "flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-cyan-600 to-purple-600 text-white font-bold shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-cyan-500/30",
                disabled && "pointer-events-none opacity-50 grayscale"
              )}
              onClick={onPlayMovie}
            >
              <span className="text-3xl flex items-center justify-center gap-2">
                <span>▶</span>
                <span>Play Experience</span>
              </span>
            </button>
            <button
              className={cn(
                "flex-1 py-4 px-6 rounded-2xl bg-gradient-to-r from-slate-600 to-slate-700 text-white font-bold shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-slate-500/30",
                disabled && "pointer-events-none opacity-50 grayscale"
              )}
              onClick={onPauseMovie}
            >
              <span className="text-3xl flex items-center justify-center gap-2">
                <span>⏸</span>
                <span>Pause</span>
              </span>
            </button>
          </div>

          {/* Additional controls */}
          <div className="flex justify-center gap-3">
            <button
              className={cn("px-4 py-3 rounded-xl bg-slate-700/60 border border-white/20 text-sm hover:bg-slate-600/60 transition-colors backdrop-blur-sm", disabled && "pointer-events-none opacity-50")}
              onClick={() => sendAction(actions.video.muteOff())}
            >
              <span className="flex items-center gap-2">
                <span>🔊</span>
                <span>Unmute</span>
              </span>
            </button>
            <button
              className={cn("px-4 py-3 rounded-xl bg-slate-700/60 border border-white/20 text-sm hover:bg-slate-600/60 transition-colors backdrop-blur-sm", disabled && "pointer-events-none opacity-50")}
              onClick={() => sendAction(actions.video.muteOn())}
            >
              <span className="flex items-center gap-2">
                <span>🔇</span>
                <span>Mute</span>
              </span>
            </button>
            <button
              className={cn("px-4 py-3 rounded-xl bg-red-600/70 border border-red-500/40 text-sm hover:bg-red-600/90 transition-colors backdrop-blur-sm", disabled && "pointer-events-none opacity-50")}
              onClick={() => sendAction(actions.video.close())}
            >
              <span className="flex items-center gap-2">
                <span>✕</span>
                <span>Close</span>
              </span>
            </button>
          </div>
        </div>
      </div>

    </section>
  );
}
