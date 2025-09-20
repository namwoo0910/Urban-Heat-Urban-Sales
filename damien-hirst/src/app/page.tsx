"use client";

import React, { useState, useCallback, useMemo } from 'react';

// 타입 정의
interface DataPoint {
  region: string;
  values: (number | null)[];
}

interface ParsedData {
  headers: string[];
  data: DataPoint[];
}

interface HoverInfo {
  region: string;
  category: string;
  value: number | null;
  position: { row: number; col: number };
}

// CSV 파싱 유틸리티
const parseCSVData = (csvText: string): ParsedData => {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').slice(1); // 첫 번째 열(지역명) 제외
  const data: DataPoint[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',');
    const row: (number | null)[] = [];
    
    for (let j = 1; j < values.length; j++) {
      const value = values[j];
      if (value === '' || value === 'NaN' || value === 'null') {
        row.push(null);
      } else {
        const numValue = parseFloat(value);
        row.push(isNaN(numValue) ? null : numValue);
      }
    }
    
    data.push({
      region: values[0],
      values: row
    });
  }
  
  return { headers, data };
};

// 색상 유틸리티 (Quantile 기반)
const getColorFromQuantile = (value: number | null, quantiles: number[]): string => {
  if (value === null || value === undefined) {
    return '#e5e7eb';
  }
  
  // 10가지 색상 팔레트 (데미안 허스트 스타일)
  const colors = [
    [147, 51, 234],  // 보라 (0-10%)
    [59, 130, 246],  // 파랑 (10-20%)
    [14, 165, 233],  // 하늘색 (20-30%)
    [6, 182, 212],   // 청록 (30-40%)
    [20, 184, 166],  // 틸 (40-50%)
    [34, 197, 94],   // 녹색 (50-60%)
    [132, 204, 22],  // 라임 (60-70%)
    [234, 179, 8],   // 노랑 (70-80%)
    [251, 146, 60],  // 주황 (80-90%)
    [239, 68, 68],   // 빨강 (90-100%)
  ];
  
  // quantile 인덱스 찾기
  let quantileIndex = 0;
  for (let i = 0; i < quantiles.length; i++) {
    if (value <= quantiles[i]) {
      quantileIndex = i;
      break;
    }
  }
  
  // 마지막 quantile을 초과하는 경우
  if (quantileIndex >= colors.length) {
    quantileIndex = colors.length - 1;
  }
  
  const [r, g, b] = colors[quantileIndex];
  return `rgb(${r}, ${g}, ${b})`;
};

// Quantile 계산 함수
const calculateQuantiles = (values: number[], numQuantiles: number = 10): number[] => {
  const sortedValues = [...values].sort((a, b) => a - b);
  const quantiles: number[] = [];
  
  for (let i = 1; i <= numQuantiles; i++) {
    const index = Math.ceil((i / numQuantiles) * sortedValues.length) - 1;
    quantiles.push(sortedValues[Math.min(index, sortedValues.length - 1)]);
  }
  
  return quantiles;
};

// 파일 업로드 컴포넌트
const FileUploader: React.FC<{ onDataLoad: (data: ParsedData) => void }> = ({ onDataLoad }) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const csvText = e.target?.result as string;
        const parsedData = parseCSVData(csvText);
        onDataLoad(parsedData);
        console.log(`데이터 로드 완료: ${parsedData.data.length}개 행, ${parsedData.headers.length}개 열`);
      } catch (error) {
        alert('파일 읽기 오류: ' + (error as Error).message);
        console.error('파일 파싱 오류:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    reader.onerror = () => {
      alert('파일 읽기에 실패했습니다.');
      setIsLoading(false);
    };
    
    reader.readAsText(file, 'utf-8');
  }, [onDataLoad]);
  
  return (
    <div className="upload-section">
      <input
        type="file"
        accept=".txt,.csv"
        onChange={handleFileUpload}
        className="hidden"
        id="file-input"
      />
      <label
        htmlFor="file-input"
        className="upload-btn"
      >
        {isLoading ? '로딩 중...' : 'CSV/TXT 파일 업로드'}
      </label>
      <div className="upload-info">
        CSV 또는 TXT 파일을 선택하세요 (첫 행은 헤더)
      </div>
      
      <style jsx>{`
        .upload-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          margin-bottom: 30px;
          padding: 30px;
          background: #f8f9fa;
          border-radius: 10px;
          border: 2px dashed #e5e7eb;
        }
        
        .upload-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .upload-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }
        
        .upload-info {
          font-size: 14px;
          color: #666;
          text-align: center;
        }
        
        .hidden {
          display: none;
        }
      `}</style>
    </div>
  );
};

