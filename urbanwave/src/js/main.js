// src/js/main.js
// 메인 초기화 함수

// 앱 초기화
function initApp() {
    // Mapbox 초기화
    const mapInstance = initMapbox();
    
    // 지도 로드 완료 후 Three.js 초기화
    mapInstance.on('load', function() {
        setTimeout(() => {
            initThreeJS().then(() => {
                setupMapEventListeners();
                updatePopulationSurface();
                updateTime();
            });
        }, 100);
    });
}

// DOM이 로드되면 앱 초기화
document.addEventListener('DOMContentLoaded', initApp);