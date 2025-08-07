// src/js/threejs.js
// Three.js 관련 변수들
let scene, camera, renderer, surface, uniforms, populationTexture;
const textureSize = 64; // 64x64 텍스처 사용

// Shader 코드를 로드하는 함수 (실제로는 별도 파일에서 읽어옴)
async function loadShader(url) {
    const response = await fetch(url);
    return await response.text();
}

// Three.js 초기화
async function initThreeJS() {
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100000);
    
    renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    document.getElementById('threejs-overlay').appendChild(renderer.domElement);

    // 인구 데이터 텍스처 생성
    const textureData = new Float32Array(textureSize * textureSize * 4);
    populationTexture = new THREE.DataTexture(textureData, textureSize, textureSize, THREE.RGBAFormat, THREE.FloatType);
    populationTexture.needsUpdate = true;

    // Surface geometry 생성
    const geometry = new THREE.PlaneGeometry(2000, 2000, textureSize - 1, textureSize - 1);
    geometry.rotateX(-Math.PI / 2);

    // Shader material
    uniforms = {
        time: { value: 0 },
        populationTexture: { value: populationTexture },
        heightScale: { value: heightScale },
        waveIntensity: { value: waveIntensity }
    };

    // Shader 코드는 인라인으로 유지 (별도 로딩 로직 추가 가능)
    const vertexShader = `
        uniform float time;
        uniform sampler2D populationTexture;
        uniform float heightScale;
        uniform float waveIntensity;
        
        varying float vHeight;
        varying vec3 vNormal;
        varying vec2 vUv;
        varying float vMask;
        
        bool isInsideSeoul(vec2 uv) {
            vec2 coords = vec2(126.76 + (127.18 - 126.76) * uv.x, 37.42 + (37.70 - 37.42) * uv.y);
            float lng = coords.x;
            float lat = coords.y;
            
            vec2 center = vec2(126.97, 37.56);
            vec2 radii = vec2(0.21, 0.14);
            vec2 normalized = (coords - center) / radii;
            float distance = length(normalized);
            
            return distance < 1.0;
        }
        
        void main() {
            vUv = uv;
            vMask = isInsideSeoul(uv) ? 1.0 : 0.0;
            
            vec4 populationData = texture2D(populationTexture, uv);
            float populationHeight = populationData.r * heightScale * 300.0;
            
            if (vMask < 0.5) {
                populationHeight = 0.0;
            }
            
            populationHeight = clamp(populationHeight, 0.0, 800.0);
            
            float waveEffect = 0.0;
            if (vMask > 0.5) {
                float wave1 = sin(position.x * 0.01 + time * 2.0) * waveIntensity * 20.0;
                float wave2 = cos(position.z * 0.01 + time * 1.5) * waveIntensity * 15.0;
                float wave3 = sin((position.x + position.z) * 0.005 + time * 3.0) * waveIntensity * 10.0;
                waveEffect = wave1 + wave2 + wave3;
            }
            
            vec3 newPosition = position;
            newPosition.y = populationHeight + waveEffect;
            
            vHeight = newPosition.y;
            
            vec2 texelSize = vec2(1.0) / vec2(64.0);
            float heightL = texture2D(populationTexture, clamp(uv - vec2(texelSize.x, 0.0), 0.0, 1.0)).r * heightScale * 300.0;
            float heightR = texture2D(populationTexture, clamp(uv + vec2(texelSize.x, 0.0), 0.0, 1.0)).r * heightScale * 300.0;
            float heightU = texture2D(populationTexture, clamp(uv - vec2(0.0, texelSize.y), 0.0, 1.0)).r * heightScale * 300.0;
            float heightD = texture2D(populationTexture, clamp(uv + vec2(0.0, texelSize.y), 0.0, 1.0)).r * heightScale * 300.0;
            
            heightL = clamp(heightL, 0.0, 800.0);
            heightR = clamp(heightR, 0.0, 800.0);
            heightU = clamp(heightU, 0.0, 800.0);
            heightD = clamp(heightD, 0.0, 800.0);
            
            vec3 tangentX = vec3(40.0, heightR - heightL, 0.0);
            vec3 tangentZ = vec3(0.0, heightD - heightU, 40.0);
            vNormal = normalize(cross(tangentX, tangentZ));
            
            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
        }
    `;

    const fragmentShader = `
        uniform float time;
        varying float vHeight;
        varying vec3 vNormal;
        varying vec2 vUv;
        varying float vMask;
        
        void main() {
            if (vMask < 0.5) {
                discard;
            }
            
            float heightNorm = clamp(vHeight / 500.0, 0.0, 1.0);
            
            vec3 darkGray = vec3(0.15, 0.15, 0.18);
            vec3 lightGray = vec3(0.7, 0.7, 0.75);
            vec3 baseColor = mix(darkGray, lightGray, heightNorm);
            
            float timeColor = sin(time * 2.0 + vUv.x * 10.0 + vUv.y * 8.0) * 0.1 + 0.9;
            baseColor *= timeColor;
            
            vec3 lightDir = normalize(vec3(1.0, 2.0, 1.0));
            float light = max(0.3, dot(vNormal, lightDir));
            
            float edge = smoothstep(0.0, 0.3, heightNorm);
            vec3 finalColor = baseColor * light + vec3(0.1, 0.15, 0.2) * edge;
            
            vec2 center = vec2(0.5, 0.5);
            float distanceFromCenter = length((vUv - center) * vec2(1.0, 0.7)) * 2.0;
            float fadeFactor = smoothstep(0.9, 1.0, distanceFromCenter);
            float alpha = (0.85 + heightNorm * 0.15) * (1.0 - fadeFactor);
            
            gl_FragColor = vec4(finalColor, alpha);
        }
    `;

    const material = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        side: THREE.DoubleSide
    });

    surface = new THREE.Mesh(geometry, material);
    scene.add(surface);

    // 조명 추가
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(100, 200, 100);
    scene.add(directionalLight);

    // 초기 카메라 및 surface 위치 설정
    updateCameraAndSurface();
    
    animate();
}

