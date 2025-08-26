/**
 * Normalized Gaussian Blur 구현
 * grid_0811.py의 _normalized_gaussian_blur 메서드를 TypeScript로 재현
 */

/**
 * Gaussian Blur 클래스
 * 2D 배열에 대한 경계 보존 가우시안 블러 적용
 */
export class GaussianBlur {
  /**
   * 1D 가우시안 커널 생성
   * grid_0811.py 라인 262-270
   */
  private createGaussianKernel1D(sigmaCells: number): number[] {
    if (sigmaCells <= 0) {
      return [1.0]
    }

    const radius = Math.ceil(3.0 * sigmaCells)
    const kernel: number[] = []
    let sum = 0

    for (let i = -radius; i <= radius; i++) {
      const value = Math.exp(-(i * i) / (2.0 * sigmaCells * sigmaCells))
      kernel.push(value)
      sum += value
    }

    // 정규화 (합이 1이 되도록)
    return kernel.map(k => k / sum)
  }

  /**
   * 1D Convolution (horizontal)
   */
  private convolve1DHorizontal(
    array: number[][],
    kernel: number[],
    mask: number[][]
  ): number[][] {
    const height = array.length
    const width = array[0].length
    const padSize = Math.floor(kernel.length / 2)
    const result: number[][] = Array(height).fill(null).map(() => Array(width).fill(0))

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (mask[y][x] === 0) continue

        let sum = 0
        let weightSum = 0

        for (let k = 0; k < kernel.length; k++) {
          const dx = k - padSize
          const nx = x + dx

          // Edge handling - clamp to boundary
          const clampedX = Math.max(0, Math.min(width - 1, nx))
          
          if (mask[y][clampedX] > 0) {
            sum += array[y][clampedX] * kernel[k]
            weightSum += kernel[k]
          }
        }

        result[y][x] = weightSum > 0 ? sum / weightSum : 0
      }
    }

    return result
  }

  /**
   * 1D Convolution (vertical)
   */
  private convolve1DVertical(
    array: number[][],
    kernel: number[],
    mask: number[][]
  ): number[][] {
    const height = array.length
    const width = array[0].length
    const padSize = Math.floor(kernel.length / 2)
    const result: number[][] = Array(height).fill(null).map(() => Array(width).fill(0))

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (mask[y][x] === 0) continue

        let sum = 0
        let weightSum = 0

        for (let k = 0; k < kernel.length; k++) {
          const dy = k - padSize
          const ny = y + dy

          // Edge handling - clamp to boundary
          const clampedY = Math.max(0, Math.min(height - 1, ny))
          
          if (mask[clampedY][x] > 0) {
            sum += array[clampedY][x] * kernel[k]
            weightSum += kernel[k]
          }
        }

        result[y][x] = weightSum > 0 ? sum / weightSum : 0
      }
    }

    return result
  }

  /**
   * Normalized Gaussian Blur 적용
   * grid_0811.py 라인 272-301
   * 
   * @param array 입력 2D 배열
   * @param mask 마스크 배열 (1: 유효, 0: 무효)
   * @param sigmaCellsY Y축 시그마 (셀 단위)
   * @param sigmaCellsX X축 시그마 (셀 단위)
   * @returns 블러 적용된 2D 배열
   */
  public applyNormalizedBlur(
    array: number[][],
    mask: number[][],
    sigmaCellsY: number,
    sigmaCellsX: number
  ): number[][] {
    // 커널 생성
    const kernelX = this.createGaussianKernel1D(sigmaCellsX)
    const kernelY = this.createGaussianKernel1D(sigmaCellsY)

    // Separable 2D convolution
    // 1. Horizontal pass
    const tempResult = this.convolve1DHorizontal(array, kernelX, mask)
    
    // 2. Vertical pass
    const blurredResult = this.convolve1DVertical(tempResult, kernelY, mask)

    // 3. Mask 적용 및 정규화
    const height = array.length
    const width = array[0].length
    const finalResult: number[][] = Array(height).fill(null).map(() => Array(width).fill(0))

    // 총합 보존을 위한 정규화
    let originalSum = 0
    let blurredSum = 0

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (mask[y][x] > 0) {
          originalSum += array[y][x]
          blurredSum += blurredResult[y][x]
        }
      }
    }

    const normalizationFactor = blurredSum > 0 ? originalSum / blurredSum : 1

    // 최종 결과 생성 (마스크 적용 + 정규화)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (mask[y][x] > 0) {
          finalResult[y][x] = blurredResult[y][x] * normalizationFactor
        }
      }
    }

    return finalResult
  }

  /**
   * 격자 데이터에 블러 적용 (편의 메서드)
   */
  public smoothGridData(
    gridData: Map<number, number>,
    gridInfo: { row: number; col: number }[],
    gridSize: { rows: number; cols: number },
    sigmaCells: number
  ): Map<number, number> {
    // 2D 배열로 변환
    const array: number[][] = Array(gridSize.rows).fill(null)
      .map(() => Array(gridSize.cols).fill(0))
    const mask: number[][] = Array(gridSize.rows).fill(null)
      .map(() => Array(gridSize.cols).fill(0))

    // 격자 데이터를 2D 배열로 매핑
    gridData.forEach((value, gridId) => {
      const info = gridInfo[gridId]
      if (info) {
        array[info.row][info.col] = value
        mask[info.row][info.col] = 1
      }
    })

    // 블러 적용
    const smoothed = this.applyNormalizedBlur(
      array,
      mask,
      sigmaCells,
      sigmaCells
    )

    // 다시 Map으로 변환
    const result = new Map<number, number>()
    gridInfo.forEach((info, gridId) => {
      if (mask[info.row][info.col] > 0) {
        result.set(gridId, smoothed[info.row][info.col])
      }
    })

    return result
  }
}