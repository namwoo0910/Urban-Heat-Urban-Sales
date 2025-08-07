// src/js/data.js
// 서울 행정동 데이터 포인트 (더 조밀하게)
const seoulPoints = [
    { lat: 37.5735, lng: 126.9788, weight: 1.2 }, // 종로
    { lat: 37.5636, lng: 126.9809, weight: 1.8 }, // 명동
    { lat: 37.5662, lng: 126.9915, weight: 1.1 }, // 을지로
    { lat: 37.5649, lng: 127.0177, weight: 0.9 }, // 신당
    { lat: 37.5219, lng: 126.9245, weight: 1.5 }, // 여의도
    { lat: 37.5492, lng: 126.9137, weight: 1.0 }, // 합정
    { lat: 37.5563, lng: 126.9062, weight: 0.8 }, // 망원
    { lat: 37.5637, lng: 126.9256, weight: 1.1 }, // 연남
    { lat: 37.5563, lng: 126.9197, weight: 1.4 }, // 서교(홍대)
    { lat: 37.5443, lng: 126.9512, weight: 1.0 }, // 공덕
    { lat: 37.5340, lng: 127.0026, weight: 1.2 }, // 한남
    { lat: 37.5349, lng: 126.9941, weight: 1.6 }, // 이태원
    { lat: 37.5825, lng: 127.0021, weight: 0.9 }, // 혜화
    { lat: 37.5759, lng: 127.0228, weight: 0.7 }, // 창신
    { lat: 37.5169, lng: 126.9396, weight: 0.6 }, // 영등포
    { lat: 37.4829, lng: 126.8967, weight: 0.5 }, // 대림
    { lat: 37.5267, lng: 126.8986, weight: 0.8 }, // 당산
    { lat: 37.5511, lng: 126.9227, weight: 1.3 }, // 홍익
    { lat: 37.5650, lng: 127.0495, weight: 0.7 }, // 동대문
    { lat: 37.5400, lng: 127.0669, weight: 0.9 }, // 성수
    { lat: 37.5172, lng: 127.0473, weight: 1.1 }, // 강남
    { lat: 37.5012, lng: 127.0396, weight: 1.7 }, // 역삼
    { lat: 37.4979, lng: 127.0276, weight: 1.4 }, // 서초
    { lat: 37.4846, lng: 127.0320, weight: 1.0 }, // 방배
    { lat: 37.5208, lng: 127.1230, weight: 0.8 }, // 송파
    { lat: 37.5145, lng: 127.1059, weight: 1.2 }, // 잠실
];

// 서울 경계 설정
const seoulBounds = {
    minLat: 37.42,
    maxLat: 37.70,
    minLng: 126.76,
    maxLng: 127.18
};

// 24시간 유동인구 패턴 생성
function generateHourlyPattern(baseWeight, hour) {
    let multiplier = 0.3; // 기본값 (새벽)
    
    // 출근 시간 (7-9시)
    if (hour >= 7 && hour <= 9) multiplier = 1.8;
    // 점심 시간 (12-13시)  
    else if (hour >= 12 && hour <= 13) multiplier = 1.4;
    // 퇴근 시간 (18-19시)
    else if (hour >= 18 && hour <= 19) multiplier = 2.0;
    // 저녁 시간 (20-22시)
    else if (hour >= 20 && hour <= 22) multiplier = 1.6;
    // 오전/오후 업무시간
    else if (hour >= 10 && hour <= 11) multiplier = 1.2;
    else if (hour >= 14 && hour <= 17) multiplier = 1.3;
    // 심야시간 (23-5시)
    else if (hour >= 23 || hour <= 5) multiplier = 0.2;
    
    return baseWeight * multiplier * (0.7 + Math.random() * 0.6);
}