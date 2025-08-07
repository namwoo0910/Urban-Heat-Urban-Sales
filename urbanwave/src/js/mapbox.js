// src/js/mapbox.js
// Mapbox 관련 함수들

let map;

// Mapbox 초기화
function initMapbox() {
    mapboxgl.accessToken = 'pk.eyJ1IjoibmFtd29vMDkxMCIsImEiOiJjbWQzNXh5aWowMTVkMmtzZ3NhNnZwZGJwIn0.4wvTbW4CQ3ApywwnI4AufQ';
    
    map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [126.9895, 37.5651],
        zoom: 10,
        pitch: 70,
        bearing: -20,
        antialias: true
    });

    return map;
}

// Mapbox와 Three.js 좌표 변환 함수
function lngLatToWorld(lng, lat) {
    const scale = Math.pow(2, map.getZoom());
    const worldSize = 512 * scale;
    const lambda = lng * Math.PI / 180;
    const phi = lat * Math.PI / 180;
    const x = worldSize * (lambda + Math.PI) / (2 * Math.PI);
    const y = worldSize * (1 - (Math.log(Math.tan(Math.PI / 4 + phi / 2)) + Math.PI) / (2 * Math.PI));
    return { x, y };
}

// 카메라와 Surface 위치 업데이트
function updateCameraAndSurface() {
    if (!surface || !map.isStyleLoaded()) return;

    // 현재 지도의 중심과 줌 레벨 가져오기
    const center = map.getCenter();
    const zoom = map.getZoom();
    const bearing = map.getBearing();
    const pitch = map.getPitch();

    // 서울 경계를 월드 좌표로 변환
    const minWorld = lngLatToWorld(seoulBounds.minLng, seoulBounds.minLat);
    const maxWorld = lngLatToWorld(seoulBounds.maxLng, seoulBounds.maxLat);
    const centerWorld = lngLatToWorld(center.lng, center.lat);

    // Surface 크기와 위치 계산
    const surfaceWidth = maxWorld.x - minWorld.x;
    const surfaceHeight = maxWorld.y - minWorld.y;
    const surfaceCenterX = (minWorld.x + maxWorld.x) / 2 - centerWorld.x;
    const surfaceCenterY = (minWorld.y + maxWorld.y) / 2 - centerWorld.y;

    // Surface 위치 조정
    surface.scale.set(surfaceWidth / 2000, 1, surfaceHeight / 2000);
    surface.position.set(surfaceCenterX, 0, -surfaceCenterY);
    surface.rotation.y = -bearing * Math.PI / 180;

    // 카메라 설정 (Mapbox 카메라와 동기화)
    const altitude = 1.5 / Math.tan(pitch * Math.PI / 360) * Math.max(surfaceWidth, surfaceHeight);
    camera.position.set(0, altitude, altitude * 0.3);
    camera.lookAt(surfaceCenterX, 0, -surfaceCenterY);
    camera.fov = map.transform._fov * 180 / Math.PI;
    camera.updateProjectionMatrix();
}

// 지도 이벤트 리스너 설정
function setupMapEventListeners() {
    map.on('move', updateCameraAndSurface);
    map.on('zoom', updateCameraAndSurface);
    map.on('rotate', updateCameraAndSurface);
    map.on('pitch', updateCameraAndSurface);
}