// src/js/controls.js
// 전역 변수들
let currentHour = 6;
let isPlaying = true;
let animationSpeed = 1;
let heightScale = 1.5;
let waveIntensity = 0.8;
let animationId;

// 시간 업데이트
function updateTime() {
    if (isPlaying) {
        updatePopulationSurface();
        document.getElementById('timeDisplay').textContent = 
            `${String(currentHour).padStart(2, '0')}:00`;
        
        animationId = setTimeout(() => {
            currentHour = (currentHour + 1) % 24;
            updateTime();
        }, 2000 / animationSpeed);
    }
}

// 컨트롤 함수들
function toggleAnimation() {
    isPlaying = !isPlaying;
    if (isPlaying) {
        updateTime();
    } else {
        clearTimeout(animationId);
    }
}

function resetAnimation() {
    currentHour = 6;
    updatePopulationSurface();
    document.getElementById('timeDisplay').textContent = '06:00';
}

function updateSpeed(speed) {
    animationSpeed = parseFloat(speed);
}

function updateHeightScale(scale) {
    heightScale = parseFloat(scale);
}

function updateWaveIntensity(intensity) {
    waveIntensity = parseFloat(intensity);
}

// 창 크기 변경 처리
window.addEventListener('resize', () => {
    if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        updateCameraAndSurface();
    }
});