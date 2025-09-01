# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Seoul City Data Visualization Project** - Interactive 3D visualizations of Seoul's administrative districts, card sales data, and urban analytics using WebGL-powered layers.

**Tech Stack**: Next.js 15.2.4 (App Router) + TypeScript + Deck.gl + Mapbox GL + Recharts + GSAP

## Essential Commands

```bash
npm run dev          # Start dev server (http://localhost:3000) - USER RUNS THIS MANUALLY
npm run build        # Production build (auto-runs particle generation)
npm run lint         # Run Next.js linting
npm run generate-particles  # Generate particle boundary data
```

**Important**: Claude should NOT run `npm run dev`. The user will run the dev server manually. Claude should complete all code changes and provide a summary of what was done.

## Architecture & Key Patterns

### Data Flow Architecture

```
GeoJSON Data (public/data/eda/) 
    ↓
Web Workers (geoJSONWorker.ts) → Process boundaries & calculate heights
    ↓
3D Data Structure (dongData3D/sggData3D) → Enhanced with sales metrics
    ↓
Deck.gl Layers (PolygonLayer/HexagonLayer) → GPU-accelerated rendering
    ↓
Interactive Visualizations with tooltips & selection states
```

### Layer Management Pattern

The project uses a hybrid approach combining Mapbox GL base layers with Deck.gl overlay layers:

1. **Base Map**: Mapbox GL provides the map tiles and 2D district boundaries
2. **3D Overlays**: Deck.gl PolygonLayer/HexagonLayer for 3D visualizations
3. **Layer Manager**: `LayerManager.tsx` orchestrates multiple layer types
4. **Selection State**: Coordinated through filter panels and map interactions

### Critical Files for 3D Visualization

- `src/features/card-sales/components/HexagonLayer3D.tsx` - Main 3D visualization component
  - Lines 624-780: `createDong3DPolygonLayers` - Deck.gl PolygonLayer configuration
  - Lines 781-820: `deckLayers` useMemo - Layer composition logic
  - Lines 1650-1750: District selection & zoom logic

- `src/shared/utils/district3DUtils.ts` - Color gradients and height calculations
- `src/features/card-sales/components/LayerManager.tsx` - Multi-layer orchestration

### State Management Pattern

```typescript
// Filter state flow
LocalEconomyFilterPanel → Updates selection states (selectedGu, selectedDong)
    ↓
HexagonLayer3D → Reacts to selection changes
    ↓
PolygonLayer updateTriggers → Re-renders with new colors/heights
```

### Performance Optimizations

1. **Web Workers**: Heavy GeoJSON processing offloaded to workers
2. **Data Caching**: `useParticleCache` hook prevents redundant loads  
3. **Layer Memoization**: `useMemo` prevents unnecessary layer recreations
4. **Viewport Culling**: Only render visible districts in 3D mode

## Common Development Tasks

### Adding New 3D Layer Types

1. Import layer from `@deck.gl/layers` or `@deck.gl/aggregation-layers`
2. Create layer instance in `createDong3DPolygonLayers` or similar function
3. Add to `deckLayers` array with conditional rendering logic
4. Update `updateTriggers` for reactive updates

### Modifying District Colors

Edit color gradients in:
- `src/shared/utils/district3DUtils.ts` - Mapbox expressions
- `HexagonLayer3D.tsx` line 48 - `convertColorExpressionToRGB` function

Theme keys: 'blue', 'green', 'purple', 'orange', 'bright'

### Fixing Tooltip Issues

Tooltips require:
1. Layer must have `pickable: true`
2. Implement `onHover` callback with `setHoveredFeature`
3. For Deck.gl layers, use layer's built-in picking
4. For Mapbox layers, use React Map GL's `onMouseMove`

### Working with Sales Data

Sales data mapping:
```typescript
dongSalesMap: Map<number, number>  // dong_code → total_sales
dongSalesByTypeMap: Map<number, Map<string, number>>  // dong_code → business_type → sales
```

Data files: `public/data/processed_data/card_sales_*.json`

### Debugging 3D Rendering

1. Check console for layer initialization logs
2. Verify `is3DMode` state in React DevTools
3. Inspect `dongData3D` for proper height values
4. Use browser DevTools Performance tab for GPU issues

## TypeScript Path Aliases

```typescript
@/            // Project root
@src/         // src directory  
@features/    // src/features
@shared/      // src/shared
@workers/     // src/workers
```

## Critical Dependencies & Versions

- **Deck.gl**: 9.1.14 - All @deck.gl/* packages must match versions
- **Mapbox GL**: 3.14.0 - Requires access token for map tiles
- **React Map GL**: 7.1.9 - React wrapper for Mapbox
- **Next.js**: 15.2.4 - Using App Router, not Pages Router

## Known Issues & Solutions

### Issue: "Cannot access before initialization" errors
**Solution**: Ensure functions are defined before being used in dependency arrays

### Issue: 3D layers not showing
**Check**: 
1. `is3DMode` state is true
2. `dongData3D` is loaded (not null)
3. Layer visibility in Mapbox style

### Issue: Hover tooltips not working
**Solution**: Migrate from Mapbox fill-extrusion to Deck.gl PolygonLayer for proper picking support

### Issue: Performance degradation with many layers
**Solution**: Use `updateTriggers` to limit re-renders, implement viewport culling

## Data File Locations

- **District Boundaries**: `public/data/eda/seoul_gu.geojson`, `seoul_dong.geojson`
- **Sales Data**: `public/data/processed_data/card_sales_202401.json`
- **Particle Data**: `public/data/particles-[low|medium|high].json`
- **3D Heights**: Calculated dynamically from sales data in `district3DUtils.ts`

## Testing Approach

No formal testing framework currently. Manual testing checklist:
1. District selection (구/동) updates visualization
2. Theme switching changes colors
3. Tooltips show on hover
4. Zoom animations work smoothly
5. Filter panel syncs with map selection