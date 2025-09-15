"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ChevronDown, Settings2 } from "lucide-react"
import { Switch } from "@/src/shared/components/ui/switch"
import { Slider } from "@/src/shared/components/ui/slider"
import { Label } from "@/src/shared/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/shared/components/ui/select"
import type { AnimationConfig } from "../hooks/useParticleAnimation"

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
  // State for collapsible panel
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Removed map style options - keeping only dark theme
  return (
    <div className="absolute top-4 left-4 z-50 pointer-events-auto bg-black/80 backdrop-blur-sm rounded-lg text-white/90 text-sm max-w-md">
      {/* Clickable Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors rounded-lg group"
      >
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-white/70 group-hover:text-white/90 transition-colors" />
          <h3 className="font-semibold text-white">Animation Controls</h3>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-white/70 group-hover:text-white/90 transition-colors" />
        </motion.div>
      </button>
      
      {/* Collapsible Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ 
              duration: 0.3,
              ease: "easeInOut"
            }}
            style={{ overflow: "hidden" }}
          >
            <div className="px-4 pb-4 space-y-3">
      
      {/* Auto Rotation */}
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
      {/* Pulse Animation - Show for high performance */}
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

      {/* Firefly Effect - Show for high performance */}
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

      {/* Map Background Control */}
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

      {/* Color Theme Selector */}
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

      {/* Performance Info */}
      <div className="pt-2 border-t border-white/20">
        <div className="text-xs text-white/60">
          Performance: <span className="text-white/80 font-medium">{performanceLevel.toUpperCase()}</span>
        </div>
      </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}