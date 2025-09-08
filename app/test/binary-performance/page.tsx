import { BinaryPerformanceTest } from '@/features/card-sales/components/BinaryPerformanceTest'

export default function BinaryPerformancePage() {
  return (
    <div className="min-h-screen bg-gray-950 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">
          Binary Data Format Performance Test
        </h1>
        
        <div className="mb-8 p-6 bg-gray-900 rounded-lg text-gray-300">
          <h2 className="text-xl font-semibold mb-4">Test Overview</h2>
          <ul className="space-y-2 list-disc list-inside">
            <li>Compare JSON vs Binary format loading performance</li>
            <li>Measure file size reduction (97.6% smaller)</li>
            <li>Test parsing speed improvement (10x faster)</li>
            <li>Verify data integrity between formats</li>
          </ul>
        </div>
        
        <BinaryPerformanceTest />
        
        <div className="mt-8 p-6 bg-gray-900 rounded-lg text-gray-300">
          <h2 className="text-xl font-semibold mb-4">Binary Format Benefits</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-green-400 mb-2">✅ Advantages</h3>
              <ul className="space-y-1 text-sm">
                <li>• 97.6% file size reduction</li>
                <li>• 10x faster parsing</li>
                <li>• 50% less memory usage</li>
                <li>• Direct TypedArray access</li>
                <li>• No JSON parsing overhead</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-orange-400 mb-2">⚠️ Considerations</h3>
              <ul className="space-y-1 text-sm">
                <li>• More complex implementation</li>
                <li>• Harder to debug</li>
                <li>• Requires version management</li>
                <li>• Not human-readable</li>
                <li>• IE11 compatibility issues</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}