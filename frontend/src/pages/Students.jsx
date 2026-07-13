import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import CustomSelect from '../components/CustomSelect';
import FilterModal from '../components/FilterModal';
import { Search, Star, Link as LinkIcon, GraduationCap, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 100;

export default function Students() {
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const availableClasses = [...new Set(students.map(s => s.class).filter(Boolean))].sort();
  const availableBatches = [...new Set(students.map(s => s.batch).filter(Boolean))].sort();

  useEffect(() => {
    setLoading(true);
    client.get(`/users?page=${page}&limit=${PAGE_SIZE}`).then(res => {
      setStudents(res.data.students);
      setTotal(res.data.total);
    }).finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  let filtered = students;
  if (batchFilter) filtered = filtered.filter(s => s.batch === batchFilter);
  if (classFilter) filtered = filtered.filter(s => s.class === classFilter);
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.roll_no.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    );
  }

  return (
    <div className="page-content">
      <div className="container">
        {/* Header */}
        <div className="section-header animate-fadeInUp" style={{ marginBottom: '28px' }}>
          <div>
            <h1 className="section-title" style={{ fontSize: '32px', display: 'flex', alignItems: 'center', gap: '8px' }}><GraduationCap size={32} className="text-gradient" /> Students</h1>
              <p style={{ color: 'var(--color-text-muted)', marginTop: 6 }}>
                {filtered.length} of {total} students (page {page} of {totalPages}) {batchFilter ? `— ${batchFilter}` : ''} {classFilter ? `— ${classFilter}` : ''}
              </p>
          </div>
        </div>

        {/* Filters */}
        <div className="students-filters animate-fadeInUp" style={{ marginBottom: '24px' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '320px' }}>
            <Search size={16} color="var(--color-text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              id="student-search"
              className="form-input"
              style={{ paddingLeft: '36px', width: '100%' }}
              placeholder="Search by name, roll no..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button 
              className={`btn ${batchFilter || classFilter ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setShowFilters(true)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
              Filters {(batchFilter || classFilter) && '(Active)'}
            </button>
          </div>
        </div>

        <FilterModal 
          isOpen={showFilters} 
          onClose={() => setShowFilters(false)}
          onClear={() => { setBatchFilter(''); setClassFilter(''); }}
        >
          <div className="form-group">
            <label className="form-label">Batch</label>
            <CustomSelect
              value={batchFilter}
              onChange={setBatchFilter}
              options={[{ value: '', label: 'All Batches' }, ...availableBatches.map(b => ({ value: b, label: b }))]}
              placeholder="All Batches"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Section</label>
            <CustomSelect
              value={classFilter}
              onChange={setClassFilter}
              options={[{ value: '', label: 'All Sections' }, ...availableClasses.map(c => ({ value: c, label: c }))]}
              placeholder="All Sections"
            />
          </div>
          {/* Add a spacer so the dropdown menu doesn't get cut off by overflow-y: auto of the modal */}
          <div style={{ height: '120px' }}></div>
        </FilterModal>

        {/* Grid */}
        {loading ? (
          <div className="loading-screen"><div className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon" style={{ marginBottom: '16px' }}><Search size={48} color="var(--color-green)" strokeWidth={1.5} opacity={0.6} /></div>
            <h3>No students found</h3>
            <p>Try adjusting your search or class filter.</p>
          </div>
        ) : (
          <>
          <div className="students-grid animate-fadeInUp">
            {filtered.map(s => (
              <Link
                key={s.id}
                to={`/profile/${s.id}`}
                className="student-card card"
                id={`student-${s.roll_no}`}
              >
                <div className="student-card-avatar">{s.name[0]}</div>
                <div className="student-card-info">
                  <div className="student-card-name">{s.name}</div>
                  <div className="student-card-meta">
                    <span className="badge badge-violet" style={{ fontSize: 10 }}>{s.class}</span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: 12 }}>{s.roll_no}</span>
                  </div>
                  {s.score > 0 && (
                    <div className="student-card-score">
                      <span style={{display: 'inline-flex', alignItems: 'center', gap: '4px'}}><Star size={12} fill="currentColor" /> {s.score} pts</span>
                      <span>· {s.achievement_count} achievements</span>
                    </div>
                  )}
                  {s.github && (
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <LinkIcon size={12} /> {s.github}
                    </div>
                  )}
                </div>
                <div className="student-card-arrow">›</div>
              </Link>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="pagination">
              <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                <ChevronLeft size={16} /> Previous
              </button>
              <span className="pagination-info">Page {page} of {totalPages}</span>
              <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
          </>
        )}
      </div>

      <style>{`
        .students-filters { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
        .students-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
        .student-card { display: flex; align-items: center; gap: 14px; padding: 16px 18px; text-decoration: none; color: inherit; transition: transform 0.2s, box-shadow 0.2s; cursor: pointer; }
        .student-card:hover { transform: translateY(-2px); box-shadow: 0 8px 28px rgba(124,58,237,0.18); border-color: rgba(124,58,237,0.3); }
        .student-card-avatar { width: 46px; height: 46px; border-radius: 50%; background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: #fff; flex-shrink: 0; }
        .student-card-info { flex: 1; min-width: 0; }
        .student-card-name { font-weight: 700; font-size: 14px; color: var(--color-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .student-card-meta { display: flex; align-items: center; gap: 6px; margin-top: 3px; }
        .student-card-score { font-size: 12px; color: var(--color-violet-light); margin-top: 4px; font-weight: 500; }
        .student-card-arrow { font-size: 22px; color: var(--color-text-muted); flex-shrink: 0; }
        .pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 32px; padding: 16px 0; }
        .pagination-info { font-size: 14px; color: var(--color-text-muted); font-weight: 500; }
        .pagination .btn:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
