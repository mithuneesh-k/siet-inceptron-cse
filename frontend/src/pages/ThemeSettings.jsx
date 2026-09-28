import React from 'react';
import { useNavigate } from 'react-router-dom';
import ThemeSection from '../components/ThemeSection';

export default function ThemeSettings() {
  const navigate = useNavigate();

  return (
    <div className="page-content">
      <div className="container" style={{ maxWidth: '720px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Back</button>
          <h1 className="section-title" style={{ margin: 0 }}>Theme & Appearance</h1>
        </div>

        <ThemeSection title="Customize Your Portal Theme" showPreview={true} />
      </div>
    </div>
  );
}
