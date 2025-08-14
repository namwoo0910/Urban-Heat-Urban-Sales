"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { geoJSONLoader } from "@/utils/geojson-loader"
import TransitionLink from "./transition-link"

const projects = [
  {
    title: "카드매출",
    description: "카드 매출 데이터 시각화 및 분석.",
    imgSrc: "/images/seoul_economy.webp",
    imgSrcFallback: "/images/seoul_economy.png",
    href: "/research/local-economy",
  },
  {
    title: "유동인구",
    description: "서울시 유동인구 실시간 시각화.",
    imgSrc: "/images/seoul_pop.webp",
    imgSrcFallback: "/images/seoul_pop.png",
    href: "/research/floating-population",
  },
  {
    title: "행정구역 데이터",
    description: "탐색적 데이터 분석 및 인사이트 도출.",
    imgSrc: "/images/eda.webp",
    imgSrcFallback: "/images/eda.png",
    href: "/research/eda",
  },
]

export function Research() {
  const router = useRouter()

  // Smart prefetching for EDA visualization
  const handleEDAHover = () => {
    // Prefetch the EDA page
    router.prefetch('/research/eda')
    router.prefetch('/eda-visualization')
    
    // Preload heavy data files in background
    geoJSONLoader.preload([
      '/data/eda/gu.geojson',
      '/data/eda/dong.geojson',
      '/data/eda/ct.geojson'
    ]).catch(e => console.warn('Preload failed:', e))
  }

  return (
    <div id="research" className="relative min-h-screen px-4 sm:px-6 lg:px-8 pt-32">
      {/* Main title section with proper spacing for fixed header */}
      <div className="text-center mb-20">
        <h2 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">데이터로 보는 서울</h2>
        <p className="max-w-2xl mx-auto text-xl text-neutral-400">
          기후에 따른 서울시민 카드매출 및 유동인구 변화 분석/예측
        </p>
      </div>
      
      <div className="w-full pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[50px] max-w-7xl mx-auto">
          {projects.map((project, index) => (
            <motion.div
              key={project.title}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
            >
              <TransitionLink href={project.href}>
                <div 
                  className="group relative block w-full h-[500px] overflow-hidden rounded-lg shadow-lg"
                  onMouseEnter={project.title === "EDA" ? handleEDAHover : undefined}
                >
                  <Image
                    src={project.imgSrc || "/placeholder.svg"}
                    fill
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    quality={75}
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="absolute bottom-0 left-0 p-6 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                    <h3 className="text-2xl font-bold mb-2">{project.title}</h3>
                    <p className="text-neutral-300">{project.description}</p>
                  </div>
                </div>
              </TransitionLink>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}