import { aiAPI } from '../../api/index.js';

const MAX_ORIGINAL_IMAGE_BYTES = 20 * 1024 * 1024;
const MAX_ORIGINAL_IMAGE_MB = MAX_ORIGINAL_IMAGE_BYTES / 1024 / 1024;

export function validateImageFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('请上传图片文件');
  }
  if (file.size > MAX_ORIGINAL_IMAGE_BYTES) {
    throw new Error(`图片原文件不能超过${MAX_ORIGINAL_IMAGE_MB}MB`);
  }
}

const MAX_IMAGE_DIMENSION = 1600;
const JPEG_QUALITY = 0.88;

/**
 * Resize images larger than MAX_IMAGE_DIMENSION and re-encode as JPEG to keep
 * base64 payloads small.  Small PNGs (< 300 KB) are kept as PNG to preserve
 * lossless quality.  All other formats are converted to JPEG.
 */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const { naturalWidth: w, naturalHeight: h } = img;
        const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(w, h));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        const outputType =
          file.type === 'image/png' && file.size < 300_000 ? 'image/png' : 'image/jpeg';
        const dataUrl = canvas.toDataURL(outputType, JPEG_QUALITY);
        resolve({ base64: dataUrl.split(',')[1], mediaType: outputType });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function toImageData(file) {
  return compressImage(file).then(({ base64, mediaType }) => ({
    base64,
    mediaType,
    name: file.name,
  }));
}

export function useImageRecognition({
  setError,
  setText,
  setPromptText,
  setImages,
  setImage,
  setIsRecognizingPrompt,
  setIsRecognizingWriting,
  promptText,
  analyzeTags,
}) {
  const recognizeSingleImage = async (file, type) => {
    validateImageFile(file);
    const image = await toImageData(file);
    const result = await aiAPI.recognizeText({ image, type });
    return { image, result };
  };

  const handlePromptPaste = async (event) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    const imageItem = Array.from(items).find((item) => item.type.includes('image'));
    if (!imageItem) return;

    event.preventDefault();
    const blob = imageItem.getAsFile();
    if (!blob) return;

    const file = new File([blob], 'pasted-image.png', { type: blob.type });
    setIsRecognizingPrompt(true);
    try {
      const { result } = await recognizeSingleImage(file, 'question_requirements');
      if (result.text) {
        const nextPromptText = `${promptText}${promptText && !promptText.endsWith('\n') ? '\n\n' : ''}${result.text}`;
        setPromptText(nextPromptText);
        await analyzeTags(true, { requirements: nextPromptText });
      }
    } catch (error) {
      console.error(error);
      setError(error.message || '题目图片识别失败，请手动输入');
    } finally {
      setIsRecognizingPrompt(false);
    }
  };

  const handleWritingPaste = async (event) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    const imageItem = Array.from(items).find((item) => item.type.includes('image'));
    if (!imageItem) return;

    event.preventDefault();
    const blob = imageItem.getAsFile();
    if (!blob) return;

    const file = new File([blob], 'pasted-image.png', { type: blob.type });
    await handleWritingImage(file);
  };

  const handleWritingImage = async (file) => {
    try {
      validateImageFile(file);
    } catch (error) {
      setError(error.message);
      return;
    }

    setError('');
    setIsRecognizingWriting(true);
    try {
      const { image, result } = await recognizeSingleImage(file, 'student_writing');
      setImages((prev) => [...prev, image]);
      setImage(image);
      if (result.text) {
        setText((prev) => prev + (prev ? '\n\n' : '') + result.text);
      }
    } catch (error) {
      console.error('作文识别失败:', error);
      setError(error.message || '作文识别失败，请稍后重试');
    } finally {
      setIsRecognizingWriting(false);
    }
  };

  const uploadPromptImages = async (files) => {
    if (!files.length) return;
    setError('');
    setIsRecognizingPrompt(true);
    try {
      let allText = '';
      for (const file of files) {
        const { result } = await recognizeSingleImage(file, 'question_requirements');
        if (result.text) {
          allText += (allText ? '\n\n' : '') + result.text;
        }
      }
      if (allText) {
        const nextPromptText = `${promptText}${promptText ? '\n\n' : ''}${allText}`;
        setPromptText(nextPromptText);
        await analyzeTags(true, { requirements: nextPromptText });
      }
    } catch (error) {
      console.error(error);
      setError(error.message || '题目图片识别失败，请手动输入');
    } finally {
      setIsRecognizingPrompt(false);
    }
  };

  return {
    handlePromptPaste,
    handleWritingPaste,
    handleWritingImage,
    uploadPromptImages,
  };
}
