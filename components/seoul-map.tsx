"use client"

import { useEffect, useRef, useState } from "react"
import mapboxgl from "mapbox-gl"
import "mapbox-gl/dist/mapbox-gl.css"

// Mapbox access token from environment variable
const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1IjoieXN1MTUxNiIsImEiOiJjbWRyMHR2bTQwOTB2MmlzOGdlZmFldnVnIn0.Rv_I_4s0u88CYd7r9JbZDA"

export function SeoulMap() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 서울 좌표
  const SEOUL_COORDINATES: [number, number] = [126.978, 37.5665]

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    // Mapbox access token 설정
    mapboxgl.accessToken = MAPBOX_TOKEN
    
    console.log("🗺️ Mapbox token 설정 완료")
    console.log("🎯 컨테이너 요소:", mapContainer.current)

    try {
      // 지도 초기화
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/dark-v11", // 다크 테마 사용
        center: SEOUL_COORDINATES,
        zoom: 11,
        pitch: 45, // 3D 효과를 위한 기울기
        bearing: 0,
        antialias: true,
      })

      // 지도 로드 완료 후 실행
      map.current.on("load", () => {
        console.log("✅ Mapbox 지도가 성공적으로 로드되었습니다!")
        setIsLoading(false)
        
        // 서울 주요 지점들에 마커 추가 (테스트용)
        const seoulLandmarks = [
          { name: "남산타워", coordinates: [126.9882, 37.5512] },
          { name: "경복궁", coordinates: [126.977, 37.5796] },
          { name: "강남역", coordinates: [127.0276, 37.4979] },
        ]

        seoulLandmarks.forEach((landmark) => {
          new mapboxgl.Marker({
            color: "#3b82f6",
            scale: 0.8,
          })
            .setLngLat(landmark.coordinates as [number, number])
            .addTo(map.current!)
        })
      })

      // 에러 핸들링
      map.current.on("error", (e) => {
        console.error("❌ Mapbox 에러:", e)
        setError(`지도 로드 중 오류: ${e.error?.message || '알 수 없는 오류'}`)
        setIsLoading(false)
      })
    } catch (err) {
      console.error("❌ 지도 초기화 실패:", err)
      setError(`지도 초기화 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`)
      setIsLoading(false)
    }

    // 지도 컨트롤 추가
    if (map.current) {
      map.current.addControl(new mapboxgl.NavigationControl(), "bottom-right")
    }

    // 정리 함수
    return () => {
      map.current?.remove()
    }
  }, [])

  return (
    <div className="relative w-full h-screen">
      <div ref={mapContainer} className="w-full h-full" />
      
      {/* 로딩 상태 */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <div className="text-white text-xl">지도 로딩 중...</div>
        </div>
      )}
      
      {/* 에러 상태 */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <div className="text-red-500 text-xl bg-black/80 p-4 rounded">
            {error}
          </div>
        </div>
      )}
      
      {/* 서울 정보 패널 */}
      <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-md rounded-lg border border-white/20 p-4 text-white z-10">
        <h3 className="font-bold text-lg mb-2">서울 지도 테스트</h3>
        <div className="text-sm text-white/80">
          📍 좌표: {SEOUL_COORDINATES[1].toFixed(4)}°N, {SEOUL_COORDINATES[0].toFixed(4)}°E
        </div>
        <div className="text-xs text-white/60 mt-2">
          Token: {MAPBOX_TOKEN ? '✅ 설정됨' : '❌ 없음'}
        </div>
      </div>
    </div>
  )
}