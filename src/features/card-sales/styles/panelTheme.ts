/**
 * Unified Dark Black Theme for Card Sales Panels
 * 더 어두운 검정톤 패널 테마
 */

export const panelTheme = {
  // Main panel background - dark black with subtle transparency
  background: "bg-black/90",
  
  // Border - subtle gray border for definition
  border: "border-gray-800/50",
  
  // Hover states
  hoverBackground: "hover:bg-gray-900/50",
  
  // Text colors
  textPrimary: "text-gray-200",
  textSecondary: "text-gray-500",
  textMuted: "text-gray-600",
  
  // Backdrop blur for depth
  backdrop: "backdrop-blur-md",
  
  // Shadow for elevation
  shadow: "shadow-2xl",
  
  // Combined className for panels
  panel: "bg-black/90 backdrop-blur-md border-gray-800/50 shadow-2xl",
  
  // Button styles
  button: "bg-gray-900/80 hover:bg-gray-800/90 border-gray-700/50 text-gray-200",
  buttonOutline: "bg-transparent hover:bg-gray-900/50 border-gray-700/50 text-gray-200",
  
  // Input/Select styles
  input: "bg-gray-900/50 border-gray-700/50 text-gray-200",
  
  // Separator
  separator: "bg-gray-800/50"
}

export const getPanelClassName = (additionalClasses = "") => {
  return `${panelTheme.panel} ${panelTheme.textPrimary} ${additionalClasses}`
}