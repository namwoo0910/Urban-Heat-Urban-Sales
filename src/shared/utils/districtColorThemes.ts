/**
 * 서울 자치구 및 행정동 색상 테마
 * 세련된 다크 테마 최적화 색상 팔레트
 */

// 자치구별 고유 색상 매핑 (25개 자치구)
export const DISTRICT_FILL_COLORS = {
  // 강남권 (남동부) - 보라/인디고 계열
  강남구: {
    fill: '#1a237e',  // 진한 인디고
    gradient: 'linear-gradient(135deg, #1a237e 0%, #283593 100%)',
    glow: 'rgba(26, 35, 126, 0.4)',
    highlight: '#3949ab'
  },
  서초구: {
    fill: '#283593',  // 인디고
    gradient: 'linear-gradient(135deg, #283593 0%, #3949ab 100%)',
    glow: 'rgba(40, 53, 147, 0.4)',
    highlight: '#5c6bc0'
  },
  송파구: {
    fill: '#303f9f',  // 밝은 인디고
    gradient: 'linear-gradient(135deg, #303f9f 0%, #3f51b5 100%)',
    glow: 'rgba(48, 63, 159, 0.4)',
    highlight: '#7986cb'
  },
  
  // 강동권 (동부) - 청록/에메랄드 계열
  강동구: {
    fill: '#00695c',  // 진한 청록
    gradient: 'linear-gradient(135deg, #00695c 0%, #00796b 100%)',
    glow: 'rgba(0, 105, 92, 0.4)',
    highlight: '#00897b'
  },
  광진구: {
    fill: '#00796b',  // 청록
    gradient: 'linear-gradient(135deg, #00796b 0%, #00897b 100%)',
    glow: 'rgba(0, 121, 107, 0.4)',
    highlight: '#009688'
  },
  성동구: {
    fill: '#00897b',  // 밝은 청록
    gradient: 'linear-gradient(135deg, #00897b 0%, #009688 100%)',
    glow: 'rgba(0, 137, 123, 0.4)',
    highlight: '#26a69a'
  },
  중랑구: {
    fill: '#004d40',  // 진한 틸
    gradient: 'linear-gradient(135deg, #004d40 0%, #00695c 100%)',
    glow: 'rgba(0, 77, 64, 0.4)',
    highlight: '#00796b'
  },
  
  // 강북권 (북부) - 남색/프러시안블루 계열
  종로구: {
    fill: '#0d47a1',  // 진한 블루
    gradient: 'linear-gradient(135deg, #0d47a1 0%, #1565c0 100%)',
    glow: 'rgba(13, 71, 161, 0.4)',
    highlight: '#1976d2'
  },
  중구: {
    fill: '#1565c0',  // 블루
    gradient: 'linear-gradient(135deg, #1565c0 0%, #1976d2 100%)',
    glow: 'rgba(21, 101, 192, 0.4)',
    highlight: '#1e88e5'
  },
  용산구: {
    fill: '#1976d2',  // 밝은 블루
    gradient: 'linear-gradient(135deg, #1976d2 0%, #1e88e5 100%)',
    glow: 'rgba(25, 118, 210, 0.4)',
    highlight: '#2196f3'
  },
  성북구: {
    fill: '#01579b',  // 다크 시안
    gradient: 'linear-gradient(135deg, #01579b 0%, #0277bd 100%)',
    glow: 'rgba(1, 87, 155, 0.4)',
    highlight: '#0288d1'
  },
  강북구: {
    fill: '#006064',  // 다크 시안
    gradient: 'linear-gradient(135deg, #006064 0%, #00838f 100%)',
    glow: 'rgba(0, 96, 100, 0.4)',
    highlight: '#0097a7'
  },
  도봉구: {
    fill: '#0277bd',  // 라이트 블루
    gradient: 'linear-gradient(135deg, #0277bd 0%, #0288d1 100%)',
    glow: 'rgba(2, 119, 189, 0.4)',
    highlight: '#039be5'
  },
  노원구: {
    fill: '#00838f',  // 시안
    gradient: 'linear-gradient(135deg, #00838f 0%, #0097a7 100%)',
    glow: 'rgba(0, 131, 143, 0.4)',
    highlight: '#00acc1'
  },
  
  // 강서권 (서부) - 자주/보라 계열
  강서구: {
    fill: '#4a148c',  // 진한 퍼플
    gradient: 'linear-gradient(135deg, #4a148c 0%, #6a1b9a 100%)',
    glow: 'rgba(74, 20, 140, 0.4)',
    highlight: '#7b1fa2'
  },
  양천구: {
    fill: '#6a1b9a',  // 퍼플
    gradient: 'linear-gradient(135deg, #6a1b9a 0%, #7b1fa2 100%)',
    glow: 'rgba(106, 27, 154, 0.4)',
    highlight: '#8e24aa'
  },
  구로구: {
    fill: '#7b1fa2',  // 밝은 퍼플
    gradient: 'linear-gradient(135deg, #7b1fa2 0%, #8e24aa 100%)',
    glow: 'rgba(123, 31, 162, 0.4)',
    highlight: '#9c27b0'
  },
  금천구: {
    fill: '#8e24aa',  // 라이트 퍼플
    gradient: 'linear-gradient(135deg, #8e24aa 0%, #9c27b0 100%)',
    glow: 'rgba(142, 36, 170, 0.4)',
    highlight: '#ab47bc'
  },
  영등포구: {
    fill: '#880e4f',  // 와인
    gradient: 'linear-gradient(135deg, #880e4f 0%, #ad1457 100%)',
    glow: 'rgba(136, 14, 79, 0.4)',
    highlight: '#c2185b'
  },
  동작구: {
    fill: '#ad1457',  // 핑크
    gradient: 'linear-gradient(135deg, #ad1457 0%, #c2185b 100%)',
    glow: 'rgba(173, 20, 87, 0.4)',
    highlight: '#d81b60'
  },
  관악구: {
    fill: '#6d1f7f',  // 다크 마젠타
    gradient: 'linear-gradient(135deg, #6d1f7f 0%, #8e24aa 100%)',
    glow: 'rgba(109, 31, 127, 0.4)',
    highlight: '#9c27b0'
  },
  
  // 중부권 - 에메랄드/다크그린 계열
  서대문구: {
    fill: '#1b5e20',  // 다크 그린
    gradient: 'linear-gradient(135deg, #1b5e20 0%, #2e7d32 100%)',
    glow: 'rgba(27, 94, 32, 0.4)',
    highlight: '#388e3c'
  },
  마포구: {
    fill: '#2e7d32',  // 그린
    gradient: 'linear-gradient(135deg, #2e7d32 0%, #388e3c 100%)',
    glow: 'rgba(46, 125, 50, 0.4)',
    highlight: '#43a047'
  },
  은평구: {
    fill: '#388e3c',  // 라이트 그린
    gradient: 'linear-gradient(135deg, #388e3c 0%, #43a047 100%)',
    glow: 'rgba(56, 142, 60, 0.4)',
    highlight: '#4caf50'
  }
}

