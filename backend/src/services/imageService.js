const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

class ImageService {
  /**
   * 이미지 전처리 파이프라인
   * - 크기 조정 (OCR 최적 해상도)
   * - 밝기/대비 최적화
   * - 회전 보정
   * - 노이즈 제거 (샤프닝)
   */
  async preprocessImage(inputPath, outputPath = null) {
    try {
      if (!outputPath) {
        const ext = path.extname(inputPath);
        const dir = path.dirname(inputPath);
        const base = path.basename(inputPath, ext);
        outputPath = path.join(dir, `${base}_processed${ext}`);
      }

      const metadata = await sharp(inputPath).metadata();

      let pipeline = sharp(inputPath)
        // EXIF 기반 자동 회전
        .rotate()
        // 최대 너비 2000px로 제한 (OCR 정확도와 처리 속도 균형)
        .resize({
          width: Math.min(metadata.width || 2000, 2000),
          withoutEnlargement: true,
          fit: 'inside',
        })
        // 그레이스케일 변환 (OCR 정확도 향상)
        .grayscale()
        // 대비 향상
        .normalise()
        // 약한 샤프닝 (텍스트 선명도 향상)
        .sharpen({
          sigma: 1.5,
          m1: 0.5,
          m2: 0.5,
        })
        // JPEG 품질 90%로 압축
        .jpeg({ quality: 90 });

      await pipeline.toFile(outputPath);

      const outputMetadata = await sharp(outputPath).metadata();
      const outputStats = fs.statSync(outputPath);

      return {
        success: true,
        originalPath: inputPath,
        processedPath: outputPath,
        originalSize: fs.statSync(inputPath).size,
        processedSize: outputStats.size,
        width: outputMetadata.width,
        height: outputMetadata.height,
      };
    } catch (error) {
      console.error('이미지 전처리 오류:', error);
      return {
        success: false,
        error: error.message,
        originalPath: inputPath,
      };
    }
  }

  /**
   * 이미지 품질 검사
   */
  async checkImageQuality(imagePath) {
    try {
      const metadata = await sharp(imagePath).metadata();
      const stats = await sharp(imagePath).stats();

      const issues = [];

      // 해상도 검사
      if (metadata.width < 500 || metadata.height < 500) {
        issues.push('해상도가 너무 낮습니다. 더 가까이에서 촬영해주세요.');
      }

      // 밝기 검사 (평균 밝기가 너무 낮거나 높음)
      const avgBrightness = stats.channels[0]?.mean || 0;
      if (avgBrightness < 50) {
        issues.push('이미지가 너무 어둡습니다. 밝은 곳에서 다시 촬영해주세요.');
      } else if (avgBrightness > 230) {
        issues.push('이미지가 너무 밝습니다. 직사광선을 피해 촬영해주세요.');
      }

      return {
        isAcceptable: issues.length === 0,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        avgBrightness: Math.round(avgBrightness),
        issues,
      };
    } catch (error) {
      return {
        isAcceptable: false,
        issues: [`이미지 분석 실패: ${error.message}`],
      };
    }
  }

  /**
   * 썸네일 생성
   */
  async createThumbnail(inputPath, outputPath, width = 200) {
    try {
      await sharp(inputPath)
        .resize(width, null, { fit: 'inside' })
        .jpeg({ quality: 70 })
        .toFile(outputPath);
      return { success: true, path: outputPath };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new ImageService();
