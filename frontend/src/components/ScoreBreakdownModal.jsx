import React from 'react';
import { X, Award, Shield, CheckCircle, AlertCircle } from 'lucide-react';

export default function ScoreBreakdownModal({ isOpen, onClose, profile, studentName }) {
  if (!isOpen || !profile) return null;

  const categories = profile.category_breakdown || profile.breakdown || {};

  const categoryLabels = {
    problem_solving: { label: 'Problem Solving', weight: '35%', color: '#3B82F6' },
    competitive_programming: { label: 'Competitive Programming', weight: '25%', color: '#8B5CF6' },
    open_source: { label: 'Open Source', weight: '20%', color: '#10B981' },
    certifications: { label: 'Certifications', weight: '10%', color: '#F59E0B' },
    college_achievements: { label: 'Department Achievements', weight: '10%', color: '#EC4899' }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
    }}>
      <div className="modal-content" style={{
        backgroundColor: '#111827', color: '#F9FAFB', borderRadius: '12px',
        maxWidth: '650px', width: '100%', maxHeight: '90vh', overflowY: 'auto',
        padding: '24px', border: '1px solid #374151', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#10B981' }}>🏆 Competitive Index Breakdown</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#9CA3AF' }}>
              Detailed scoring metrics for <strong>{studentName || 'Student'}</strong> (Version: {profile.scoring_version || 'v1'})
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer' }}>
            <X size={24} />
          </button>
        </div>

        {/* Overall Score Badge */}
        <div style={{
          backgroundColor: '#1F2937', padding: '16px', borderRadius: '8px',
          display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginBottom: '20px',
          border: '1px solid #059669'
        }}>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#9CA3AF', textTransform: 'uppercase' }}>Overall Score</span>
            <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#34D399' }}>
              {profile.overall_score || profile.overallScore || 0} <span style={{ fontSize: '1rem', color: '#6B7280' }}>/ 1000</span>
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: '#9CA3AF', textTransform: 'uppercase' }}>Breadth Bonus</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#FBBF24' }}>
              +{profile.breadth_bonus || profile.breadthBonus || 0} pts
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Object.keys(categoryLabels).map(catKey => {
            const config = categoryLabels[catKey];
            const catData = categories[catKey] || {};
            const score = catData.score || profile[`${catKey}_score`] || 0;
            const platforms = catData.platforms || {};

            return (
              <div key={catKey} style={{
                backgroundColor: '#1F2937', padding: '14px', borderRadius: '8px',
                borderLeft: `4px solid ${config.color}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: '600', color: '#E5E7EB' }}>{config.label} ({config.weight})</span>
                  <span style={{ fontWeight: 'bold', color: config.color }}>{score} / 1000 pts</span>
                </div>

                {/* Platforms under this category */}
                {Object.keys(platforms).length > 0 ? (
                  <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {Object.values(platforms).map(p => (
                      <div key={p.platformCode} style={{
                        fontSize: '0.82rem', backgroundColor: '#111827', padding: '6px 10px',
                        borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {p.eligibleForScoring ? <CheckCircle size={14} color="#10B981" /> : <AlertCircle size={14} color="#F59E0B" />}
                          <span style={{ textTransform: 'capitalize', fontWeight: '500' }}>{p.platformCode} (@{p.username})</span>
                        </div>
                        <div>
                          <span style={{ color: p.eligibleForScoring ? '#34D399' : '#9CA3AF' }}>
                            {p.eligibleForScoring ? `${p.platformScore} pts` : 'Unverified (0 pts)'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: '4px' }}>No connected platforms in this category</div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button onClick={onClose} style={{
            backgroundColor: '#059669', color: '#FFFFFF', padding: '8px 20px',
            borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '600'
          }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
