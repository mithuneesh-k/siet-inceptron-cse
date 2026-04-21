import React from 'react';

/**
 * FrameLoader — minimal centered loading counter.
 * Shows loading progress in Cindie Mono, white, centered on black.
 */
export function FrameLoader({ loaded, total }) {
  const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000'
      }}
    >
      <p
        className="font-cindie"
        style={{
          color: 'white',
          fontSize: '0.875rem',
          textTransform: 'uppercase',
          letterSpacing: '0.2em',
          fontWeight: 400
        }}
      >
        Loading… {pct}%
      </p>
    </div>
  );
}