// 컬러 레전드 컴포넌트 (Quantile 기반으로 수정)
const ColorLegend: React.FC<{ quantiles: number[]; missingCount: number }> = ({ quantiles, missingCount }) => {
  const safeQuantiles = quantiles && quantiles.length >= 10 ? quantiles : [];
  
  return (
    <div className="legend">
      <div className="legend-gradient-container">
        <div className="legend-gradient" />
        <div className="legend-labels">
          <span>{safeQuantiles[0]?.toFixed(1) || 'N/A'}</span>
          <span>Q5: {safeQuantiles[4]?.toFixed(1) || 'N/A'}</span>
          <span>{safeQuantiles[9]?.toFixed(1) || 'N/A'}</span>
        </div>
        <div className="quantile-info">
          각 색상은 전체 데이터의 10%씩 표현 (10분위수 기반)
        </div>
      </div>
      <div className="missing-legend">
        <div className="missing-dot" />
        <span>결측값 ({missingCount}개)</span>
      </div>
      
      <style jsx>{`
        .legend {
          display: flex;
          align-items: center;
          gap: 30px;
          margin-top: 20px;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
          justify-content: center;
        }
        
        .legend-gradient-container {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .legend-gradient {
          width: 200px;
          height: 20px;
          border-radius: 10px;
          background: linear-gradient(to right, 
            rgb(147, 51, 234),
            rgb(59, 130, 246),
            rgb(14, 165, 233),
            rgb(6, 182, 212),
            rgb(20, 184, 166),
            rgb(34, 197, 94),
            rgb(132, 204, 22),
            rgb(234, 179, 8),
            rgb(251, 146, 60),
            rgb(239, 68, 68));
        }
        
        .legend-labels {
          display: flex;
          justify-content: space-between;
          width: 200px;
          font-size: 12px;
          color: #666;
          margin-top: 5px;
        }
        
        .quantile-info {
          font-size: 10px;
          color: #888;
          margin-top: 3px;
          text-align: center;
        }
        
        .missing-legend {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #666;
        }
        
        .missing-dot {
          width: 16px;
          height: 16px;
          background: #e5e7eb;
          border-radius: 50%;
          border: 1px solid #d1d5db;
        }
      `}</style>
    </div>
  );
};

