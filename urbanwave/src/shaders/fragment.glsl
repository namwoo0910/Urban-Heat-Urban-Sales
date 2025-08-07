// src/shaders/fragment.glsl
uniform float time;
varying float vHeight;
varying vec3 vNormal;
varying vec2 vUv;
varying float vMask;

void main() {
    // 서울 경계 밖은 투명하게 처리
    if (vMask < 0.5) {
        discard;
    }
    
    // 높이에 따른 그라데이션
    float heightNorm = clamp(vHeight / 500.0, 0.0, 1.0);
    
    // 회색 물결 색상 계산
    vec3 darkGray = vec3(0.15, 0.15, 0.18);
    vec3 lightGray = vec3(0.7, 0.7, 0.75);
    vec3 baseColor = mix(darkGray, lightGray, heightNorm);
    
    // 물결 효과를 위한 시간 기반 색상 변화
    float timeColor = sin(time * 2.0 + vUv.x * 10.0 + vUv.y * 8.0) * 0.1 + 0.9;
    baseColor *= timeColor;
    
    // 조명 효과
    vec3 lightDir = normalize(vec3(1.0, 2.0, 1.0));
    float light = max(0.3, dot(vNormal, lightDir));
    
    // 물결의 가장자리에 약간의 빛 추가
    float edge = smoothstep(0.0, 0.3, heightNorm);
    vec3 finalColor = baseColor * light + vec3(0.1, 0.15, 0.2) * edge;
    
    // 경계 부근에서 부드러운 페이드 아웃 효과
    vec2 center = vec2(0.5, 0.5);
    float distanceFromCenter = length((vUv - center) * vec2(1.0, 0.7)) * 2.0;
    float fadeFactor = smoothstep(0.9, 1.0, distanceFromCenter);
    float alpha = (0.85 + heightNorm * 0.15) * (1.0 - fadeFactor);
    
    gl_FragColor = vec4(finalColor, alpha);
}