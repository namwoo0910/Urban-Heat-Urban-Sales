/**
 * Modern Color Palette for 3D District Visualization
 * Each district has a unique color family with subtle variations per neighborhood
 */

// Adjacent theme color mapping - uses only 4 colors
const ADJACENT_COLORS: Record<string, [number, number, number]> = {
  // Color 1: Deep Blue
  "강남구": [41, 98, 185],
  "동작구": [41, 98, 185],
  "종로구": [41, 98, 185],
  "노원구": [41, 98, 185],
  "강서구": [41, 98, 185],
  "금천구": [41, 98, 185],
  
  // Color 2: Forest Green
  "서초구": [39, 174, 96],
  "관악구": [39, 174, 96],
  "성북구": [39, 174, 96],
  "도봉구": [39, 174, 96],
  "양천구": [39, 174, 96],
  "광진구": [39, 174, 96],
  
  // Color 3: Deep Purple
  "송파구": [142, 68, 173],
  "용산구": [142, 68, 173],
  "강북구": [142, 68, 173],
  "구로구": [142, 68, 173],
  "성동구": [142, 68, 173],
  "은평구": [142, 68, 173],
  "중랑구": [142, 68, 173],
  
  // Color 4: Warm Orange
  "강동구": [230, 126, 34],
  "중구": [230, 126, 34],
  "영등포구": [230, 126, 34],
  "마포구": [230, 126, 34],
  "서대문구": [230, 126, 34]
};

// District base colors - modern, sophisticated palette
const DISTRICT_COLORS: Record<string, [number, number, number]> = {
  // Cool Blues - Business districts
  "강남구": [41, 128, 185],      // Strong blue
  "서초구": [52, 152, 219],      // Sky blue
  "송파구": [46, 134, 193],      // Ocean blue
  
  // Warm Purples - Historic center
  "종로구": [142, 68, 173],      // Royal purple
  "중구": [155, 89, 182],        // Amethyst
  "용산구": [165, 105, 189],     // Lavender
  
  // Teals/Cyans - Western districts
  "마포구": [26, 188, 156],      // Turquoise
  "서대문구": [22, 160, 133],    // Sea green
  "은평구": [17, 140, 123],      // Deep teal
  
  // Soft Greens - Northern districts
  "노원구": [46, 204, 113],      // Emerald
  "도봉구": [39, 174, 96],       // Forest green
  "강북구": [32, 155, 84],       // Pine green
  
  // Coral/Salmon - Western industrial
  "강서구": [231, 76, 60],       // Coral red
  "양천구": [230, 126, 83],      // Salmon
  "구로구": [211, 84, 66],       // Terracotta
  
  // Indigo/Navy - Eastern districts
  "강동구": [41, 47, 102],       // Deep indigo
  "광진구": [52, 73, 128],       // Navy blue
  "성동구": [63, 81, 145],       // Royal navy
  
  // Amber/Gold - Southern districts
  "동작구": [243, 156, 18],      // Amber
  "관악구": [230, 126, 34],      // Dark orange
  "금천구": [211, 117, 42],      // Bronze
  
  // Rose/Mauve - Mixed areas
  "성북구": [192, 57, 112],      // Rose
  "동대문구": [178, 93, 139],    // Mauve
  "중랑구": [189, 114, 152],     // Dusty rose
  "영등포구": [201, 79, 127],    // Deep rose
};

// Get theme adjustments from global state
function getThemeAdjustments() {
  if (typeof window !== 'undefined' && (window as any).__themeAdjustments) {
    return (window as any).__themeAdjustments
  }
  return { opacity: 100, brightness: 0, saturation: 0, contrast: 0 }
}

