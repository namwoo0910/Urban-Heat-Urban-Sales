"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { geoJSONLoader } from "@/src/shared/utils/geoJSONLoader"
import TransitionLink from "@/src/shared/components/navigation/TransitionLink"

const projects = [
  {
    title: "온도와 매출 x AI",
    description: "기온에 따른 매출 변화를 체험하세요.",
    imgSrc: "/images/seoul_economy.webp",
    href: "/research/local-economy",
  },
  {
    title: "우리 동네 x BigData",
    description: "자치구, 행정동별 데이터를 탐색하세요.",
    imgSrc: "/images/eda.webp",
    href: "/research/eda",
  },
]

export function Research() {
  const router = useRouter()

  // Prefetch pages on hover
  const handleEDAHover = () => {
    router.prefetch('/research/eda')
  }

  const handleLocalEconomyHover = () => {
    router.prefetch('/research/local-economy')

    geoJSONLoader
      .preload(['/data/local_economy/local_economy_dong.geojson'])
      .catch(e => console.warn('Preload failed:', e))
  }

  const hoverHandlers: Record<string, () => void> = {
    '/research/eda': handleEDAHover,
    '/research/local-economy': handleLocalEconomyHover,
  }

  return (
    <div id="research" className="relative h-screen px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      {/* Main title section with proper spacing for fixed header */}
      <div className="text-center mb-12">
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">데이터로 보는 서울</h2>
        <p className="max-w-2xl mx-auto text-lg text-neutral-400">
          기후에 따른 서울시민 카드매출 변화 분석/예측
        </p>
      </div>

      <div className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[50px] max-w-5xl mx-auto">
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
                  className="group relative block w-full h-[400px] overflow-hidden rounded-lg shadow-lg"
                  onMouseEnter={hoverHandlers[project.href]}
                >
                  <Image
                    src={project.imgSrc}
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
