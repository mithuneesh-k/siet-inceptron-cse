import { useState, useRef } from 'react';
import client from '../api/client';
import { compressImage } from '../utils/imageCompressor';
import { Upload, Link2, Image as ImageIcon, X, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react';

export default function ShowcaseImageInput({
  imageUrl = '',
  imageStoragePath = '',
  onChange,
  label = 'Cover / Showcase Image (Optional)'
}) {
  const [mode, setMode] = useState(imageUrl && !imageStoragePath && imageUrl.startsWith('http') && !imageUrl.includes('supabase.co') ? 'url' : 'file');
  const [uploading, setUploading] = useState(false);
  const [uploadText, setUploadText] = useState('');
  const [uploadError, setUploadError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleProcessFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, WEBP, GIF).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('Image exceeds 10 MB limit.');
      return;
    }

    setUploadError(null);
    setUploading(true);
    setUploadText('Optimizing image…');

    try {
      const compressed = await compressImage(file, { maxWidth: 1600, maxHeight: 1600, quality: 0.85 });
      setUploadText(`Uploading (${formatSize(compressed.size)})…`);

      const formData = new FormData();
      formData.append('file', compressed);

      const res = await client.post('/uploads/showcase', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data?.success && res.data.url) {
        onChange({
          cover_image_url: res.data.url,
          image_storage_path: res.data.storage_ref || null
        });
        setUploadText('');
      } else {
        throw new Error(res.data?.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Image upload failed:', err);
      const msg = err.response?.data?.error || err.message || 'Image upload failed. Please try again.';
      setUploadError(msg);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleProcessFile(file);
  };

  const handleRemoveImage = () => {
    onChange({
      cover_image_url: '',
      image_storage_path: null
    });
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUrlChange = (val) => {
    onChange({
      cover_image_url: val,
      image_storage_path: null
    });
    setUploadError(null);
  };

  return (
    <div className="showcase-image-input-container" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <label className="form-label" style={{ fontWeight: 700, fontSize: 12, margin: 0 }}>
          {label}
        </label>
        
        {/* Mode Selector Tabs */}
        <div style={{ display: 'inline-flex', background: 'var(--color-bg-secondary, rgba(255,255,255,0.06))', borderRadius: 8, padding: 2, border: '1px solid var(--border)' }}>
          <button
            type="button"
            onClick={() => setMode('file')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11.5,
              fontWeight: mode === 'file' ? 700 : 500,
              padding: '3px 10px',
              borderRadius: 6,
              border: 'none',
              background: mode === 'file' ? 'var(--color-green, #10b981)' : 'transparent',
              color: mode === 'file' ? '#ffffff' : 'var(--color-text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Upload size={12} /> Upload File
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 11.5,
              fontWeight: mode === 'url' ? 700 : 500,
              padding: '3px 10px',
              borderRadius: 6,
              border: 'none',
              background: mode === 'url' ? 'var(--color-green, #10b981)' : 'transparent',
              color: mode === 'url' ? '#ffffff' : 'var(--color-text-muted)',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Link2 size={12} /> Image URL
          </button>
        </div>
      </div>

      {/* Mode: FILE UPLOAD */}
      {mode === 'file' && (
        <div>
          {imageUrl ? (
            /* Uploaded Preview Card */
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: 10,
              borderRadius: 10,
              background: 'var(--color-bg-secondary, rgba(255,255,255,0.03))',
              border: '1px solid var(--border)'
            }}>
              <div style={{ width: 68, height: 50, borderRadius: 6, overflow: 'hidden', background: '#000', flexShrink: 0 }}>
                <img
                  src={imageUrl}
                  alt="Post preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="40" viewBox="0 0 60 40"><rect fill="%23222" width="60" height="40"/><text fill="%23888" x="50%" y="55%" text-anchor="middle" font-size="10">Invalid</text></svg>'; }}
                />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--color-green, #10b981)' }}>
                  <CheckCircle2 size={13} />
                  <span>Image Attached</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                  {imageUrl.startsWith('data:') ? 'Local file attached (inline)' : imageUrl}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={() => fileInputRef.current?.click()}
                  title="Replace image"
                  style={{ fontSize: 11.5, padding: '4px 8px' }}
                >
                  Replace
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-xs"
                  onClick={handleRemoveImage}
                  title="Remove image"
                  style={{ color: '#ef4444', fontSize: 11.5, padding: '4px 8px' }}
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          ) : (
            /* Dropzone when empty */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: isDragging ? '2px dashed var(--color-green, #10b981)' : '2px dashed var(--border)',
                background: isDragging ? 'rgba(16, 185, 129, 0.08)' : 'var(--color-bg-secondary, rgba(255,255,255,0.02))',
                borderRadius: 10,
                padding: '20px 16px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {uploading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--color-green, #10b981)' }}>
                  <RefreshCw size={22} className="spin" />
                  <span style={{ fontSize: 12.5, fontWeight: 600 }}>{uploadText}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--color-green, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Upload size={18} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>
                    Click to browse or drag & drop image
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                    PNG, JPG, WEBP up to 5 MB • Automatically optimized for web
                  </div>
                </div>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* Mode: DIRECT IMAGE URL */}
      {mode === 'url' && (
        <div>
          <div style={{ position: 'relative' }}>
            <input
              type="url"
              className="form-input"
              placeholder="https://images.unsplash.com/... or paste image link"
              value={imageUrl}
              onChange={e => handleUrlChange(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', fontSize: 13, paddingRight: imageUrl ? 36 : 12 }}
            />
            {imageUrl && (
              <button
                type="button"
                onClick={handleRemoveImage}
                style={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  padding: 4
                }}
                title="Clear URL"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {imageUrl && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, padding: '6px 10px', borderRadius: 8, background: 'var(--color-bg-secondary, rgba(255,255,255,0.03))', border: '1px solid var(--border)' }}>
              <div style={{ width: 44, height: 32, borderRadius: 4, overflow: 'hidden', background: '#000', flexShrink: 0 }}>
                <img
                  src={imageUrl}
                  alt="URL preview"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
              <span style={{ fontSize: 11.5, color: 'var(--color-text-muted)' }}>Live Image Preview</span>
            </div>
          )}
        </div>
      )}

      {/* Error message if any */}
      {uploadError && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ef4444', fontSize: 12, marginTop: 6 }}>
          <AlertCircle size={13} style={{ flexShrink: 0 }} />
          <span>{uploadError}</span>
        </div>
      )}
    </div>
  );
}
