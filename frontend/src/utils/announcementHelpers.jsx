import { useState } from 'react';

/**
 * Resolves the display image URL for an announcement.
 * Falls back to '/module.png' if no image_url is provided.
 */
export function getAnnouncementImage(announcement) {
  if (announcement && typeof announcement.image_url === 'string' && announcement.image_url.trim()) {
    return announcement.image_url.trim();
  }
  return '/module.png';
}

/**
 * AnnouncementImage component rendering an <img> tag with automatic onError
 * fallback to '/module.png' without infinite error looping.
 */
export function AnnouncementImage({ announcement, alt, style, className, onClick, title }) {
  const initialSrc = getAnnouncementImage(announcement);
  const [imgSrc, setImgSrc] = useState(initialSrc);
  const [hasError, setHasError] = useState(false);

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
      setImgSrc('/module.png');
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt || announcement?.title || 'Announcement'}
      style={style}
      className={className}
      onClick={onClick}
      onError={handleError}
      title={title}
    />
  );
}
