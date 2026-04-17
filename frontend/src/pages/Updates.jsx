import { useState, useEffect } from 'react';
import client from '../api/client';
import LiveFeedCard from '../components/LiveFeedCard';

const TABS = [
  { id: 'hackathons', label: '⚡ Hackathons', type: 'hackathon' },
  { id: 'internships', label: '💼 Internships', type: 'internship' },
  { id: 'jobs', label: '🎯 Jobs', type: 'job' },
];

export default function Updates() {
  const [activeTab, setActiveTab] = useState('hackathons');
  const [data, setData] = useState({ hackathons: [], internships: [], jobs: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/updates').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  const items = data[activeTab] || [];
  const type = TABS.find(t => t.id === activeTab)?.type;

  return (
    <div className="page-content">
      <div className="container">
        <div className="updates-header animate-fadeInUp">
          <h1 className="section-title">
            <span className="text-gradient">Live Opportunities</span>
          </h1>
          <p className="section-subtitle">
            Curated hackathons, internships, and entry-level jobs — focused on Tamil Nadu and Indian tech ecosystem.
            <span className="badge badge-green" style={{ marginLeft: 12, verticalAlign: 'middle' }}>● Live</span>
          </p>
        </div>

        <div className="tab-bar animate-fadeInUp delay-1" style={{ marginBottom: '32px' }}>
          {TABS.map(tab => (
            <button key={tab.id} id={`tab-${tab.id}`} className={`tab-item ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
              <span className="badge" style={{ marginLeft: 6, background: 'rgba(255,255,255,0.1)', color: 'inherit', fontSize: 11 }}>
                {(data[tab.id] || []).length}
              </span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="loading-screen"><div className="spinner" /></div>
        ) : (
          <div className="grid-auto animate-fadeIn">
            {items.map(item => (
              <LiveFeedCard key={item.id} item={item} type={type} />
            ))}
            {items.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>No items found</h3>
                <p>Check back soon for updates!</p>
              </div>
            )}
          </div>
        )}

        <div className="updates-info card" style={{ marginTop: '40px', padding: '20px 24px' }}>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span>ℹ️</span>
            Opportunities are curated from Devfolio, Unstop, Internshala, and company career pages. Verify deadlines on official websites before applying.
          </p>
        </div>
      </div>

      <style>{`
        .updates-header { margin-bottom: 28px; }
      `}</style>
    </div>
  );
}
