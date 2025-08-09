"use client"

import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { AnimationConfig } from "@/hooks/use-particle-animations"

interface AnimationControlsProps {
  config: AnimationConfig
  onConfigChange: (config: Partial<AnimationConfig>) => void
  performanceLevel: 'high' | 'medium' | 'low'
  mapStyle: string
  onMapStyleChange: (style: string) => void
}

export function AnimationControls({ 
  config, 
  onConfigChange,
  performanceLevel,
  mapStyle,
  onMapStyleChange
}: AnimationControlsProps) {
  
  // Removed map style options - keeping only dark theme
  return (
    <div className="absolute top-4 left-4 z-50 pointer-events-auto bg-black/80 backdrop-blur-sm rounded-lg p-4 text-white/90 text-sm max-w-md space-y-3">
      <h3 className="font-semibold text-white mb-2">Animation Controls</h3>
      
      {/* Visualization Layer Selection */}
      <div className="space-y-2">
        <Label className="text-xs">Visualization Layer</Label>
        <Select
          value={config.layerType}
          onValueChange={(value: 'particle' | 'wave') => onConfigChange({ layerType: value })}
        >
          <SelectTrigger className="w-full bg-white/10 border-white/20 text-white">
            <SelectValue placeholder="Select layer type" />
          </SelectTrigger>
          <SelectContent className="bg-black/90 border-white/20">
            <SelectItem value="particle" className="text-white hover:bg-white/10">
              Particle Layer
            </SelectItem>
            <SelectItem value="wave" className="text-white hover:bg-white/10">
              Wave Layer
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Auto Rotation - Show for particle layer */}
      {config.layerType === 'particle' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="autorotate" className="text-xs">Auto Rotation</Label>
            <Switch
              id="autorotate"
              checked={config.autoRotateEnabled}
              onCheckedChange={(checked) => onConfigChange({ autoRotateEnabled: checked })}
            />
          </div>
          {config.autoRotateEnabled && (
            <div className="ml-4 space-y-1">
              <div className="flex items-center gap-2">
                <Label className="text-xs w-16">Speed</Label>
                <Slider
                  value={[config.autoRotateSpeed * 10]}
                  onValueChange={([value]) => onConfigChange({ autoRotateSpeed: value / 10 })}
                  max={20}
                  min={0.1}
                  step={0.1}
                  className="flex-[1.5] min-w-[200px]"
                />
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Wave Animation - Show for particle layer */}
      {config.layerType === 'particle' && (
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
                value={[config.waveSpeed * 100]}
                onValueChange={([value]) => onConfigChange({ waveSpeed: value / 100 })}
                max={100}
                min={0.1}
                step={0.1}
                className="flex-[1.5] min-w-[200px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs w-16">Amplitude</Label>
              <Slider
                value={[config.waveAmplitude * 1000]}
                onValueChange={([value]) => onConfigChange({ waveAmplitude: value / 1000 })}
                max={300}
                min={1}
                step={0.5}
                className="flex-[1.5] min-w-[200px]"
              />
            </div>
          </div>
        )}
      </div>
      )}

      {/* Pulse Animation - Show for particle layer */}
      {performanceLevel === 'high' && config.layerType === 'particle' && (
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
                  value={[config.pulseSpeed * 100]}
                  onValueChange={([value]) => onConfigChange({ pulseSpeed: value / 100 })}
                  max={100}
                  min={0.1}
                  step={0.1}
                  className="flex-[1.5] min-w-[200px]"
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
                  className="flex-[1.5] min-w-[200px]"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Color Cycle - Show for particle layer */}
      {config.layerType === 'particle' && (
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
                value={[config.colorCycleSpeed * 1000]}
                onValueChange={([value]) => onConfigChange({ colorCycleSpeed: value / 1000 })}
                max={200}
                min={0.1}
                step={0.1}
                className="flex-[1.5] min-w-[200px]"
              />
            </div>
          </div>
        )}
      </div>
      )}

      {/* Firefly Effect - Show for particle layer */}
      {performanceLevel === 'high' && config.layerType === 'particle' && (
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
                  value={[config.fireflySpeed * 1000]}
                  onValueChange={([value]) => onConfigChange({ fireflySpeed: value / 1000 })}
                  max={500}
                  min={1}
                  step={1}
                  className="flex-[1.5] min-w-[200px]"
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
                  className="flex-[1.5] min-w-[200px]"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Wave Layer Controls - Show for wave layer */}
      {config.layerType === 'wave' && (
        <>
          {/* Wave Pattern Selection */}
          <div className="space-y-2 p-3 bg-white/5 rounded-lg">
            <Label className="text-xs font-semibold text-cyan-400">Wave Pattern</Label>
            <Select
              value={config.wavePattern}
              onValueChange={(value: 'sine' | 'triangle' | 'sawtooth' | 'square') => onConfigChange({ wavePattern: value })}
            >
              <SelectTrigger className="w-full bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Select wave pattern" />
              </SelectTrigger>
              <SelectContent className="bg-black/90 border-white/20">
                <SelectItem value="sine" className="text-white hover:bg-white/10">
                  Sine Wave (Smooth)
                </SelectItem>
                <SelectItem value="triangle" className="text-white hover:bg-white/10">
                  Triangle Wave (Sharp)
                </SelectItem>
                <SelectItem value="sawtooth" className="text-white hover:bg-white/10">
                  Sawtooth Wave (Aggressive)
                </SelectItem>
                <SelectItem value="square" className="text-white hover:bg-white/10">
                  Square Wave (Digital)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Wave Animation Controls */}
          <div className="space-y-2 p-3 bg-white/5 rounded-lg">
            <Label className="text-xs font-semibold text-purple-400 mb-2">Animation Settings</Label>
            <div className="flex items-center justify-between">
              <Label htmlFor="wave-intensity" className="text-xs">Wave Intensity</Label>
              <Slider
                value={[config.waveAmplitude * 100]}
                onValueChange={([value]) => onConfigChange({ waveAmplitude: value / 100 })}
                max={200}
                min={0.1}
                step={0.1}
                className="flex-[1.5] min-w-[200px] ml-2"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="wave-flow" className="text-xs">Wave Flow Speed</Label>
              <Slider
                value={[config.waveSpeed * 100]}
                onValueChange={([value]) => onConfigChange({ waveSpeed: value / 100 })}
                max={150}
                min={0.1}
                step={0.1}
                className="flex-[1.5] min-w-[200px] ml-2"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="wave-height" className="text-xs">Height Multiplier</Label>
              <Slider
                value={[config.waveHeightMultiplier * 100]}
                onValueChange={([value]) => onConfigChange({ waveHeightMultiplier: value / 100 })}
                max={300}
                min={10}
                step={10}
                className="flex-[1.5] min-w-[200px] ml-2"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="wave-anim-speed" className="text-xs">Animation Speed</Label>
              <Slider
                value={[config.waveAnimationSpeed * 100]}
                onValueChange={([value]) => onConfigChange({ waveAnimationSpeed: value / 100 })}
                max={500}
                min={10}
                step={10}
                className="flex-[1.5] min-w-[200px] ml-2"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="wave-color" className="text-xs">Color Intensity</Label>
              <Slider
                value={[config.waveColorIntensity * 100]}
                onValueChange={([value]) => onConfigChange({ waveColorIntensity: value / 100 })}
                max={200}
                min={10}
                step={10}
                className="flex-[1.5] min-w-[200px] ml-2"
              />
            </div>
          </div>
          
          {/* Particle Visibility Controls */}
          <div className="space-y-2 p-3 bg-white/5 rounded-lg">
            <Label className="text-xs font-semibold text-cyan-400 mb-2">Particle Visibility</Label>
            <div className="flex items-center justify-between">
              <Label htmlFor="particle-opacity" className="text-xs">Particle Opacity</Label>
              <Slider
                value={[config.waveParticleOpacity * 100]}
                onValueChange={([value]) => onConfigChange({ waveParticleOpacity: value / 100 })}
                max={100}
                min={10}
                step={5}
                className="flex-[1.5] min-w-[200px] ml-2"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="particle-size" className="text-xs">Particle Size</Label>
              <Slider
                value={[config.waveParticleSize * 100]}
                onValueChange={([value]) => onConfigChange({ waveParticleSize: value / 100 })}
                max={300}
                min={50}
                step={10}
                className="flex-[1.5] min-w-[200px] ml-2"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="color-brightness" className="text-xs">Color Brightness</Label>
              <Slider
                value={[config.waveColorBrightness * 100]}
                onValueChange={([value]) => onConfigChange({ waveColorBrightness: value / 100 })}
                max={200}
                min={50}
                step={10}
                className="flex-[1.5] min-w-[200px] ml-2"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="particle-density" className="text-xs">Particle Density</Label>
              <Slider
                value={[config.waveParticleDensity]}
                onValueChange={([value]) => onConfigChange({ waveParticleDensity: value })}
                max={200}
                min={50}
                step={10}
                className="flex-[1.5] min-w-[200px] ml-2"
              />
              <span className="text-xs text-white/60 ml-2">{config.waveParticleDensity}x{config.waveParticleDensity}</span>
            </div>
          </div>
          
          {/* Map Background Control */}
          <div className="space-y-2 p-3 bg-white/5 rounded-lg">
            <Label className="text-xs font-semibold text-gray-400 mb-2">Map Background</Label>
            <div className="flex items-center justify-between">
              <Label htmlFor="black-background" className="text-xs">Black Background</Label>
              <Switch
                id="black-background"
                checked={config.blackBackgroundEnabled}
                onCheckedChange={(checked) => onConfigChange({ blackBackgroundEnabled: checked })}
              />
            </div>
          </div>
        </>
      )}

      {/* Map Background Control - Show for particle layer */}
      {config.layerType === 'particle' && (
        <div className="space-y-2 p-3 bg-white/5 rounded-lg">
          <Label className="text-xs font-semibold text-gray-400 mb-2">Map Background</Label>
          <div className="flex items-center justify-between">
            <Label htmlFor="particle-black-background" className="text-xs">Black Background</Label>
            <Switch
              id="particle-black-background"
              checked={config.blackBackgroundEnabled}
              onCheckedChange={(checked) => onConfigChange({ blackBackgroundEnabled: checked })}
            />
          </div>
        </div>
      )}

      {/* Color Theme Selector - Show for particle layer */}
      {config.layerType === 'particle' && (
        <div className="space-y-2">
          <Label className="text-xs">Color Theme</Label>
          <Select
            value={config.colorTheme}
            onValueChange={(value: 'current' | 'ocean' | 'sunset' | 'forest' | 'aurora' | 'galaxy' | 'cyberpunk') => onConfigChange({ colorTheme: value })}
          >
            <SelectTrigger className="w-full bg-white/10 border-white/20 text-white">
              <SelectValue placeholder="Select color theme" />
            </SelectTrigger>
            <SelectContent className="bg-black/90 border-white/20">
              <SelectItem value="current" className="text-white hover:bg-white/10">
                Current (Purple/Blue)
              </SelectItem>
              <SelectItem value="ocean" className="text-white hover:bg-white/10">
                Ocean (Blues)
              </SelectItem>
              <SelectItem value="sunset" className="text-white hover:bg-white/10">
                Sunset (Orange/Red)
              </SelectItem>
              <SelectItem value="forest" className="text-white hover:bg-white/10">
                Forest (Greens)
              </SelectItem>
              <SelectItem value="aurora" className="text-white hover:bg-white/10">
                Aurora (Cyan/Green)
              </SelectItem>
              <SelectItem value="galaxy" className="text-white hover:bg-white/10">
                Galaxy (Violet/Purple)
              </SelectItem>
              <SelectItem value="cyberpunk" className="text-white hover:bg-white/10">
                Cyberpunk (Neon)
              </SelectItem>
            </SelectContent>
          </Select>
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