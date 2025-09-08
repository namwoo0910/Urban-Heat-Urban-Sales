# 🔥 Binary 데이터 로딩 후에도 레이어 업데이트가 느린 원인 분석

## 📊 현재 상황
- Binary 데이터 로딩: ✅ 빠름 (1-2ms)
- 레이어 업데이트: ❌ 느림 (체감상 수백ms)

## 🎯 주요 병목 지점 발견

### 1. **createDong3DPolygonLayers 함수가 매번 새 레이어 생성**
```typescript
// Line 1092: 매번 실행됨
const dong3DLayers = createDong3DPolygonLayers()
```
- 문제: useMemo 내부에서 함수 호출로 매번 새 PolygonLayer 인스턴스 생성
- 426개 동 × 복잡한 계산 = 매번 수백ms

### 2. **과도한 updateTriggers 의존성**
```typescript
// Line 1760-1762
updateTriggers: {
  getElevation: [selectedGu, selectedDong, dongSalesMap, heightScale, selectedDate],
  getFillColor: [selectedGu, selectedDong, dongColorMap, selectedDate],
  getLineColor: [selectedGu, selectedDong, selectedDate]
}
```
- dongSalesMap이 변경될 때마다 모든 426개 동 재계산
- dongColorMap도 매번 재생성

### 3. **useMemo의 과도한 의존성 배열**
```typescript
// Line 1766-1786: 20개 이상의 의존성
}, [
  dongData3D, 
  optimizedDongMap,
  dongColorMap,  
  selectedGu, 
  selectedDong, 
  selectedBusinessType, 
  dongSalesMap,
  dongSalesByTypeMap,
  currentThemeKey,
  themeAdjustments,
  hoveredDistrict,
  heightScale,
  // ... 더 많은 의존성
])
```

### 4. **dongColorMap 재계산**
```typescript
// Line 1445: dongColorMap이 매번 재계산됨
const dongColorMap = useMemo(() => {
  if (!dongData3D || !dongData3D.features) return new Map()
  // 426개 동 전체 색상 재계산
}, [/* 많은 의존성 */])
```

### 5. **transitions 애니메이션 오버헤드**
```typescript
// Line 1752-1756
transitions: {
  getElevation: 300,  // 300ms 애니메이션
  getFillColor: 300,  // 300ms 애니메이션
  getLineWidth: 200   // 200ms 애니메이션
}
```

## 🚨 성능 영향도

| 병목 지점 | 영향도 | 예상 지연 시간 |
|----------|--------|---------------|
| 레이어 재생성 | ⭐⭐⭐⭐⭐ | 200-400ms |
| dongColorMap 재계산 | ⭐⭐⭐⭐ | 50-100ms |
| updateTriggers 과도한 실행 | ⭐⭐⭐⭐ | 100-200ms |
| transitions 애니메이션 | ⭐⭐⭐ | 300ms |
| useMemo 의존성 과다 | ⭐⭐⭐ | 50-100ms |

## 💡 해결 방안

### 1. **레이어 인스턴스 재사용**
```typescript
// 레이어를 한 번만 생성하고 props만 업데이트
const dong3DLayer = useRef(null);
if (!dong3DLayer.current) {
  dong3DLayer.current = new PolygonLayer({...});
}
// props만 업데이트
dong3DLayer.current.props = newProps;
```

### 2. **updateTriggers 최적화**
```typescript
// 필요한 것만 업데이트
updateTriggers: {
  getElevation: [selectedDate], // 날짜만
  getFillColor: [currentThemeKey], // 테마만
}
```

### 3. **dongColorMap 캐싱 강화**
```typescript
// 테마별로 미리 계산하여 캐싱
const colorCaches = useRef(new Map());
if (!colorCaches.current.has(currentThemeKey)) {
  colorCaches.current.set(currentThemeKey, calculateColors());
}
```

### 4. **비동기 레이어 업데이트**
```typescript
// requestAnimationFrame으로 프레임 분할
requestAnimationFrame(() => {
  updateLayer1();
  requestAnimationFrame(() => {
    updateLayer2();
  });
});
```

### 5. **transitions 조건부 적용**
```typescript
// 데이터 변경 시에만 애니메이션, 선택 변경은 즉시
transitions: {
  getElevation: isDataChange ? 300 : 0,
  getFillColor: isDataChange ? 300 : 0,
}
```

## 📈 예상 개선 효과
- 현재: 500-1000ms 지연
- 개선 후: 50-100ms (10배 향상)
- 체감 속도: 즉각 반응