"use client"

import React, { useState } from 'react'
import { useBinaryOptimizedData, compareBinaryVsJsonPerformance } from '../hooks/useBinaryOptimizedData'
import { useOptimizedMonthlyData } from '../hooks/useOptimizedMonthlyData'

export function BinaryPerformanceTest() {
  const [selectedDate] = useState('2024-01-15')
  const [showComparison, setShowComparison] = useState(false)
  const [comparisonResults, setComparisonResults] = useState<any>(null)
  const [isComparing, setIsComparing] = useState(false)
  
  // Load with JSON (existing method)
  const jsonData = useOptimizedMonthlyData({
    selectedDate,
    enabled: showComparison
  })
  
  // Load with Binary (new method)
  const binaryData = useBinaryOptimizedData({
    selectedDate,
    enabled: showComparison,
    useBinary: true
  })
  
  const runComparison = async () => {
    setIsComparing(true)
    setShowComparison(true)
    
    try {
      const results = await compareBinaryVsJsonPerformance(selectedDate)
      setComparisonResults(results)
    } catch (error) {
      console.error('Comparison failed:', error)
    } finally {
      setIsComparing(false)
    }
  }
  
  return (
    <div className="p-6 bg-gray-900 text-white rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Binary vs JSON Performance Test</h2>
      
      <button
        onClick={runComparison}
        disabled={isComparing}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
      >
        {isComparing ? 'Running Test...' : 'Run Performance Comparison'}
      </button>
      
      {showComparison && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* JSON Performance */}
            <div className="p-4 bg-gray-800 rounded">
              <h3 className="text-lg font-semibold text-blue-400 mb-2">JSON Format</h3>
              <div className="space-y-2 text-sm">
                <div>Status: {jsonData.isLoading ? '⏳ Loading...' : '✅ Loaded'}</div>
                <div>Features: {jsonData.features?.length || 0}</div>
                {jsonData.error && <div className="text-red-400">Error: {jsonData.error}</div>}
              </div>
            </div>
            
            {/* Binary Performance */}
            <div className="p-4 bg-gray-800 rounded">
              <h3 className="text-lg font-semibold text-green-400 mb-2">Binary Format</h3>
              <div className="space-y-2 text-sm">
                <div>Status: {binaryData.isLoading ? '⏳ Loading...' : '✅ Loaded'}</div>
                <div>Features: {binaryData.features?.length || 0}</div>
                {binaryData.loadingStats && (
                  <>
                    <div>Geometry Load: {binaryData.loadingStats.geometryLoadTime.toFixed(2)}ms</div>
                    <div>Monthly Load: {binaryData.loadingStats.monthlyLoadTime.toFixed(2)}ms</div>
                    <div>Parse Time: {binaryData.loadingStats.parseTime.toFixed(2)}ms</div>
                    <div>Total: {binaryData.loadingStats.totalTime.toFixed(2)}ms</div>
                  </>
                )}
                {binaryData.error && <div className="text-red-400">Error: {binaryData.error}</div>}
              </div>
            </div>
          </div>
          
          {/* Comparison Results */}
          {comparisonResults && (
            <div className="p-4 bg-gray-800 rounded">
              <h3 className="text-lg font-semibold text-yellow-400 mb-2">Comparison Results</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-medium">Load Time</div>
                  <div>JSON: {comparisonResults.json.loadTime.toFixed(2)}ms</div>
                  <div>Binary: {comparisonResults.binary.loadTime.toFixed(2)}ms</div>
                  <div className="text-green-400">
                    Improvement: {comparisonResults.improvement.loadTime}
                  </div>
                </div>
                
                <div>
                  <div className="font-medium">Parse Time</div>
                  <div>JSON: Built-in</div>
                  <div>Binary: {comparisonResults.binary.parseTime.toFixed(2)}ms</div>
                </div>
                
                <div>
                  <div className="font-medium">File Size</div>
                  <div>JSON: {(comparisonResults.json.size / 1024 / 1024).toFixed(2)} MB</div>
                  <div>Binary: {(comparisonResults.binary.size / 1024 / 1024).toFixed(2)} MB</div>
                  <div className="text-green-400">
                    Reduction: {comparisonResults.improvement.size}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Data Sample */}
          {(jsonData.features || binaryData.features) && (
            <div className="p-4 bg-gray-800 rounded">
              <h3 className="text-lg font-semibold mb-2">Data Sample (First 3 Dongs)</h3>
              <div className="space-y-2 text-xs font-mono">
                {(binaryData.features || jsonData.features)?.slice(0, 3).map(feature => (
                  <div key={feature.dongCode} className="p-2 bg-gray-700 rounded">
                    <div>동코드: {feature.dongCode} | {feature.dongName}</div>
                    <div>매출: {feature.formattedSales} | 높이: {feature.height.toFixed(2)}</div>
                    <div>순위: {feature.rank}위 | 백분위: {feature.percentile}%</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}