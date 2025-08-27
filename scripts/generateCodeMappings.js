const fs = require('fs');
const path = require('path');

// GeoJSON 파일에서 코드 매핑 추출
const geoJsonPath = path.join(__dirname, '../public/data/local_economy/local_economy_dong.geojson');
const geoJson = JSON.parse(fs.readFileSync(geoJsonPath, 'utf8'));

// 구 코드 매핑 생성
const districtCodes = {};
const dongCodes = {};

// 모든 구와 동 코드 수집
const seenDistricts = new Set();

geoJson.features.forEach(feature => {
  const props = feature.properties;
  
  // 구 코드 매핑
  if (!seenDistricts.has(props.자치구)) {
    districtCodes[props.자치구] = props.자치구코드;
    seenDistricts.add(props.자치구);
  }
  
  // 동 코드 매핑 (구_동 형식의 키)
  const dongKey = `${props.자치구}_${props.행정동}`;
  dongCodes[dongKey] = props.행정동코드;
});

// TypeScript 파일 생성
const outputPath = path.join(__dirname, '../src/features/card-sales/data/districtCodeMappings.ts');

const fileContent = `/**
 * 자동 생성된 구-동 코드 매핑
 * Generated from local_economy_dong.geojson
 */

// 구 코드 매핑
export const districtCodes: Record<string, number> = ${JSON.stringify(districtCodes, null, 2)};

// 동 코드 매핑 (구_동 형식의 키)
export const dongCodes: Record<string, number> = ${JSON.stringify(dongCodes, null, 2)};

// Helper functions
export function getDistrictCode(districtName: string): number | undefined {
  return districtCodes[districtName];
}

export function getDongCode(districtName: string, dongName: string): number | undefined {
  return dongCodes[\`\${districtName}_\${dongName}\`];
}

// 역매핑 (코드 -> 이름)
export const districtCodeToName: Record<number, string> = Object.entries(districtCodes)
  .reduce((acc, [name, code]) => {
    acc[code] = name;
    return acc;
  }, {} as Record<number, string>);

export const dongCodeToName: Record<number, string> = Object.entries(dongCodes)
  .reduce((acc, [key, code]) => {
    const dongName = key.split('_')[1];
    acc[code] = dongName;
    return acc;
  }, {} as Record<number, string>);
`;

// 파일 저장
fs.writeFileSync(outputPath, fileContent, 'utf8');

console.log('✅ Code mappings generated successfully!');
console.log(`   Districts: ${Object.keys(districtCodes).length}`);
console.log(`   Dongs: ${Object.keys(dongCodes).length}`);
console.log(`   Output: ${outputPath}`);