// 색상 테마 프리셋 - 세련된 모노크롬 중심
export const COLOR_THEMES = {
  // Bloomberg Terminal 스타일 (권장)
  bloomberg: {
    name: 'Bloomberg Terminal',
    description: '금융 터미널 스타일의 세련된 앰버 테마',
    // 테마별 자치구 색상 팔레트 (오렌지/앰버 그라데이션)
    districtPalette: {
      // 강남 3구 - 진한 오렌지
      '강남구': 'rgba(251, 80, 0, 0.6)',
      '서초구': 'rgba(251, 90, 5, 0.6)',
      '송파구': 'rgba(251, 100, 10, 0.6)',
      // 강동권 - 오렌지
      '강동구': 'rgba(251, 110, 15, 0.6)',
      '광진구': 'rgba(251, 120, 20, 0.6)',
      '성동구': 'rgba(251, 130, 25, 0.6)',
      '중랑구': 'rgba(251, 135, 30, 0.6)',
      // 강북권 - 밝은 오렌지
      '종로구': 'rgba(251, 140, 35, 0.6)',
      '중구': 'rgba(251, 145, 40, 0.6)',
      '용산구': 'rgba(251, 150, 45, 0.6)',
      '성북구': 'rgba(251, 155, 50, 0.6)',
      '강북구': 'rgba(251, 160, 55, 0.6)',
      '도봉구': 'rgba(251, 165, 60, 0.6)',
      '노원구': 'rgba(251, 170, 65, 0.6)',
      // 강서권 - 앰버
      '강서구': 'rgba(255, 175, 0, 0.6)',
      '양천구': 'rgba(255, 180, 10, 0.6)',
      '구로구': 'rgba(255, 185, 20, 0.6)',
      '금천구': 'rgba(255, 190, 30, 0.6)',
      '영등포구': 'rgba(255, 195, 40, 0.6)',
      '동작구': 'rgba(255, 200, 50, 0.6)',
      '관악구': 'rgba(255, 205, 60, 0.6)',
      // 마포권 - 골드
      '마포구': 'rgba(255, 210, 70, 0.6)',
      '서대문구': 'rgba(255, 215, 80, 0.6)',
      '은평구': 'rgba(255, 220, 90, 0.6)'
    },
    sgg: {
      fillBase: 'rgba(26, 17, 0, 0.4)',  // 매우 어두운 앰버
      fillHover: 'rgba(51, 34, 0, 0.6)',  // 호버 시 밝게
      lineColor: 'rgba(251, 139, 30, 0.5)',  // Bloomberg 오렌지 (연하게)
      lineWidth: 1.2,
      glowColor: 'rgba(251, 139, 30, 0.2)'  // 은은한 오렌지 글로우
    },
    dong: {
      fillBase: 'rgba(26, 17, 0, 0.2)',  // 더 연한 앰버
      fillHover: 'rgba(51, 34, 0, 0.4)',
      lineColor: 'rgba(251, 139, 30, 0.25)',  // 매우 연한 오렌지
      lineWidth: 0.5,
      glowColor: 'rgba(251, 139, 30, 0.1)'
    },
    selected: {
      fill: 'rgba(0, 104, 255, 0.3)',  // Bloomberg 블루
      line: 'rgba(0, 104, 255, 0.9)',
      glow: 'rgba(0, 104, 255, 0.4)'
    },
    hover: {
      fill: 'rgba(74, 246, 195, 0.2)',  // Bloomberg 시안
      line: 'rgba(74, 246, 195, 0.8)',
      glow: 'rgba(74, 246, 195, 0.3)'
    }
  },
  
  // 미니멀리스트 그레이스케일
  minimal: {
    name: 'Minimal Grayscale',
    description: '극도로 절제된 그레이스케일 디자인',
    // 테마별 자치구 색상 팔레트 (그레이스케일 그라데이션)
    districtPalette: {
      // 강남 3구 - 진한 그레이
      '강남구': 'rgba(255, 255, 255, 0.12)',
      '서초구': 'rgba(255, 255, 255, 0.11)',
      '송파구': 'rgba(255, 255, 255, 0.10)',
      // 강동권
      '강동구': 'rgba(255, 255, 255, 0.09)',
      '광진구': 'rgba(255, 255, 255, 0.08)',
      '성동구': 'rgba(255, 255, 255, 0.07)',
      '중랑구': 'rgba(255, 255, 255, 0.06)',
      // 강북권
      '종로구': 'rgba(255, 255, 255, 0.05)',
      '중구': 'rgba(255, 255, 255, 0.045)',
      '용산구': 'rgba(255, 255, 255, 0.04)',
      '성북구': 'rgba(255, 255, 255, 0.035)',
      '강북구': 'rgba(255, 255, 255, 0.03)',
      '도봉구': 'rgba(255, 255, 255, 0.028)',
      '노원구': 'rgba(255, 255, 255, 0.025)',
      // 강서권
      '강서구': 'rgba(255, 255, 255, 0.023)',
      '양천구': 'rgba(255, 255, 255, 0.021)',
      '구로구': 'rgba(255, 255, 255, 0.019)',
      '금천구': 'rgba(255, 255, 255, 0.017)',
      '영등포구': 'rgba(255, 255, 255, 0.015)',
      '동작구': 'rgba(255, 255, 255, 0.013)',
      '관악구': 'rgba(255, 255, 255, 0.011)',
      // 마포권
      '마포구': 'rgba(255, 255, 255, 0.009)',
      '서대문구': 'rgba(255, 255, 255, 0.007)',
      '은평구': 'rgba(255, 255, 255, 0.005)'
    },
    sgg: {
      fillBase: 'rgba(255, 255, 255, 0.02)',  // 거의 투명
      fillHover: 'rgba(255, 255, 255, 0.05)',
      lineColor: 'rgba(255, 255, 255, 0.15)',  // 매우 연한 흰색
      lineWidth: 0.8,
      glowColor: 'rgba(255, 255, 255, 0.08)'
    },
    dong: {
      fillBase: 'rgba(255, 255, 255, 0.01)',
      fillHover: 'rgba(255, 255, 255, 0.03)',
      lineColor: 'rgba(255, 255, 255, 0.08)',
      lineWidth: 0.4,
      glowColor: 'rgba(255, 255, 255, 0.05)'
    },
    selected: {
      fill: 'rgba(255, 255, 255, 0.08)',
      line: 'rgba(255, 255, 255, 0.5)',
      glow: 'rgba(255, 255, 255, 0.2)'
    },
    hover: {
      fill: 'rgba(255, 255, 255, 0.06)',
      line: 'rgba(255, 255, 255, 0.3)',
      glow: 'rgba(255, 255, 255, 0.15)'
    }
  },
  
  // Dark Matter 스타일 (Stamen Design 영감)
  darkMatter: {
    name: 'Dark Matter',
    description: '깊은 우주의 느낌, 데이터 시각화에 최적',
    // 테마별 자치구 색상 팔레트 (시안/보라 그라데이션)
    districtPalette: {
      // 강남 3구 - 진한 보라
      '강남구': 'rgba(124, 58, 237, 0.5)',
      '서초구': 'rgba(139, 92, 246, 0.5)',
      '송파구': 'rgba(153, 102, 255, 0.5)',
      // 강동권 - 보라에서 시안으로 전환
      '강동구': 'rgba(140, 120, 255, 0.5)',
      '광진구': 'rgba(120, 140, 255, 0.5)',
      '성동구': 'rgba(100, 160, 255, 0.5)',
      '중랑구': 'rgba(80, 180, 255, 0.5)',
      // 강북권 - 시안
      '종로구': 'rgba(0, 200, 200, 0.5)',
      '중구': 'rgba(0, 210, 210, 0.5)',
      '용산구': 'rgba(0, 220, 220, 0.5)',
      '성북구': 'rgba(0, 230, 230, 0.5)',
      '강북구': 'rgba(0, 240, 240, 0.5)',
      '도봉구': 'rgba(0, 250, 250, 0.5)',
      '노원구': 'rgba(0, 255, 255, 0.5)',
      // 강서권 - 밝은 시안에서 민트로
      '강서구': 'rgba(64, 255, 255, 0.5)',
      '양천구': 'rgba(96, 255, 240, 0.5)',
      '구로구': 'rgba(128, 255, 225, 0.5)',
      '금천구': 'rgba(160, 255, 210, 0.5)',
      '영등포구': 'rgba(192, 255, 195, 0.5)',
      '동작구': 'rgba(224, 255, 180, 0.5)',
      '관악구': 'rgba(240, 255, 165, 0.5)',
      // 마포권 - 민트에서 연두로
      '마포구': 'rgba(200, 255, 150, 0.5)',
      '서대문구': 'rgba(180, 255, 135, 0.5)',
      '은평구': 'rgba(160, 255, 120, 0.5)'
    },
    sgg: {
      fillBase: 'rgba(14, 14, 28, 0.3)',  // 깊은 네이비
      fillHover: 'rgba(20, 20, 40, 0.5)',
      lineColor: 'rgba(0, 255, 255, 0.2)',  // 매우 연한 시안
      lineWidth: 1,
      glowColor: 'rgba(0, 255, 255, 0.1)'
    },
    dong: {
      fillBase: 'rgba(14, 14, 28, 0.15)',
      fillHover: 'rgba(20, 20, 40, 0.3)',
      lineColor: 'rgba(0, 255, 255, 0.1)',
      lineWidth: 0.5,
      glowColor: 'rgba(0, 255, 255, 0.05)'
    },
    selected: {
      fill: 'rgba(124, 58, 237, 0.3)',  // 보라
      line: 'rgba(124, 58, 237, 0.8)',
      glow: 'rgba(124, 58, 237, 0.3)'
    },
    hover: {
      fill: 'rgba(0, 255, 255, 0.15)',
      line: 'rgba(0, 255, 255, 0.5)',
      glow: 'rgba(0, 255, 255, 0.2)'
    }
  },
  
  // Kepler.gl 스타일
  kepler: {
    name: 'Kepler Dark',
    description: 'Uber Kepler.gl 스타일의 데이터 시각화 테마',
    // 테마별 자치구 색상 팔레트 (블루/핑크 그라데이션)
    districtPalette: {
      // 강남 3구 - 진한 블루
      '강남구': 'rgba(90, 100, 250, 0.5)',
      '서초구': 'rgba(90, 120, 250, 0.5)',
      '송파구': 'rgba(90, 140, 250, 0.5)',
      // 강동권 - 블루
      '강동구': 'rgba(90, 160, 250, 0.5)',
      '광진구': 'rgba(90, 180, 250, 0.5)',
      '성동구': 'rgba(90, 200, 250, 0.5)',
      '중랑구': 'rgba(90, 220, 250, 0.5)',
      // 강북권 - 밝은 블루에서 핑크로 전환
      '종로구': 'rgba(120, 200, 250, 0.5)',
      '중구': 'rgba(150, 180, 250, 0.5)',
      '용산구': 'rgba(180, 160, 250, 0.5)',
      '성북구': 'rgba(210, 140, 250, 0.5)',
      '강북구': 'rgba(240, 120, 200, 0.5)',
      '도봉구': 'rgba(255, 100, 180, 0.5)',
      '노원구': 'rgba(255, 100, 160, 0.5)',
      // 강서권 - 핑크
      '강서구': 'rgba(255, 100, 146, 0.5)',
      '양천구': 'rgba(255, 120, 146, 0.5)',
      '구로구': 'rgba(255, 140, 146, 0.5)',
      '금천구': 'rgba(255, 160, 146, 0.5)',
      '영등포구': 'rgba(255, 180, 146, 0.5)',
      '동작구': 'rgba(255, 200, 146, 0.5)',
      '관악구': 'rgba(255, 220, 146, 0.5)',
      // 마포권 - 연한 핑크
      '마포구': 'rgba(255, 180, 180, 0.5)',
      '서대문구': 'rgba(255, 200, 200, 0.5)',
      '은평구': 'rgba(255, 220, 220, 0.5)'
    },
    sgg: {
      fillBase: 'rgba(18, 25, 33, 0.4)',  // Kepler 다크 배경
      fillHover: 'rgba(30, 40, 50, 0.6)',
      lineColor: 'rgba(90, 200, 250, 0.3)',  // 연한 블루
      lineWidth: 1,
      glowColor: 'rgba(90, 200, 250, 0.15)'
    },
    dong: {
      fillBase: 'rgba(18, 25, 33, 0.2)',
      fillHover: 'rgba(30, 40, 50, 0.4)',
      lineColor: 'rgba(90, 200, 250, 0.15)',
      lineWidth: 0.5,
      glowColor: 'rgba(90, 200, 250, 0.08)'
    },
    selected: {
      fill: 'rgba(255, 100, 146, 0.3)',  // Kepler 핑크
      line: 'rgba(255, 100, 146, 0.9)',
      glow: 'rgba(255, 100, 146, 0.3)'
    },
    hover: {
      fill: 'rgba(90, 200, 250, 0.2)',
      line: 'rgba(90, 200, 250, 0.6)',
      glow: 'rgba(90, 200, 250, 0.25)'
    }
  },
  
  // Monochrome Blue (단색 블루 테마)
  monochromeBlue: {
    name: 'Monochrome Blue',
    description: '단일 블루 색상의 세련된 변주',
    // 테마별 자치구 색상 팔레트 (블루 그라데이션)
    districtPalette: {
      // 강남 3구 - 진한 블루
      '강남구': 'rgba(0, 50, 150, 0.6)',
      '서초구': 'rgba(0, 60, 160, 0.6)',
      '송파구': 'rgba(0, 70, 170, 0.6)',
      // 강동권
      '강동구': 'rgba(0, 80, 180, 0.6)',
      '광진구': 'rgba(0, 90, 190, 0.6)',
      '성동구': 'rgba(0, 100, 200, 0.6)',
      '중랑구': 'rgba(0, 110, 210, 0.6)',
      // 강북권
      '종로구': 'rgba(0, 120, 220, 0.6)',
      '중구': 'rgba(0, 130, 230, 0.6)',
      '용산구': 'rgba(0, 140, 240, 0.6)',
      '성북구': 'rgba(20, 150, 250, 0.6)',
      '강북구': 'rgba(40, 160, 255, 0.6)',
      '도봉구': 'rgba(60, 170, 255, 0.6)',
      '노원구': 'rgba(80, 180, 255, 0.6)',
      // 강서권 - 밝은 블루
      '강서구': 'rgba(100, 190, 255, 0.6)',
      '양천구': 'rgba(120, 200, 255, 0.6)',
      '구로구': 'rgba(140, 210, 255, 0.6)',
      '금천구': 'rgba(160, 220, 255, 0.6)',
      '영등포구': 'rgba(180, 230, 255, 0.6)',
      '동작구': 'rgba(200, 240, 255, 0.6)',
      '관악구': 'rgba(220, 245, 255, 0.6)',
      // 마포권 - 하늘색
      '마포구': 'rgba(230, 248, 255, 0.6)',
      '서대문구': 'rgba(235, 250, 255, 0.6)',
      '은평구': 'rgba(240, 252, 255, 0.6)'
    },
    sgg: {
      fillBase: 'rgba(13, 71, 161, 0.08)',  // 매우 연한 블루
      fillHover: 'rgba(13, 71, 161, 0.15)',
      lineColor: 'rgba(33, 150, 243, 0.3)',  // 연한 블루
      lineWidth: 1,
      glowColor: 'rgba(33, 150, 243, 0.15)'
    },
    dong: {
      fillBase: 'rgba(13, 71, 161, 0.04)',
      fillHover: 'rgba(13, 71, 161, 0.08)',
      lineColor: 'rgba(33, 150, 243, 0.15)',
      lineWidth: 0.5,
      glowColor: 'rgba(33, 150, 243, 0.08)'
    },
    selected: {
      fill: 'rgba(33, 150, 243, 0.3)',
      line: 'rgba(33, 150, 243, 0.9)',
      glow: 'rgba(33, 150, 243, 0.4)'
    },
    hover: {
      fill: 'rgba(33, 150, 243, 0.2)',
      line: 'rgba(33, 150, 243, 0.6)',
      glow: 'rgba(33, 150, 243, 0.25)'
    }
  },
  
  // 새로운 3D 테마들
  blue: {
    name: 'Ocean Blue',
    description: '파란색 계열 3D 테마',
    districtPalette: {},
    sgg: {
      fillBase: 'rgba(0, 50, 100, 0.1)',
      lineColor: 'rgba(100, 150, 200, 0.5)',
      lineWidth: 1.0,
      glowColor: 'rgba(100, 150, 200, 0.3)'
    },
    dong: {
      fillBase: 'rgba(0, 50, 100, 0.05)',
      lineColor: 'rgba(100, 150, 200, 0.3)',
      lineWidth: 0.5,
      glowColor: 'rgba(100, 150, 200, 0.2)'
    },
    selected: {
      fill: 'rgba(0, 100, 200, 0.3)',
      line: 'rgba(0, 150, 255, 0.8)',
      glow: 'rgba(0, 150, 255, 0.4)'
    },
    hover: {
      fill: 'rgba(50, 150, 250, 0.2)',
      line: 'rgba(50, 150, 250, 0.8)',
      glow: 'rgba(50, 150, 250, 0.3)'
    }
  },
  
  green: {
    name: 'Forest Green',
    description: '초록색 계열 3D 테마',
    districtPalette: {},
    sgg: {
      fillBase: 'rgba(0, 60, 30, 0.1)',
      lineColor: 'rgba(100, 200, 100, 0.5)',
      lineWidth: 1.0,
      glowColor: 'rgba(100, 200, 100, 0.3)'
    },
    dong: {
      fillBase: 'rgba(0, 60, 30, 0.05)',
      lineColor: 'rgba(100, 200, 100, 0.3)',
      lineWidth: 0.5,
      glowColor: 'rgba(100, 200, 100, 0.2)'
    },
    selected: {
      fill: 'rgba(0, 150, 50, 0.3)',
      line: 'rgba(0, 255, 100, 0.8)',
      glow: 'rgba(0, 255, 100, 0.4)'
    },
    hover: {
      fill: 'rgba(50, 200, 100, 0.2)',
      line: 'rgba(50, 200, 100, 0.8)',
      glow: 'rgba(50, 200, 100, 0.3)'
    }
  },
  
  purple: {
    name: 'Royal Purple',
    description: '보라색 계열 3D 테마',
    districtPalette: {},
    sgg: {
      fillBase: 'rgba(60, 30, 80, 0.1)',
      lineColor: 'rgba(150, 100, 200, 0.5)',
      lineWidth: 1.0,
      glowColor: 'rgba(150, 100, 200, 0.3)'
    },
    dong: {
      fillBase: 'rgba(60, 30, 80, 0.05)',
      lineColor: 'rgba(150, 100, 200, 0.3)',
      lineWidth: 0.5,
      glowColor: 'rgba(150, 100, 200, 0.2)'
    },
    selected: {
      fill: 'rgba(120, 60, 180, 0.3)',
      line: 'rgba(180, 100, 255, 0.8)',
      glow: 'rgba(180, 100, 255, 0.4)'
    },
    hover: {
      fill: 'rgba(150, 80, 200, 0.2)',
      line: 'rgba(150, 80, 200, 0.8)',
      glow: 'rgba(150, 80, 200, 0.3)'
    }
  },
  
  orange: {
    name: 'Sunset Orange',
    description: '주황색 계열 3D 테마',
    districtPalette: {},
    sgg: {
      fillBase: 'rgba(100, 50, 0, 0.1)',
      lineColor: 'rgba(255, 150, 50, 0.5)',
      lineWidth: 1.0,
      glowColor: 'rgba(255, 150, 50, 0.3)'
    },
    dong: {
      fillBase: 'rgba(100, 50, 0, 0.05)',
      lineColor: 'rgba(255, 150, 50, 0.3)',
      lineWidth: 0.5,
      glowColor: 'rgba(255, 150, 50, 0.2)'
    },
    selected: {
      fill: 'rgba(200, 100, 0, 0.3)',
      line: 'rgba(255, 150, 0, 0.8)',
      glow: 'rgba(255, 150, 0, 0.4)'
    },
    hover: {
      fill: 'rgba(255, 180, 50, 0.2)',
      line: 'rgba(255, 180, 50, 0.8)',
      glow: 'rgba(255, 180, 50, 0.3)'
    }
  },
  
  mono: {
    name: 'Monochrome',
    description: '회색 계열 3D 테마',
    districtPalette: {},
    sgg: {
      fillBase: 'rgba(50, 50, 50, 0.1)',
      lineColor: 'rgba(150, 150, 150, 0.5)',
      lineWidth: 1.0,
      glowColor: 'rgba(150, 150, 150, 0.3)'
    },
    dong: {
      fillBase: 'rgba(50, 50, 50, 0.05)',
      lineColor: 'rgba(150, 150, 150, 0.3)',
      lineWidth: 0.5,
      glowColor: 'rgba(150, 150, 150, 0.2)'
    },
    selected: {
      fill: 'rgba(100, 100, 100, 0.3)',
      line: 'rgba(200, 200, 200, 0.8)',
      glow: 'rgba(200, 200, 200, 0.4)'
    },
    hover: {
      fill: 'rgba(150, 150, 150, 0.2)',
      line: 'rgba(150, 150, 150, 0.8)',
      glow: 'rgba(150, 150, 150, 0.3)'
    }
  }
}

