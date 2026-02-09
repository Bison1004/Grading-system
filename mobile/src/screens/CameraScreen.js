import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, Alert,
  ActivityIndicator, FlatList, SafeAreaView, Platform
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { uploadExam, processOCR } from '../services/apiService';

export default function CameraScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [images, setImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [facing, setFacing] = useState('back');
  const cameraRef = useRef(null);

  // 카메라 권한 요청
  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  // 사진 촬영
  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        exif: false,
      });

      setImages(prev => [...prev, {
        uri: photo.uri,
        fileName: `exam_${Date.now()}.jpg`,
        type: 'image/jpeg',
      }]);
    } catch (error) {
      Alert.alert('촬영 오류', '사진 촬영에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 갤러리에서 이미지 선택
  const pickImages = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 10 - images.length,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map((asset, i) => ({
          uri: asset.uri,
          fileName: asset.fileName || `exam_gallery_${Date.now()}_${i}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        }));
        setImages(prev => [...prev, ...newImages]);
      }
    } catch (error) {
      Alert.alert('선택 오류', '이미지 선택에 실패했습니다.');
    }
  };

  // 이미지 제거
  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // 업로드 및 OCR 처리
  const handleUpload = async () => {
    if (images.length === 0) {
      Alert.alert('알림', '시험지 이미지를 먼저 촬영하거나 선택해주세요.');
      return;
    }

    setUploading(true);
    try {
      // 1단계: 이미지 업로드
      setUploadProgress('📤 이미지 업로드 중...');
      const uploadResult = await uploadExam(images);

      if (!uploadResult.success) {
        throw new Error(uploadResult.error?.message || '업로드 실패');
      }

      const examId = uploadResult.data.examId;

      // 2단계: OCR 처리
      setUploadProgress('🔍 답안 인식 중 (OCR)...');
      const ocrResult = await processOCR(examId);

      if (!ocrResult.success) {
        throw new Error(ocrResult.error?.message || 'OCR 처리 실패');
      }

      // 정답 입력 화면으로 이동
      navigation.navigate('AnswerKey', {
        examId,
        ocrResults: ocrResult.data.questions,
        totalQuestions: ocrResult.data.totalQuestions,
      });
    } catch (error) {
      console.error('업로드/OCR 오류:', error);
      Alert.alert(
        '처리 오류',
        error.response?.data?.error?.message || error.message || '시험지 처리에 실패했습니다.',
        [{ text: '확인' }]
      );
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  // 권한 로딩
  if (!permission) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>카메라 초기화 중...</Text>
      </View>
    );
  }

  // 권한 거부
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Ionicons name="camera-outline" size={64} color="#94A3B8" />
        <Text style={styles.permissionTitle}>카메라 권한 필요</Text>
        <Text style={styles.permissionDesc}>
          시험지를 촬영하려면 카메라 접근 권한이 필요합니다.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>권한 허용하기</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.galleryFallback} onPress={pickImages}>
          <Ionicons name="images" size={20} color="#2563EB" />
          <Text style={styles.galleryFallbackText}>갤러리에서 선택</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // 로딩 오버레이
  if (uploading) {
    return (
      <View style={styles.uploadingContainer}>
        <View style={styles.uploadingCard}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.uploadingText}>{uploadProgress}</Text>
          <Text style={styles.uploadingSubtext}>잠시만 기다려주세요...</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 카메라 뷰 */}
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
        >
          {/* 촬영 가이드라인 */}
          <View style={styles.overlay}>
            <View style={styles.guideBorder}>
              <Text style={styles.guideText}>📄 시험지를 프레임 안에 맞춰주세요</Text>
            </View>
          </View>
        </CameraView>
      </View>

      {/* 촬영된 이미지 미리보기 */}
      {images.length > 0 && (
        <View style={styles.previewSection}>
          <Text style={styles.previewTitle}>촬영된 이미지 ({images.length}장)</Text>
          <FlatList
            data={images}
            horizontal
            renderItem={({ item, index }) => (
              <View style={styles.previewItem}>
                <Image source={{ uri: item.uri }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeImage(index)}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
                <Text style={styles.pageLabel}>{index + 1}p</Text>
              </View>
            )}
            keyExtractor={(_, index) => index.toString()}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          />
        </View>
      )}

      {/* 하단 버튼 영역 */}
      <View style={styles.controls}>
        {/* 갤러리 버튼 */}
        <TouchableOpacity style={styles.sideButton} onPress={pickImages}>
          <Ionicons name="images" size={28} color="#fff" />
          <Text style={styles.sideButtonText}>갤러리</Text>
        </TouchableOpacity>

        {/* 촬영 버튼 */}
        <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
          <View style={styles.captureInner}>
            <Ionicons name="camera" size={32} color="#fff" />
          </View>
        </TouchableOpacity>

        {/* 업로드 버튼 */}
        <TouchableOpacity
          style={[styles.sideButton, images.length === 0 && styles.disabledButton]}
          onPress={handleUpload}
          disabled={images.length === 0}
        >
          <Ionicons name="cloud-upload" size={28} color={images.length > 0 ? '#fff' : '#64748B'} />
          <Text style={[styles.sideButtonText, images.length === 0 && { color: '#64748B' }]}>
            채점 ({images.length})
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1E293B',
    marginTop: 16,
  },
  permissionDesc: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  galleryFallback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
  },
  galleryFallbackText: {
    fontSize: 15,
    color: '#2563EB',
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  guideBorder: {
    width: '85%',
    aspectRatio: 0.7,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 12,
    borderStyle: 'dashed',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 16,
  },
  guideText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  previewSection: {
    backgroundColor: '#1E293B',
    paddingVertical: 10,
  },
  previewTitle: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  previewItem: {
    marginRight: 10,
    position: 'relative',
  },
  previewImage: {
    width: 60,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  removeButton: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  pageLabel: {
    color: '#94A3B8',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingVertical: 16,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
  },
  sideButton: {
    alignItems: 'center',
    gap: 4,
  },
  sideButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.4,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  uploadingCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 40,
    alignItems: 'center',
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  uploadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginTop: 20,
  },
  uploadingSubtext: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 8,
  },
});