// 정보 패널 컴포넌트
const InfoPanel: React.FC<{ hoverInfo: HoverInfo | null }> = ({ hoverInfo }) => {
  if (!hoverInfo) return null;
  
  return (
    <div className="info-panel">
      <strong>{hoverInfo.region}</strong><br />
      카테고리: {hoverInfo.category}<br />
      값: {hoverInfo.value === null ? '결측값' : hoverInfo.value.toFixed(4)}<br />
      위치: ({hoverInfo.position.row + 1}, {hoverInfo.position.col + 1})
      
      <style jsx>{`
        .info-panel {
          position: fixed;
          top: 20px;
          right: 20px;
          background: rgba(0,0,0,0.8);
          color: white;
          padding: 12px;
          border-radius: 8px;
          z-index: 1000;
          font-size: 12px;
          max-width: 250px;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};

// 데이터 그리드 컴포넌트 (원형 레이아웃)
const DataGrid: React.FC<{ data: ParsedData }> = ({ data }) => {
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  
  // 데이터 통계 계산 (Quantile 기반으로 수정)
  const stats = useMemo(() => {
    const allValues: number[] = [];
    let missingCount = 0;
    let totalCount = 0;
    
    data.data.forEach(row => {
      row.values.forEach(value => {
        totalCount++;
        if (value === null || isNaN(value as number)) {
          missingCount++;
        } else {
          allValues.push(value as number);
        }
      });
    });
    
    // 유효한 값이 없는 경우 기본값 반환
    if (allValues.length === 0) {
      return {
        min: 0,
        max: 0,
        quantiles: [],
        totalCount,
        missingCount,
        validCount: 0
      };
    }
    
    // Quantiles 계산
    const quantiles = calculateQuantiles(allValues, 10);
    
    return {
      min: Math.min(...allValues),
      max: Math.max(...allValues),
      quantiles,
      totalCount,
      missingCount,
      validCount: totalCount - missingCount
    };
  }, [data]);
  
  const handleMouseEnter = useCallback((rowIndex: number, colIndex: number, value: number | null) => {
    setHoverInfo({
      region: data.data[rowIndex].region,
      category: data.headers[colIndex],
      value,
      position: { row: rowIndex, col: colIndex }
    });
  }, [data]);
  
  const handleMouseLeave = useCallback(() => {
    setHoverInfo(null);
  }, []);
  
  // 원형 레이아웃을 위한 위치 계산 (간격 더욱 줄임)
  const calculatePosition = (regionIndex: number, categoryIndex: number, containerSize: number) => {
    const numRegions = data.data.length;
    const numCategories = data.headers.length;
    
    // 각 지역의 각도 (360도를 지역 수로 나누기)
    const anglePerRegion = (2 * Math.PI) / numRegions;
    const angle = regionIndex * anglePerRegion - Math.PI / 2; // -90도에서 시작 (12시 방향)
    
    // 간격을 더욱 줄인 반지름 계산
    const minRadius = containerSize * 0.18; // 중앙 레전드 공간 확보
    const maxRadius = containerSize * 0.32; // 더욱 밀집
    const radius = minRadius + (categoryIndex * (maxRadius - minRadius)) / (numCategories - 1);
    
    // 원형 좌표계를 직교 좌표계로 변환
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    
    return { x, y };
  };
  
  // 반응형 컨테이너 사이즈 계산 (대폭 확대)
  const containerSize = useMemo(() => {
    const numRegions = data.data.length;
    const numCategories = data.headers.length;
    
    // 도트 간 최소 간격을 보장하기 위한 계산
    const minDotSpacing = 25; // 도트 간 최소 간격
    const maxRadius = 400; // 최대 반지름
    const circumference = 2 * Math.PI * maxRadius;
    const requiredSpacing = numRegions * minDotSpacing;
    
    // 필요한 반지름 계산
    const calculatedRadius = Math.max(maxRadius, requiredSpacing / (2 * Math.PI));
    const calculatedSize = calculatedRadius * 2.2; // 여유 공간 포함
    
    // 화면 크기 고려하되 충분한 공간 보장
    const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1400;
    const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1000;
    const maxScreenSize = Math.min(screenWidth * 0.9, screenHeight * 0.9);
    
    return Math.min(Math.max(800, calculatedSize), 1800); // 최소 800px, 최대 1800px
  }, [data.data.length]);
  
  // 동심원별 도트 크기 계산
  const getDotSize = (categoryIndex: number) => {
    const numCategories = data.headers.length;
    const minDotSize = dotSize * 0.6; // 최소 크기 (안쪽 원)
    const maxDotSize = dotSize * 1.4; // 최대 크기 (바깥쪽 원)
    
    // 카테고리 인덱스에 따라 선형적으로 크기 증가
    const sizeRatio = categoryIndex / (numCategories - 1);
    return minDotSize + (maxDotSize - minDotSize) * sizeRatio;
  };
  
  // 반응형 도트 크기 계산 (기본 크기)
  const dotSize = useMemo(() => {
    const numRegions = data.data.length;
    const maxRadius = containerSize * 0.42;
    const circumference = 2 * Math.PI * maxRadius;
    const availableSpacePerDot = circumference / numRegions;
    
    // 도트 크기는 사용 가능한 공간의 50%로 제한 (크기 변화 고려)
    const calculatedDotSize = Math.min(availableSpacePerDot * 0.5, 16);
    return Math.max(6, calculatedDotSize); // 최소 6px 보장
  }, [containerSize, data.data.length]);
  
  const centerOffset = containerSize / 2;
  
  return (
    <div className="grid-container">
      <div className="circular-grid" style={{ width: containerSize, height: containerSize }}>
        {/* 중앙 컬러 레전드 */}
        <div 
          className="center-legend" 
          style={{
            left: centerOffset - 140,
            top: centerOffset - 80,
            width: 280,
            height: 160
          }}
        >
          <div className="center-legend-title">
            총 데이터: {stats.totalCount}개 | 행정동: 426개 | 업종: 15개
          </div>
          <div className="center-legend-subtitle">
            폭염시 행정동 및 업종별 매출 민감 지수
          </div>
          <div className="center-legend-gradient" />
          <div className="center-legend-labels">
            <span>{stats.quantiles[0]?.toFixed(1) || 'N/A'}</span>
            <span>Q5: {stats.quantiles[4]?.toFixed(1) || 'N/A'}</span>
            <span>{stats.quantiles[9]?.toFixed(1) || 'N/A'}</span>
          </div>
          <div className="center-legend-info">
            각 색상: 전체 데이터의 10%씩 표현 (10분위수 기반)
          </div>
          <div className="center-legend-description">
            방사형 축: 행정동별 | 동심원: 업종별
          </div>
        </div>
        
        {/* 데이터 포인트들 */}
        {data.data.map((row, rowIndex) =>
          row.values.map((value, colIndex) => {
            const { x, y } = calculatePosition(rowIndex, colIndex, containerSize);
            const currentDotSize = getDotSize(colIndex);
            return (
              <div
                key={`${rowIndex}-${colIndex}`}
                className="dot"
                style={{
                  backgroundColor: value === null ? '#e5e7eb' : getColorFromQuantile(value, stats.quantiles),
                  left: centerOffset + x - currentDotSize / 2,
                  top: centerOffset + y - currentDotSize / 2,
                  width: currentDotSize,
                  height: currentDotSize,
                  position: 'absolute'
                }}
                onMouseEnter={() => handleMouseEnter(rowIndex, colIndex, value)}
                onMouseLeave={handleMouseLeave}
              />
            );
          })
        )}
      </div>
      
      <InfoPanel hoverInfo={hoverInfo} />
      
      <style jsx>{`
        .grid-container {
          background: white;
          padding: 20px;
          border-radius: 10px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          overflow: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          max-height: 90vh;
        }
        
        .circular-grid {
          position: relative;
          margin: 20px;
          background: radial-gradient(circle, rgba(0,0,0,0.01) 1px, transparent 1px);
          background-size: 30px 30px;
          border-radius: 50%;
          border: 1px dashed rgba(0,0,0,0.1);
        }
        
        .center-legend {
          position: absolute;
          background: rgba(255, 255, 255, 0.95);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          color: #333;
          line-height: 1.4;
          text-align: center;
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          padding: 20px;
          backdrop-filter: blur(10px);
        }
        
        .center-legend-title {
          font-weight: bold;
          font-size: 12px;
          color: #555;
          margin-bottom: 6px;
          line-height: 1.3;
        }
        
        .center-legend-subtitle {
          font-weight: 600;
          font-size: 14px;
          color: #333;
          margin-bottom: 12px;
          line-height: 1.2;
        }
        
        .center-legend-gradient {
          width: 120px;
          height: 16px;
          border-radius: 8px;
          background: linear-gradient(to right, 
            rgb(147, 51, 234),
            rgb(59, 130, 246),
            rgb(14, 165, 233),
            rgb(6, 182, 212),
            rgb(20, 184, 166),
            rgb(34, 197, 94),
            rgb(132, 204, 22),
            rgb(234, 179, 8),
            rgb(251, 146, 60),
            rgb(239, 68, 68));
          margin-bottom: 6px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .center-legend-labels {
          display: flex;
          justify-content: space-between;
          width: 120px;
          font-size: 10px;
          color: #666;
          margin-bottom: 10px;
          font-weight: 500;
        }
        
        .center-legend-info {
          font-size: 10px;
          color: #777;
          line-height: 1.3;
          margin-bottom: 8px;
        }
        
        .center-legend-description {
          font-size: 11px;
          color: #666;
          line-height: 1.3;
          font-weight: 500;
        }
        
        .dot {
          border-radius: 50%;
          transition: all 0.3s ease;
          cursor: pointer;
          border: 1px solid rgba(255,255,255,0.3);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .dot:hover {
          transform: scale(1.4);
          z-index: 10;
          box-shadow: 0 6px 20px rgba(0,0,0,0.4);
        }
        
        .stats {
          display: flex;
          gap: 20px;
          margin-top: 15px;
          font-size: 14px;
          color: #666;
          justify-content: center;
          flex-wrap: wrap;
        }
      `}</style>
    </div>
  );
};

// 메인 컴포넌트
const DamienHirstDataVisualization: React.FC = () => {
  const [data, setData] = useState<ParsedData | null>(null);
  
  return (
    <div className="container">
      <div className="title">데미안 허스트 스타일 데이터 시각화</div>
      
      <FileUploader onDataLoad={setData} />
      
      {data && <DataGrid data={data} />}
      
      <style jsx global>{`
        body {
          margin: 0;
          padding: 20px;
          background: #ffffff;
          font-family: 'Arial', sans-serif;
        }
        
        .container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          max-width: 1400px;
          margin: 0 auto;
        }
        
        .title {
          font-size: 24px;
          font-weight: bold;
          color: #333;
          text-align: center;
          margin-bottom: 10px;
        }
      `}</style>
    </div>
  );
};

export default DamienHirstDataVisualization;