# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Seoul City Data Visualization Project** - a sophisticated Next.js 15 application focused on interactive visualizations of Seoul's administrative districts, card sales data, floating population, and urban analytics using advanced WebGL-powered data layers.

## Essential Commands

### Development
```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Production build (runs particle generation first via prebuild)
npm run start        # Start production server
npm run lint         # Run Next.js linting
```

### Data Generation
```bash
npm run generate-particles  # Generate particle data for Seoul boundary visualization
```

## Architecture Overview

### Technology Stack
- **Framework**: Next.js 15.2.4 with App Router
- **Visualization**: Deck.gl 9.1.14 (WebGL layers), Mapbox GL 3.14.0 (maps)
- **Charts**: Recharts 2.15.4
- **Animation**: GSAP 3.13.0, Framer Motion 12.23.12
- **UI**: Radix UI + shadcn/ui components
- **Styling**: Tailwind CSS 3.4.17

### Directory Structure
```
├── app/                    # Next.js App Router pages
├── src/
│   ├── features/          # Feature-based modules
│   │   ├── home/         # Particle map visualization
│   │   ├── admin-districts/  # Administrative districts
│   │   ├── card-sales/   # 3D hexagon sales visualization
│   │   ├── floating-pop/ # Floating population
│   │   └── data-portal/  # Research portal
│   ├── shared/           # Reusable components
│   │   ├── components/charts/  # Chart library
│   │   ├── components/ui/      # shadcn/ui components
│   │   └── providers/          # Context providers
│   └── workers/          # Web Workers for heavy computations
├── public/data/          # Static data (GeoJSON, particles)
└── scripts/              # Build scripts
```

## Key Development Patterns

### Creating New Pages
1. Add page in `app/[page-name]/page.tsx`
2. Create feature module in `src/features/[feature-name]/`
3. Update navigation in `src/shared/components/layout/AppHeader.tsx`

### Working with Visualizations

#### Deck.gl Layers
- 3D visualizations use Deck.gl layers
- Key layers: HexagonLayer (card sales), ScatterplotLayer (particles)
- Layer configs in feature components (e.g., `HexagonLayer3D.tsx`)

#### Mapbox Integration
- Maps use React Map GL wrapper
- Mapbox token required (check env variables)
- Base map config in `src/shared/constants/mapConfig.ts`

#### Chart Components
- Reusable charts in `src/shared/components/charts/`
- Available: Line, Area, Bar, Pie, Radar, Heatmap, Composed, Scatter, Funnel, Treemap
- Usage: Import from `@/src/shared/components/charts`

### Data Management

#### Static Data
- GeoJSON files: `public/data/eda/` (Seoul boundaries)
- Particle data: `public/data/particles-*.json` (3 resolutions)
- Pre-processed: `public/data/processed_data/`

#### Web Workers
- Heavy computations offloaded to workers
- `particleWorker.ts`: Particle position calculations
- `geoJSONWorker.ts`: GeoJSON processing
- Use via hooks (e.g., `useParticleWorker.ts`)

### Performance Optimizations
- Particle data cached and preloaded
- Web Workers for CPU-intensive tasks
- Dynamic imports for heavy components
- Webpack chunk splitting for graphics libraries

## Common Tasks

### Adding Chart Visualizations
```typescript
// Import from shared charts
import { LineChart } from '@/src/shared/components/charts'

// Use with your data
<LineChart
  data={yourData}
  xDataKey="date"
  yDataKey="value"
  strokeColor="#3b82f6"
/>
```

### Creating 3D Visualizations
```typescript
// Use Deck.gl layers
import { HexagonLayer } from '@deck.gl/aggregation-layers'

// Configure layer
new HexagonLayer({
  id: 'hexagon-layer',
  data: yourData,
  getPosition: d => [d.lng, d.lat],
  // ... other props
})
```

### Working with Seoul Boundary Data
- Boundary files in `public/data/eda/`
  - `seoul_gu.geojson`: District boundaries
  - `seoul_dong.geojson`: Neighborhood boundaries
- Use `useGeoJSONWorker` hook for efficient loading

## TypeScript Configuration

### Path Aliases
```typescript
@/            // Root directory
@src/         // src directory
@features/    // src/features
@shared/      // src/shared
@workers/     // src/workers
```

### Strict Mode
TypeScript strict mode is enabled. Ensure:
- All variables have explicit types
- No implicit any
- Null checks required

## Important Conventions

### File Naming
- Components: PascalCase (e.g., `HomePage.tsx`)
- Utilities: camelCase (e.g., `particleGenerator.ts`)
- Hooks: use prefix (e.g., `useParticleAnimation.ts`)

### Component Organization
```
features/[feature]/
├── components/     # UI components
├── hooks/         # Custom hooks
├── utils/         # Utility functions
└── data/          # Static data/constants
```

### State Management
- Local state: useState/useReducer
- Global state: Context API via providers
- Animation state: GSAP/Framer Motion

## Environment Variables
Check for required environment variables:
- Mapbox access token (if using Mapbox)
- API endpoints (if connecting to backend)

## Known Issues & Workarounds

### No Testing Framework
Currently no testing setup. When adding tests:
- Consider Jest + React Testing Library for unit tests
- Playwright for E2E testing

### No ESLint/Prettier Config
Code formatting not enforced. Follow existing patterns:
- 2-space indentation
- Single quotes for imports
- Semicolons optional (be consistent)

### Build Considerations
- `npm run build` automatically generates particle data first
- Large particle files may take time to generate
- Check `next.config.mjs` for custom webpack configs

## Performance Tips

### Particle Animations
- Three resolution levels available (low/medium/high)
- Switch based on device performance
- Use `useParticleCache` hook for caching

### Map Rendering
- Limit GeoJSON feature count for performance
- Use clustering for point data
- Consider viewport culling for large datasets

### Chart Updates
- Memoize chart data transformations
- Use `useMemo` for expensive calculations
- Limit real-time update frequency

## Debugging

### Common Issues
1. **Particle animation lag**: Check resolution setting, use lower for mobile
2. **Map not loading**: Verify Mapbox token and network connectivity
3. **Chart rendering issues**: Check data format matches expected schema
4. **Build failures**: Run `npm run generate-particles` manually first

### Useful Debug Points
- Browser DevTools Performance tab for animation issues
- React DevTools for component re-renders
- Network tab for data loading issues
- Console for Web Worker messages