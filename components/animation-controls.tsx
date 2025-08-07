"use client"

import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import type { AnimationConfig } from "@/hooks/use-particle-animations"

interface AnimationControlsProps {
  config: AnimationConfig
  onConfigChange: (config: Partial<AnimationConfig>) => void
  performanceLevel: 'high' | 'medium' | 'low'
}

export function AnimationControls({ 
  config, 
  onConfigChange,
  performanceLevel 
}: AnimationControlsProps) {
  return (
    <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white/90 text-sm max-w-xs space-y-3">
      <h3 className="font-semibold text-white mb-2">Animation Controls</h3>
      
      {/* Wave Animation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="wave" className="text-xs">Wave Motion</Label>
          <Switch
            id="wave"
            checked={config.waveEnabled}
            onCheckedChange={(checked) => onConfigChange({ waveEnabled: checked })}
            disabled={performanceLevel === 'low'}
          />
        </div>
        {config.waveEnabled && (
          <div className="ml-4 space-y-1">
            <div className="flex items-center gap-2">
              <Label className="text-xs w-16">Speed</Label>
              <Slider
                value={[config.waveSpeed * 1000]}
                onValueChange={([value]) => onConfigChange({ waveSpeed: value / 1000 })}
                max={5}
                min={0.1}
                step={0.1}
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs w-16">Amplitude</Label>
              <Slider
                value={[config.waveAmplitude * 10000]}
                onValueChange={([value]) => onConfigChange({ waveAmplitude: value / 10000 })}
                max={20}
                min={1}
                step={0.5}
                className="flex-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* Pulse Animation */}
      {performanceLevel === 'high' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="pulse" className="text-xs">Pulse Effect</Label>
            <Switch
              id="pulse"
              checked={config.pulseEnabled}
              onCheckedChange={(checked) => onConfigChange({ pulseEnabled: checked })}
            />
          </div>
          {config.pulseEnabled && (
            <div className="ml-4 space-y-1">
              <div className="flex items-center gap-2">
                <Label className="text-xs w-16">Speed</Label>
                <Slider
                  value={[config.pulseSpeed * 1000]}
                  onValueChange={([value]) => onConfigChange({ pulseSpeed: value / 1000 })}
                  max={5}
                  min={0.1}
                  step={0.1}
                  className="flex-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs w-16">Intensity</Label>
                <Slider
                  value={[config.pulseIntensity * 10]}
                  onValueChange={([value]) => onConfigChange({ pulseIntensity: value / 10 })}
                  max={10}
                  min={1}
                  step={0.5}
                  className="flex-1"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Color Cycle */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="color" className="text-xs">Color Cycle</Label>
          <Switch
            id="color"
            checked={config.colorCycleEnabled}
            onCheckedChange={(checked) => onConfigChange({ colorCycleEnabled: checked })}
            disabled={performanceLevel === 'low'}
          />
        </div>
        {config.colorCycleEnabled && (
          <div className="ml-4 space-y-1">
            <div className="flex items-center gap-2">
              <Label className="text-xs w-16">Speed</Label>
              <Slider
                value={[config.colorCycleSpeed * 10000]}
                onValueChange={([value]) => onConfigChange({ colorCycleSpeed: value / 10000 })}
                max={10}
                min={0.1}
                step={0.1}
                className="flex-1"
              />
            </div>
          </div>
        )}
      </div>

      {/* Firefly Effect */}
      {performanceLevel === 'high' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="firefly" className="text-xs">Firefly Effect</Label>
            <Switch
              id="firefly"
              checked={config.fireflyEnabled}
              onCheckedChange={(checked) => onConfigChange({ fireflyEnabled: checked })}
            />
          </div>
          {config.fireflyEnabled && (
            <div className="ml-4 space-y-1">
              <div className="flex items-center gap-2">
                <Label className="text-xs w-16">Speed</Label>
                <Slider
                  value={[config.fireflySpeed * 10000]}
                  onValueChange={([value]) => onConfigChange({ fireflySpeed: value / 10000 })}
                  max={30}
                  min={1}
                  step={1}
                  className="flex-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs w-16">Random</Label>
                <Slider
                  value={[config.fireflyRandomness * 10]}
                  onValueChange={([value]) => onConfigChange({ fireflyRandomness: value / 10 })}
                  max={10}
                  min={1}
                  step={0.5}
                  className="flex-1"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Performance Info */}
      <div className="pt-2 border-t border-white/20">
        <div className="text-xs text-white/60">
          Performance: <span className="text-white/80 font-medium">{performanceLevel.toUpperCase()}</span>
        </div>
      </div>
    </div>
  )
}