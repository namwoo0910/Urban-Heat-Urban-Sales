JavaScript 모듈별 설명은 다음과 같습니다.

main.js: 앱 초기화 및 전체 흐름 제어
mapbox.js: Mapbox 지도 설정 및 좌표 변환
threejs.js: Three.js 3D 렌더링 및 셰이더 관리
controls.js: UI 컨트롤 및 이벤트 처리
data.js: 서울 지역 데이터 및 인구 패턴 생성



##### surface 구성 로직 ####
<three.js> " function updatePopulationSurface() "
서울 전역을 64by64 grid로 설정하고,
haversine distance 로 거리가 멀수록 덜영향받고, 가까울수록 크게 영향을 받도록 설정하는 단계를 거칩니다.
texture size 를 조정하여 64by64 를 더 세밀하게 보간할 수 있긴합니다!!