/**
 * Client-side image compression utility.
 * Compresses and resizes high-resolution images down to ~100-250 KB
 * before network upload, dramatically accelerating post and broadcast speeds.
 */

export async function compressImage(file, options = {}) {
  const {
    maxWidth = 1400,
    maxHeight = 1400,
    quality = 0.82,
    minSizeToCompress = 200 * 1024 // Don't re-compress if under 200 KB unless oversized
  } = options;

  if (!file || !file.type || !file.type.startsWith('image/')) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(file);
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => resolve(file);
      img.onload = () => {
        try {
          let { width, height } = img;

          // Determine if resizing is necessary
          const needsResize = width > maxWidth || height > maxHeight;
          const isLargeFile = file.size > minSizeToCompress;

          if (!needsResize && !isLargeFile && file.type !== 'image/png') {
            return resolve(file);
          }

          if (needsResize) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) return resolve(file);

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Keep WebP if source is WebP, otherwise compress to JPEG for optimal size & speed
          let outputType = file.type === 'image/webp' ? 'image/webp' : 'image/jpeg';

          canvas.toBlob(
            (blob) => {
              if (!blob || blob.size >= file.size) {
                // If blob creation failed or didn't reduce size, fallback to original
                return resolve(file);
              }

              let newFileName = file.name;
              if (outputType === 'image/jpeg' && !newFileName.toLowerCase().endsWith('.jpg') && !newFileName.toLowerCase().endsWith('.jpeg')) {
                newFileName = newFileName.replace(/\.[^/.]+$/, "") + '.jpg';
              }

              const compressedFile = new File([blob], newFileName, {
                type: outputType,
                lastModified: Date.now()
              });

              resolve(compressedFile);
            },
            outputType,
            quality
          );
        } catch {
          resolve(file);
        }
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
