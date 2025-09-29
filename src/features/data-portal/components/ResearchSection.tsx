"use client"

import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { geoJSONLoader } from "@/src/shared/utils/geoJSONLoader"
import TransitionLink from "@/src/shared/components/navigation/TransitionLink"
import { useTranslation } from "@/src/shared/hooks/useTranslation"

export function Research() {
  const router = useRouter()
  const { t } = useTranslation()

  const projects = [
    {
      title: t('researchModal.visualsAndSound'),
      href: "/research/local-economy",
    },
    {
      title: t('researchModal.tempImpact'),
      href: "/research/prediction",
    },
    {
      title: t('researchModal.zoomingLocal'),
      href: "/research/eda",
    },
  ]

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

  const handleAIPredictionHover = () => {
    router.prefetch('/research/prediction')
  }

  const hoverHandlers: Record<string, () => void> = {
    '/research/eda': handleEDAHover,
    '/research/local-economy': handleLocalEconomyHover,
    '/research/prediction': handleAIPredictionHover,
  }

  return (
    <div id="research" className="relative h-screen px-4 sm:px-6 lg:px-8 flex flex-col justify-center -translate-y-24">
      {/* Main title section with proper spacing for fixed header */}
      <div className="text-center mb-6">
        <h2 className="text-6xl font-bold mb-4 text-white">
          {t('researchModal.selectOption')}
        </h2>

      </div>

      <div className="w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-[30px] max-w-7xl mx-auto">
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
                  className="group relative block w-full h-[400px] overflow-hidden rounded-2xl shadow-2xl border border-white/10 backdrop-blur-sm bg-gradient-to-br from-slate-800/60 to-purple-900/40 hover:shadow-purple-500/20 transition-all duration-500 hover:scale-[1.02] hover:border-purple-500/30 flex items-center justify-center"
                  onMouseEnter={hoverHandlers[project.href]}
                >
                  <div className="text-center p-6">
                    <h3 className="text-3xl font-bold text-white group-hover:text-cyan-300 transition-colors duration-500">
                      {project.title}
                    </h3>
                  </div>
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-white/20 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-white text-xl">→</span>
                    </div>
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
