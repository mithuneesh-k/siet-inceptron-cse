import { useState, useRef, useEffect } from 'react';

export default function TruncatedText({ text, maxLines = 3, className = "" }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const textRef = useRef(null);

  useEffect(() => {
    if (textRef.current) {
      setIsTruncated(textRef.current.scrollHeight > textRef.current.clientHeight);
    }
  }, [text]);

  if (!text) return null;

  return (
    <div className={`truncated-text ${className}`}>
      <div 
        ref={textRef} 
        style={{
          display: isExpanded ? 'block' : '-webkit-box',
          WebkitLineClamp: isExpanded ? 'unset' : maxLines,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {text}
      </div>
      {isTruncated && (
        <button 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsExpanded(!isExpanded); }}
          className="btn btn-ghost btn-sm"
          style={{ padding: '0', marginTop: '4px', fontSize: '13px', color: 'var(--color-green)', fontWeight: 600 }}
        >
          {isExpanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}
