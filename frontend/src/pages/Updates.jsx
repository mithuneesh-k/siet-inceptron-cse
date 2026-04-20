import { useState, useEffect } from 'react';
import client from '../api/client';
import LiveFeedCard from '../components/LiveFeedCard';

import CustomSelect from '../components/CustomSelect';
import { Zap, Briefcase, Target, Info, Inbox, Search } from 'lucide-react';

const TABS = [
  { id: 'hackathons', label: <><Zap size={15}/> Hackathons</>, type: 'hackathon' },
  { id: 'internships', label: <><Briefcase size={15}/> Internships</>, type: 'internship' },
  { id: 'jobs', label: <><Target size={15}/> Jobs</>, type: 'job' },
];

export default function Updates() {
  const [activeTab, setActiveTab] = useState('hackathons');
  const [data, setData] = useState({ hackathons: [], internships: [], jobs: [] });
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    client.get('/updates').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  const type = TABS.find(t => t.id === activeTab)?.type;

  let items = data[activeTab] || [];
  
  // Apply local filtering
  if (search) {
    const q = search.toLowerCase();
    items = items.filter(i => (i.title || '').toLowerCase().includes(q) || (i.organizer || i.company || '').toLowerCase().includes(q));
  }
  if (filterType) {
    items = items.filter(i => (i.type || i.difficulty || '') === filterType);
  }
  if (filterBatch) {
    items = items.filter(i => i.batch === filterBatch);
  }
  if (filterDate) {
    const now = new Date();
    items = items.filter(i => {
      if (!i.created_at) return true;
      const created = new Date(i.created_at);
      if (filterDate === 'week') return (now - created) < 7 * 24 * 60 * 60 * 1000;
      if (filterDate === 'month') return (now - created) < 30 * 24 * 60 * 60 * 1000;
      return true;
    });
  }

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

        <div className="tab-bar animate-fadeInUp delay-1" style={{ marginBottom: '20px' }}>
          {TABS.map(tab => (
            <button key={tab.id} id={`tab-${tab.id}`} className={`tab-item ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
              <span className="badge" style={{ marginLeft: 6, background: 'rgba(15, 32, 9, 0.08)', color: 'inherit', fontSize: 11 }}>
                {(data[tab.id] || []).length}
              </span>
            </button>
          ))}
        </div>

        <div className="updates-filters animate-fadeInUp delay-2 card" style={{ padding: '16px 20px', marginBottom: '32px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
            <Search size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input 
              type="text" 
              className="form-input" 
              placeholder="Search live feed..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '36px', width: '100%' }}
            />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <CustomSelect 
              value={filterType} 
              onChange={setFilterType} 
              placeholder="All Types"
              options={[{value: '', label: 'All Types'}, {value: 'hackathon', label: 'Hackathons'}, {value: 'job', label: 'Jobs'}]} 
            />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <CustomSelect 
              value={filterBatch} 
              onChange={setFilterBatch} 
              placeholder="All Batches"
              options={[{value: '', label: 'All Batches'}, {value: '2026-2030', label: '2026-2030'}, {value: '2025-2029', label: '2025-2029'}]} 
            />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <CustomSelect 
              value={filterDate} 
              onChange={setFilterDate} 
              placeholder="Any Time"
              options={[{value: '', label: 'Any Time'}, {value: 'week', label: 'Past Week'}, {value: 'month', label: 'Past Month'}]} 
            />
          </div>
        </div>

        {loading ? (
          <div className="loading-screen"><div className="spinner" /></div>
        ) : (
          <div className="grid-auto animate-fadeIn">
            {items.map(item => (
              <LiveFeedCard key={item.id} item={item} type={type} />
            ))}
            {items.length === 0 && (
              <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                <div className="empty-icon" style={{ marginBottom: '16px' }}>
                  <Inbox size={48} color="var(--color-green)" strokeWidth={1.5} opacity={0.6} />
                </div>
                <h3>No opportunities found</h3>
                <p>We couldn't find any items matching your filters.</p>
                {(search || filterType || filterBatch || filterDate) && (
                  <button className="btn btn-secondary" onClick={() => {setSearch(''); setFilterType(''); setFilterBatch(''); setFilterDate('');}}>
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="updates-info card" style={{ marginTop: '40px', padding: '20px 24px' }}>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <span style={{ marginTop: '2px' }}><Info size={16} /></span>
            <span>Opportunities are curated from Devfolio, Unstop, Internshala, and company career pages. Verify deadlines on official websites before applying.</span>
          </p>
        </div>
      </div>

      <style>{`
        .updates-header { margin-bottom: 28px; }
      `}</style>
    </div>
  );
}
