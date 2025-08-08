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
    unoptimized: true,
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
  },
  
  // Simplified webpack optimizations
  webpack: (config, { dev, isServer }) => {
    // Optimize for production builds
    if (!dev) {
      // Better tree shaking
      config.optimization.usedExports = true
      config.optimization.sideEffects = false
      
      // Chunk splitting optimization for key libraries
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          three: {
            test: /[\\/]node_modules[\\/](three|@deck\.gl)[\\/]/,
            name: 'three-libs',
            chunks: 'all',
            priority: 20,
          },
          mapbox: {
            test: /[\\/]node_modules[\\/](mapbox-gl|react-map-gl)[\\/]/,
            name: 'mapbox-libs',
            chunks: 'all',
            priority: 20,
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
