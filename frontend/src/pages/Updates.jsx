import { useState, useEffect } from 'react';
import client from '../api/client';
import LiveFeedCard from '../components/LiveFeedCard';
import ExpandableEventCard from '../components/ui/expandable-event-card';
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
  const [filterDate, setFilterDate] = useState('');
  const [expandedCardId, setExpandedCardId] = useState(null);

  useEffect(() => {
    client.get('/updates')
      .then(r => setData(r.data))
      .catch(err => {
        console.error('Failed to fetch updates:', err);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setFilterType('');
    setExpandedCardId(null);
  };

  const type = TABS.find(t => t.id === activeTab)?.type;
  let items = data[activeTab] || [];

  const getFilterTypeOptions = () => {
    if (activeTab === 'hackathons') {
      return [
        { value: '', label: 'All Modes' },
        { value: 'online', label: 'Online' },
        { value: 'in-person', label: 'In-Person' },
        { value: 'beginner', label: 'Beginner Friendly' }
      ];
    } else if (activeTab === 'internships') {
      return [
        { value: '', label: 'All Types' },
        { value: 'online', label: 'Remote / Online' },
        { value: 'paid', label: 'Paid Stipend' }
      ];
    } else {
      return [
        { value: '', label: 'All Types' },
        { value: 'full time', label: 'Full Time' },
        { value: 'remote', label: 'Remote / Online' }
      ];
    }
  };

  const dateOptions = [
    { value: '', label: 'Any Time' },
    { value: 'urgent', label: 'Closing Soon (7 Days)' },
    { value: 'month', label: 'Closing Soon (30 Days)' },
    { value: 'past_month', label: 'Posted / Active Recently' }
  ];
  
  // Apply local filtering
  if (search.trim()) {
    const q = search.toLowerCase();
    items = items.filter(i => 
      (i.title || '').toLowerCase().includes(q) ||
      (i.organizer || i.company || '').toLowerCase().includes(q) ||
      (i.description || '').toLowerCase().includes(q) ||
      (i.location || i.mode || '').toLowerCase().includes(q) ||
      (i.tags || []).some(t => String(t).toLowerCase().includes(q))
    );
  }

  if (filterType) {
    const ft = filterType.toLowerCase();
    items = items.filter(i => {
      const mode = (i.mode || i.location || '').toLowerCase();
      const diff = (i.difficulty || '').toLowerCase();
      const typeStr = (i.type || i.subtype || '').toLowerCase();
      const isPaid = i.isPaid || (i.stipend && !i.stipend.toLowerCase().includes('unpaid'));

      if (ft === 'online' || ft === 'remote') {
        return mode.includes('online') || mode.includes('remote');
      }
      if (ft === 'in-person' || ft === 'offline') {
        return mode.includes('offline') || mode.includes('person') || mode.includes('office') || (!mode.includes('online') && !mode.includes('remote'));
      }
      if (ft === 'beginner') {
        return diff.includes('beginner') || diff.includes('open') || diff === '' || (i.tags || []).some(t => String(t).toLowerCase().includes('beginner'));
      }
      if (ft === 'paid') {
        return Boolean(isPaid);
      }
      if (ft === 'full time') {
        return typeStr.includes('full') || mode.includes('full');
      }

      return mode.includes(ft) || diff.includes(ft) || typeStr.includes(ft);
    });
  }

  if (filterDate) {
    const now = new Date();
    items = items.filter(i => {
      const dateStr = i.deadline || i.endDate || i.startDate || i.updatedAt || i.created_at;
      if (!dateStr) return true;
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return true;
      
      const diffMs = d - now;
      const diffDays = diffMs / (1000 * 60 * 60 * 24);

      if (filterDate === 'urgent') {
        return diffDays >= -1 && diffDays <= 14;
      }
      if (filterDate === 'month') {
        return diffDays >= -2 && diffDays <= 45;
      }
      if (filterDate === 'past_month') {
        return Math.abs(diffDays) <= 90 || diffDays >= 0;
      }
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
            <span className="badge badge-green">● Live</span>
            <span className="badge badge-blue" style={{ marginLeft: 6 }}>🎓 Student Portal Exclusive</span>
          </p>
        </div>

        <div className="tab-bar animate-fadeInUp delay-1" style={{ marginBottom: '20px' }}>
          {TABS.map(tab => (
            <button key={tab.id} id={`tab-${tab.id}`} className={`tab-item ${activeTab === tab.id ? 'active' : ''}`} onClick={() => handleTabChange(tab.id)}>
              {tab.label}
              <span className="badge" style={{ marginLeft: 6, background: 'rgba(15, 32, 9, 0.08)', color: 'inherit', fontSize: 11 }}>
                {(data[tab.id] || []).length}
              </span>
            </button>
          ))}
        </div>

        <div className="updates-filters animate-fadeInUp delay-2 card" style={{ padding: '16px 20px', marginBottom: '32px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', position: 'relative', zIndex: 100, overflow: 'visible' }}>
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
          <div style={{ flex: '1 1 160px' }}>
            <CustomSelect 
              value={filterType} 
              onChange={setFilterType} 
              placeholder="All Types / Modes"
              options={getFilterTypeOptions()} 
            />
          </div>
          <div style={{ flex: '1 1 160px' }}>
            <CustomSelect 
              value={filterDate} 
              onChange={setFilterDate} 
              placeholder="Any Time"
              options={dateOptions} 
            />
          </div>
        </div>

        {loading ? (
          <div className="loading-screen"><div className="spinner" /></div>
        ) : (
          <div className="grid-auto animate-fadeIn" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20, alignItems: 'start' }}>
            {items.map(item => (
              <ExpandableEventCard
                key={item.id}
                item={{ ...item, type: item.type || type }}
                isExpanded={expandedCardId === item.id}
                onToggle={() => setExpandedCardId(prev => prev === item.id ? null : item.id)}
              />
            ))}
            {items.length === 0 && (
              <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
                <div className="empty-icon" style={{ marginBottom: '16px' }}>
                  <Inbox size={48} color="var(--color-green)" strokeWidth={1.5} opacity={0.6} />
                </div>
                <h3>No opportunities found</h3>
                <p>We couldn't find any items matching your filters.</p>
                {(search || filterType || filterDate) && (
                  <button className="btn btn-secondary" onClick={() => {setSearch(''); setFilterType(''); setFilterDate(''); setExpandedCardId(null);}}>
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