// 보간된 인구 데이터 생성
function updatePopulationSurface() {
    const textureData = new Float32Array(textureSize * textureSize * 4);
    
    for (let y = 0; y < textureSize; y++) {
        for (let x = 0; x < textureSize; x++) {
            const lat = seoulBounds.minLat + (seoulBounds.maxLat - seoulBounds.minLat) * (y / (textureSize - 1));
            const lng = seoulBounds.minLng + (seoulBounds.maxLng - seoulBounds.minLng) * (x / (textureSize - 1));
            
            let totalWeight = 0;
            let totalDistance = 0;
            
            // 역거리 가중 보간 (Inverse Distance Weighting)
            seoulPoints.forEach(point => {
                const distance = Math.sqrt(
                    Math.pow((lat - point.lat) * 111000, 2) + 
                    Math.pow((lng - point.lng) * 111000 * Math.cos(lat * Math.PI / 180), 2)
                );
                
                if (distance < 100) {
                    totalWeight += generateHourlyPattern(point.weight, currentHour) * 10;
                } else {
                    const weight = generateHourlyPattern(point.weight, currentHour) / Math.pow(distance / 1000, 1.5);
                    totalWeight += weight;
                    totalDistance += 1;
                }
            });
            
            // 인구 값 정규화 (이상값 방지)
            let populationValue = totalDistance > 0 ? (totalWeight / Math.max(1, totalDistance)) : 0.1;
            populationValue = Math.max(0.05, Math.min(populationValue, 3.0)); // 0.05~3.0 사이로 제한
            
            // RGBA 텍스처에 데이터 저장 (R 채널에 인구 데이터)
            const index = (y * textureSize + x) * 4;
            textureData[index] = populationValue;     // R
            textureData[index + 1] = 0;              // G
            textureData[index + 2] = 0;              // B
            textureData[index + 3] = 1;              // A
        }
    }
    
    populationTexture.image.data = textureData;
    populationTexture.needsUpdate = true;
}

// 애니메이션 루프
function animate() {
    requestAnimationFrame(animate);
    
    uniforms.time.value += 0.016 * animationSpeed;
    uniforms.heightScale.value = heightScale;
    uniforms.waveIntensity.value = waveIntensity;
    
    // 지도가 움직일 때마다 surface 위치 업데이트
    updateCameraAndSurface();
    
    renderer.render(scene, camera);
}