// src/features/controller/AIPredictionPanel.tsx
"use client";

import { useState, useEffect } from "react";
import { actions, WsSend } from "@/src/shared/ws/ctrlActions";
import { cn } from "@/src/shared/utils/cn";
import { useTranslation } from "@/src/shared/hooks/useTranslation";

export default function AIPredictionPanel({
  wsStatus,
  sendAction,
}: {
  wsStatus?: "idle" | "connecting" | "open" | "closing" | "closed";
  sendAction: WsSend;
}) {
  const { t } = useTranslation();
  const disabled = wsStatus !== "open";
  const [predictionStatus, setPredictionStatus] = useState<'stopped' | 'playing' | 'paused'>('stopped');
  const [canPausePrediction, setCanPausePrediction] = useState(false);

  const onTogglePrediction = () => {
    console.log('🤖 [CONTROLLER] onTogglePrediction called, status:', predictionStatus, 'disabled:', disabled);
    if (disabled) return;

    if (predictionStatus === 'playing') {
      // Only allow pause if 5 seconds have passed
      if (!canPausePrediction) {
        console.log('🤖 [CONTROLLER] Prediction pause blocked - waiting for initialization to complete (5s)');
        return;
      }
      // If currently playing, pause the animation
      console.log('🤖 [CONTROLLER] Sending pause command...');
      sendAction(actions.ai.pauseAnimation());
      setPredictionStatus('paused');
      setCanPausePrediction(false); // Reset pause availability
      console.log('🤖 [CONTROLLER] Pause command sent, status set to paused');
    } else if (predictionStatus === 'paused') {
      // If paused, resume the animation (don't restart from beginning)
      console.log('🤖 [CONTROLLER] Resuming paused prediction animation...');
      sendAction(actions.ai.resumeAnimation());
      setPredictionStatus('playing');
      // Set 5-second timer before allowing pause again
      setTimeout(() => {
        setCanPausePrediction(true);
        console.log('🤖 [CONTROLLER] Prediction pause button now available after resume');
      }, 5000);
    } else {
      // If stopped, navigate and start fresh
      console.log('🤖 [CONTROLLER] Starting fresh prediction...');
      sendAction(actions.navigate("/research/prediction"));
      console.log('🤖 [CONTROLLER] Navigate command sent');
      setTimeout(() => {
        console.log('🤖 [CONTROLLER] Sending start animation command...');
        sendAction(actions.ai.startAnimation());
        setPredictionStatus('playing');
        console.log('🤖 [CONTROLLER] Start animation command sent, status set to playing');

        // Enable pause after 5 seconds
        setTimeout(() => {
          setCanPausePrediction(true);
          console.log('🤖 [CONTROLLER] Prediction pause button now available after 5 seconds');
        }, 5000);
      }, 500);
    }
  };

  // Note: Controller manages its own state based on button clicks
  // No need to listen for display events as this creates conflicts with video controls

  // Temperature scenario state
  const [tempScenario, setTempScenario] = useState('t050')

  const TempDeltaButtons = () => {
    const scenarios = [
      { value: 't050', label: '+5°C', color: 'from-green-500 to-emerald-500' },
      { value: 't100', label: '+10°C', color: 'from-yellow-500 to-amber-500' },
      { value: 't150', label: '+15°C', color: 'from-orange-500 to-red-500' },
      { value: 't200', label: '+20°C', color: 'from-red-500 to-pink-500' }
    ];
    return (
      <div className="grid grid-cols-2 gap-3">
        {scenarios.map((scenario) => (
          <button
            key={scenario.value}
            className={cn(
              "group relative py-4 px-6 rounded-xl font-bold text-sm transition-all duration-300 transform hover:scale-105 border backdrop-blur-sm",
              tempScenario === scenario.value
                ? `bg-gradient-to-r ${scenario.color} text-white shadow-lg border-white/20`
                : "bg-slate-700/60 text-gray-300 hover:bg-slate-600/70 border-white/10 hover:border-white/20",
              disabled && "pointer-events-none opacity-50 grayscale"
            )}
            onClick={() => {
              setTempScenario(scenario.value)
              sendAction(`display:ai:set-temp-scenario:${scenario.value}`)
            }}
          >
            <span className="relative z-10 flex items-center justify-center gap-2 text-xl">
              <span>🌡️</span>
              <span>{scenario.label}</span>
            </span>
            {tempScenario === scenario.value && (
              <div className="absolute inset-0 rounded-xl bg-white/10 animate-pulse"></div>
            )}
          </button>
        ))}
      </div>
    );
  };

  return (
    <section className="space-y-8">
      {/* AI Prediction Main Controls */}
      <div className="group relative rounded-3xl border border-pink-500/30 bg-gradient-to-br from-slate-800/60 to-pink-900/40 p-8 backdrop-blur-xl shadow-2xl hover:shadow-pink-500/20 transition-all duration-500">
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-pink-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="relative z-10">
          <h3 className="text-4xl font-bold mb-4 text-white flex items-center gap-3">
            <span>🤖</span>
            <span>{t('panels.impactOfTemp')}</span>
          </h3>
          <div className="text-lg text-pink-200/80 mb-6 text-center">
            {t('panels.howTempAffects')}
          </div>

          {/* Main AI Prediction Button */}
          <button
            disabled={disabled || (predictionStatus === 'playing' && !canPausePrediction)}
            className={cn(
              "w-full py-5 px-8 rounded-2xl bg-gradient-to-r from-pink-600 via-purple-600 to-pink-700 text-white font-bold text-lg shadow-xl transform transition-all duration-300 hover:scale-105 hover:shadow-pink-500/30 border border-white/10 mb-8",
              (disabled || (predictionStatus === 'playing' && !canPausePrediction)) && "pointer-events-none opacity-50 grayscale"
            )}
            onClick={onTogglePrediction}
          >
            <span className="text-3xl flex items-center justify-center gap-3">
              <span>
                {predictionStatus === 'playing' ? (canPausePrediction ? '⏸️' : '⏸️') :
                 predictionStatus === 'paused' ? '▶️' : '🚀'}
                {predictionStatus === 'playing' ? (canPausePrediction ? t('common.pause') : t('panels.wait')) :
                 predictionStatus === 'paused' ? t('common.play') : t('common.play')}
              </span>
              <div className={cn(
                "w-2 h-2 rounded-full transition-all duration-300",
                predictionStatus === 'playing' ? "bg-red-400 animate-pulse" :
                predictionStatus === 'paused' ? "bg-yellow-400 animate-pulse" :
                "bg-white animate-ping"
              )}></div>
            </span>
          </button>

          {/* Temperature Scenario Selection */}
          <div className="bg-gradient-to-r from-pink-800/30 to-purple-800/30 rounded-2xl p-6 border border-pink-500/20">
            <div className="text-2xl font-semibold mb-4 text-center text-white">
              🌡️ {t('panels.tempScenarios')}
            </div>
            <TempDeltaButtons />
            <div className="text-sm text-pink-300/80 mt-4 text-center p-3 rounded-xl bg-pink-900/20 border border-pink-500/20">
              💡 {t('panels.animationTip')}
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}