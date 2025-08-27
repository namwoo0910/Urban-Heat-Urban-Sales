const fs = require('fs');
const path = require('path');

// GeoJSON 파일에서 코드 매핑 추출
const geoJsonPath = path.join(__dirname, '../public/data/local_economy/local_economy_dong.geojson');
const geoJson = JSON.parse(fs.readFileSync(geoJsonPath, 'utf8'));

// 구-동 코드 매핑 테이블 생성
const codeMapping = {};
geoJson.features.forEach(feature => {
  const props = feature.properties;
  const key = `${props.자치구}_${props.행정동}`;
  codeMapping[key] = {
    자치구: props.자치구,
    자치구코드: props.자치구코드,
    행정동: props.행정동,
    행정동코드: props.행정동코드
  };
});

console.log(`Created mapping for ${Object.keys(codeMapping).length} dong entries`);

// 서울시 25개 구 목록
const districts = [
  '강남구', '강동구', '강북구', '강서구', '관악구',
  '광진구', '구로구', '금천구', '노원구', '도봉구',
  '동대문구', '동작구', '마포구', '서대문구', '서초구',
  '성동구', '성북구', '송파구', '양천구', '영등포구',
  '용산구', '은평구', '종로구', '중구', '중랑구'
];

// 각 구 JSON 파일 업데이트
districts.forEach(district => {
  const filePath = path.join(__dirname, `../public/data/local_economy/${district}.json`);
  
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let updatedCount = 0;
    let notFoundDongs = [];
    
    const updatedData = data.map(item => {
      const key = `${district}_${item.행정동}`;
      const codes = codeMapping[key];
      
      if (codes) {
        updatedCount++;
        return {
          ...item,
          자치구: district,
          자치구코드: codes.자치구코드,
          행정동코드: codes.행정동코드
        };
      } else {
        notFoundDongs.push(item.행정동);
        // 코드를 찾지 못한 경우에도 자치구 이름은 추가
        return {
          ...item,
          자치구: district,
          자치구코드: null,
          행정동코드: null
        };
      }
    });
    
    // 파일 저장
    fs.writeFileSync(filePath, JSON.stringify(updatedData, null, 2), 'utf8');
    
    console.log(`✅ Updated ${district}.json - ${updatedCount}/${data.length} entries mapped`);
    if (notFoundDongs.length > 0) {
      console.log(`   ⚠️ Not found in geojson: ${notFoundDongs.join(', ')}`);
    }
  } catch (error) {
    console.error(`❌ Error processing ${district}.json:`, error.message);
  }
});

console.log('\n=== Summary ===');
console.log(`Total districts processed: ${districts.length}`);
console.log('All JSON files have been updated with 자치구, 자치구코드, and 행정동코드 fields.');