// 자치구 이름으로 색상 가져오기
export function getDistrictColor(districtName: string) {
  return DISTRICT_FILL_COLORS[districtName as keyof typeof DISTRICT_FILL_COLORS] || {
    fill: '#1a1a2e',  // 기본 다크 네이비
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    glow: 'rgba(26, 26, 46, 0.4)',
    highlight: '#0f3460'
  }
}

// 테마 적용을 위한 헬퍼 함수
export function applyTheme(themeName: keyof typeof COLOR_THEMES) {
  const theme = COLOR_THEMES[themeName]
  if (!theme) {
    console.warn(`Theme '${themeName}' not found, using default`)
    return COLOR_THEMES.midnightOcean
  }
  return theme
}

// 권역별 색상 그룹 (분석용)
export const DISTRICT_GROUPS = {
  강남권: ['강남구', '서초구', '송파구'],
  강동권: ['강동구', '광진구', '성동구', '중랑구'],
  강북권: ['종로구', '중구', '용산구', '성북구', '강북구', '도봉구', '노원구'],
  강서권: ['강서구', '양천구', '구로구', '금천구', '영등포구', '동작구', '관악구'],
  중부권: ['서대문구', '마포구', '은평구']
}

// 애니메이션 스타일
export const ANIMATION_STYLES = {
  pulse: `
    @keyframes pulse {
      0%, 100% { opacity: 0.8; filter: drop-shadow(0 0 8px currentColor); }
      50% { opacity: 1; filter: drop-shadow(0 0 16px currentColor); }
    }
  `,
  glow: `
    @keyframes glow {
      0% { filter: drop-shadow(0 0 4px currentColor); }
      50% { filter: drop-shadow(0 0 12px currentColor) drop-shadow(0 0 8px currentColor); }
      100% { filter: drop-shadow(0 0 4px currentColor); }
    }
  `,
  shimmer: `
    @keyframes shimmer {
      0% { opacity: 0.6; }
      50% { opacity: 1; }
      100% { opacity: 0.6; }
    }
  `
}

export default {
  DISTRICT_FILL_COLORS,
  COLOR_THEMES,
  DISTRICT_GROUPS,
  ANIMATION_STYLES,
  getDistrictColor,
  applyTheme
}