// Apply visual adjustments to color
export function applyColorAdjustments(
  r: number, 
  g: number, 
  b: number, 
  alpha: number
): [number, number, number, number] {
  const adjustments = getThemeAdjustments()
  
  // Apply brightness adjustment (-50 to 50)
  const brightnessFactor = 1 + (adjustments.brightness / 100)
  r = Math.max(0, Math.min(255, r * brightnessFactor))
  g = Math.max(0, Math.min(255, g * brightnessFactor))
  b = Math.max(0, Math.min(255, b * brightnessFactor))
  
  // Apply saturation adjustment (-50 to 50)
  if (adjustments.saturation !== 0) {
    const gray = 0.299 * r + 0.587 * g + 0.114 * b
    const saturationFactor = 1 + (adjustments.saturation / 100)
    r = Math.max(0, Math.min(255, gray + saturationFactor * (r - gray)))
    g = Math.max(0, Math.min(255, gray + saturationFactor * (g - gray)))
    b = Math.max(0, Math.min(255, gray + saturationFactor * (b - gray)))
  }
  
  // Apply contrast adjustment (-50 to 50)
  if (adjustments.contrast !== 0) {
    const factor = (259 * (adjustments.contrast + 255)) / (255 * (259 - adjustments.contrast))
    r = Math.max(0, Math.min(255, factor * (r - 128) + 128))
    g = Math.max(0, Math.min(255, factor * (g - 128) + 128))
    b = Math.max(0, Math.min(255, factor * (b - 128) + 128))
  }
  
  // Apply opacity adjustment (20 to 100%)
  const finalAlpha = Math.floor((alpha * adjustments.opacity) / 100)
  
  return [Math.floor(r), Math.floor(g), Math.floor(b), finalAlpha]
}

