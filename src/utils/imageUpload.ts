import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * 이미지를 압축합니다
 */
export const compressImage = async (file: File, maxSize: number = 800): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // 최대 크기 설정
        let width = img.width;
        let height = img.height;

        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Image compression failed'));
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          0.8
        );
      };
      img.onerror = () => reject(new Error('Image load failed'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('File read failed'));
    reader.readAsDataURL(file);
  });
};

/**
 * 이미지를 Supabase Storage에 업로드합니다 (재시도 로직 포함)
 */
export const uploadImageWithRetry = async (
  bucket: string,
  filePath: string,
  file: File,
  options: {
    maxRetries?: number;
    compress?: boolean;
    maxSize?: number;
    timeoutMs?: number;
    showToast?: boolean;
  } = {}
): Promise<string | null> => {
  const {
    maxRetries = 3,
    compress = true,
    maxSize = 800,
    timeoutMs = 30000,
    showToast = true,
  } = options;

  let attempt = 0;
  let lastError: any;

  while (attempt < maxRetries) {
    try {
      attempt++;
      
      // 이미지 압축 (옵션에 따라)
      const fileToUpload = compress ? await compressImage(file, maxSize) : file;
      
      // 타임아웃 설정
      const uploadPromise = supabase.storage
        .from(bucket)
        .upload(filePath, fileToUpload, { 
          upsert: true,
          cacheControl: '3600',
        });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Upload timeout')), timeoutMs)
      );

      const { error: uploadError } = await Promise.race([
        uploadPromise,
        timeoutPromise
      ]) as any;

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      // 성공 시 캐시 버스팅을 위해 타임스탬프 추가
      return `${data.publicUrl}?t=${Date.now()}`;
    } catch (error) {
      lastError = error;
      console.error(`Upload attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        // 재시도 전 대기 (1초, 2초, 3초)
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }
  }

  // 모든 재시도 실패
  console.error("Error uploading image after retries:", lastError);
  if (showToast) {
    const errorMessage = lastError?.message || '알 수 없는 오류';
    toast.error(`이미지 업로드 실패 (${maxRetries}회 시도): ${errorMessage}`);
  }
  return null;
};

/**
 * 파일 유효성 검증
 */
export const validateImageFile = (file: File, maxSizeMB: number = 5): boolean => {
  // 파일 타입 검증
  if (!file.type.startsWith('image/')) {
    toast.error("이미지 파일만 업로드 가능합니다.");
    return false;
  }

  // 파일 크기 검증
  if (file.size > maxSizeMB * 1024 * 1024) {
    toast.error(`이미지 크기는 ${maxSizeMB}MB 이하여야 합니다.`);
    return false;
  }

  return true;
};
