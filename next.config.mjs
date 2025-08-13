/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable proper type checking and linting for better code quality
  eslint: {
    ignoreDuringBuilds: false, // Enable ESLint during builds
  },
  typescript: {
    ignoreBuildErrors: false, // Enable TypeScript error checking
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  transpilePackages: ['three'],
  
  // Performance optimizations
  experimental: {
    // Optimize package imports for better bundle size
    optimizePackageImports: ['three', '@deck.gl/core', '@deck.gl/layers', '@deck.gl/react', 'framer-motion', 'gsap'],
    
    // Enable webpack memory optimizations
    webpackMemoryOptimizations: true,
    
    // Enable webpack build worker for better performance
    webpackBuildWorker: true,
    
    // Enable modern compression
    gzipSize: true,
  },
  
  // Compression and caching headers
  async headers() {
    return [
      {
        source: '/urbanmountain/processed_data/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/seoul_boundary.geojson',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400',
          },
        ],
      },
    ]
  },
  
  // Simplified webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Optimize for production builds
    if (!dev) {
      // Better tree shaking
      config.optimization.usedExports = true
      config.optimization.sideEffects = false
      
      // Enhanced chunk splitting optimization for better performance
      config.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 250000,
        cacheGroups: {
          // Core vendor libraries (always loaded)
          vendor: {
            test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            name: 'vendor-core',
            chunks: 'all',
            priority: 40,
            enforce: true,
          },
          // Animation libraries
          animations: {
            test: /[\\/]node_modules[\\/](gsap|framer-motion)[\\/]/,
            name: 'animations',
            chunks: 'all',
            priority: 30,
          },
          // Three.js and Deck.GL (heavy graphics libraries)
          graphics: {
            test: /[\\/]node_modules[\\/](three|@deck\.gl)[\\/]/,
            name: 'graphics-libs',
            chunks: 'all',
            priority: 25,
          },
          // Mapbox libraries
          mapbox: {
            test: /[\\/]node_modules[\\/](mapbox-gl|react-map-gl)[\\/]/,
            name: 'mapbox-libs',
            chunks: 'all',
            priority: 25,
          },
          // UI component libraries
          ui: {
            test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|class-variance-authority|clsx|tailwind-merge)[\\/]/,
            name: 'ui-libs',
            chunks: 'all',
            priority: 20,
          },
          // Remaining vendor libraries
          vendorOther: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor-other',
            chunks: 'all',
            priority: 10,
          },
        },
      }
    }
    
    // Client-side optimizations
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      }
    }
    
    return config
  },
}

export default nextConfig