// Generate variation for neighborhoods within a district
export function getDongVariation(dongName: string): { r: number; g: number; b: number } {
  // Use dong name hash for consistent but varied colors
  let hash = 0;
  for (let i = 0; i < dongName.length; i++) {
    hash = ((hash << 5) - hash) + dongName.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Create subtle variations (-15 to +15 for each channel)
  const variation = 15;
  const r = ((hash & 0xFF) % variation) - (variation / 2);
  const g = (((hash >> 8) & 0xFF) % variation) - (variation / 2);
  const b = (((hash >> 16) & 0xFF) % variation) - (variation / 2);
  
  return { r, g, b };
}

// Get base color for a district
export function getDistrictBaseColor(guName: string, themeKey?: string): [number, number, number] {
  // Use adjacent color mapping for adjacent theme
  if (themeKey === 'adjacent') {
    return ADJACENT_COLORS[guName] || [100, 140, 180];
  }
  return DISTRICT_COLORS[guName] || [100, 140, 180]; // Default blue-gray
}

// Modern color calculation with height-based intensity
export function getModernDistrictColor(
  guName: string,
  dongName: string,
  height: number,
  themeKey: string = 'modern',
  isSelected: boolean = false,
  isHovered: boolean = false
): [number, number, number, number] {
  
  // Get base district color (pass themeKey for adjacent theme support)
  let [r, g, b] = getDistrictBaseColor(guName, themeKey);
  
  // Apply theme variations
  if (themeKey === 'adjacent') {
    // For adjacent theme, use stronger dong variations for better distinction
    const dongVar = getDongVariation(dongName);
    
    // Apply stronger brightness variation for different dongs
    const brightnessVar = ((dongVar.r + dongVar.g + dongVar.b) / 3) * 2; // Amplify variation
    const brightness = 0.7 + (brightnessVar / 100); // 0.5 to 0.9 range
    
    r = Math.floor(r * brightness);
    g = Math.floor(g * brightness);
    b = Math.floor(b * brightness);
    
    // Apply height-based intensity
    const normalizedHeight = Math.min(height, 600) / 600;
    const intensityBoost = 0.5 + normalizedHeight * 0.5; // Wider range for adjacent theme
    
    r = Math.floor(r * intensityBoost);
    g = Math.floor(g * intensityBoost);
    b = Math.floor(b * intensityBoost);
  } else if (themeKey === 'modern-dark') {
    // Darker, more saturated colors
    r = Math.floor(r * 0.7);
    g = Math.floor(g * 0.7);
    b = Math.floor(b * 0.7);
  } else if (themeKey === 'modern-light') {
    // Lighter, pastel colors
    r = Math.floor(r + (255 - r) * 0.4);
    g = Math.floor(g + (255 - g) * 0.4);
    b = Math.floor(b + (255 - b) * 0.4);
  } else if (themeKey === 'modern-neon') {
    // Vibrant neon colors
    r = Math.min(255, Math.floor(r * 1.3));
    g = Math.min(255, Math.floor(g * 1.3));
    b = Math.min(255, Math.floor(b * 1.3));
  } else if (themeKey === 'modern-earth') {
    // Natural, earthy tones
    r = Math.floor(r * 0.8 + 51); // Add brown tint
    g = Math.floor(g * 0.7 + 34);
    b = Math.floor(b * 0.6 + 17);
  } else if (themeKey === 'modern-ocean') {
    // Ocean-inspired blues and greens
    r = Math.floor(r * 0.6);
    g = Math.floor(g * 0.8 + 30);
    b = Math.floor(b * 1.2);
  }
  
  // Apply height-based intensity (brighter = higher sales)
  const normalizedHeight = Math.min(height, 600) / 600; // Normalize to 0-1
  const intensityBoost = 0.3 + normalizedHeight * 0.7; // 0.3 to 1.0 range
  
  r = Math.floor(r * intensityBoost);
  g = Math.floor(g * intensityBoost);
  b = Math.floor(b * intensityBoost);
  
  // Apply dong variation for subtle differences
  const dongVar = getDongVariation(dongName);
  r = Math.max(0, Math.min(255, r + dongVar.r));
  g = Math.max(0, Math.min(255, g + dongVar.g));
  b = Math.max(0, Math.min(255, b + dongVar.b));
  
  // Selection and hover effects
  if (isSelected) {
    // Brighten for selection
    r = Math.min(255, r + 40);
    g = Math.min(255, g + 40);
    b = Math.min(255, b + 40);
  }
  
  if (isHovered) {
    // Strong white glow for hover - much more visible
    r = Math.min(255, r + 50);
    g = Math.min(255, g + 50);
    b = Math.min(255, b + 50);
  }
  
  // Alpha channel
  let alpha = 235; // Slightly transparent for depth
  if (isSelected) alpha = 255;
  if (isHovered) alpha = 255; // Full opacity for maximum visibility when hovered
  
  // Apply theme adjustments (brightness, saturation, contrast)
  return applyColorAdjustments(r, g, b, alpha);
}

// Get edge color based on district color
export function getModernEdgeColor(
  guName: string,
  isHighlighted: boolean = false,
  themeKey?: string
): [number, number, number, number] {
  const [r, g, b] = getDistrictBaseColor(guName, themeKey);
  
  if (isHighlighted) {
    // Bright white edge for highlighted areas
    return [255, 255, 255, 200];
  }
  
  // Lighter version of district color for subtle edges
  const edgeAlpha = 120;
  
  return [
    Math.min(255, r + 80),
    Math.min(255, g + 80),
    Math.min(255, b + 80),
    edgeAlpha
  ];
}

// Modern material properties for different themes - brighter settings
export function getModernMaterial(themeKey: string = 'modern') {
  const baseMaterial = {
    ambient: 0.65,  // Increased from 0.4
    diffuse: 0.95,  // Increased from 0.7
    shininess: 80,  // Increased from 64
    specularColor: [120, 130, 140] as [number, number, number]  // Brighter specular
  };
  
  if (themeKey === 'modern-dark') {
    return {
      ...baseMaterial,
      ambient: 0.3,
      diffuse: 0.8,
      shininess: 80,
      specularColor: [60, 65, 70] as [number, number, number]
    };
  } else if (themeKey === 'modern-neon') {
    return {
      ...baseMaterial,
      ambient: 0.5,
      diffuse: 0.9,
      shininess: 128,
      specularColor: [120, 130, 140] as [number, number, number]
    };
  } else if (themeKey === 'modern-earth') {
    return {
      ...baseMaterial,
      ambient: 0.45,
      diffuse: 0.65,
      shininess: 32,
      specularColor: [70, 65, 60] as [number, number, number]
    };
  }
  
  return baseMaterial;
}

// Color for non-selected districts when one is selected
export function getDimmedColor(): [number, number, number, number] {
  return [45, 45, 50, 180]; // Dark gray with transparency
}

// Bright accent color for special highlights
export function getAccentColor(themeKey: string = 'modern'): [number, number, number, number] {
  switch (themeKey) {
    case 'modern-dark':
      return [100, 200, 255, 255]; // Bright cyan
    case 'modern-light':
      return [255, 100, 150, 255]; // Bright pink
    case 'modern-neon':
      return [255, 255, 100, 255]; // Neon yellow
    case 'modern-earth':
      return [255, 200, 100, 255]; // Warm gold
    case 'modern-ocean':
      return [100, 255, 200, 255]; // Aqua
    default:
      return [100, 180, 255, 255]; // Sky blue
  }
}

// Helper function to interpolate between two colors
function interpolateColor(
  color1: [number, number, number],
  color2: [number, number, number],
  ratio: number
): [number, number, number] {
  return [
    Math.round(color1[0] + (color2[0] - color1[0]) * ratio),
    Math.round(color1[1] + (color2[1] - color1[1]) * ratio),
    Math.round(color1[2] + (color2[2] - color1[2]) * ratio)
  ];
}

// Generate 40-step gradient colors for a theme
function generateGradientColors(
  darkColor: [number, number, number],
  lightColor: [number, number, number],
  steps: number = 40
): [number, number, number][] {
  const colors: [number, number, number][] = [];
  for (let i = 0; i < steps; i++) {
    const ratio = i / (steps - 1); // 0 to 1
    colors.push(interpolateColor(darkColor, lightColor, ratio));
  }
  return colors;
}

// Simple sales-based color with 40 clear ranges
export function getSimpleSalesColor(
  totalSales: number,
  themeKey: string = 'blue'
): [number, number, number, number] {
  const alpha = 242; // Fixed alpha for consistency
  
  // Define color ranges for each theme (dark to light) - Brightened for better visibility
  const themeColors = {
    blue: {
      dark: [40, 80, 140] as [number, number, number],      // Brighter navy
      light: [220, 240, 255] as [number, number, number]    // Bright light blue
    },
    green: {
      dark: [40, 90, 40] as [number, number, number],       // Brighter green
      light: [230, 255, 230] as [number, number, number]    // Bright mint
    },
    purple: {
      dark: [90, 50, 120] as [number, number, number],      // Brighter purple
      light: [250, 235, 255] as [number, number, number]    // Bright lavender
    },
    orange: {
      dark: [140, 80, 30] as [number, number, number],      // Brighter brown-orange
      light: [255, 250, 235] as [number, number, number]    // Bright cream
    },
    mint: {
      dark: [30, 100, 100] as [number, number, number],     // Brighter teal
      light: [235, 255, 255] as [number, number, number]    // Bright cyan
    },
    bright: {
      dark: [50, 100, 180] as [number, number, number],     // Bright blue
      light: [200, 230, 255] as [number, number, number]    // Very light sky blue
    }
  };
  
  // Get theme colors or default to blue
  const theme = themeColors[themeKey as keyof typeof themeColors] || themeColors.blue;
  const gradientColors = generateGradientColors(theme.dark, theme.light, 40);
  
  // Calculate which color index to use (40 steps from 0 to 50억)
  const step = 125000000; // 1.25억 per step (50억 / 40)
  const colorIndex = Math.min(Math.floor(totalSales / step), 39);
  
  // Return the appropriate color from the gradient
  const [r, g, b] = gradientColors[colorIndex]; // High sales = bright color
  
  // Apply theme adjustments (brightness, saturation, contrast)
  return applyColorAdjustments(r, g, b, alpha);
}

// Get sales-based color using simple 20-step gradient
export function getSalesBasedColor(
  baseColor: [number, number, number],
  baseAlpha: number,
  totalSales: number,
  applyThemeAdjustments: boolean = true,
  themeKey: string = 'blue'
): [number, number, number, number] {
  // Simple gradient based on sales
  const normalizedSales = Math.min(totalSales / 1000000000, 1) // Normalize to 0-1 based on 1B max
  const [r, g, b] = [100 + normalizedSales * 155, 50 + normalizedSales * 100, 200 - normalizedSales * 100]
  const alpha = baseAlpha
  
  // Apply theme adjustments if requested
  if (applyThemeAdjustments) {
    return applyColorAdjustments(r, g, b, alpha);
  }
  
  return [r, g, b, alpha];
}