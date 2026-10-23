import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  FileSpreadsheet, Search, RefreshCw, AlertCircle, CheckCircle2, 
  Trash2, BellRing, Calendar, MapPin, Building2, User, Clock, 
  ShieldAlert, Check, X, Filter, AlertTriangle, Users
} from 'lucide-react';
import client from '../api/client';
import ConfirmModal from './ConfirmModal';

export default function TeamOdManagement() {
  const [records, setRecords] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    not_reported: 0,
    upcoming: 0,
    overdue_pending: 0
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'pending' | 'not_reported'
  
  // Reported Action State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Toast / Feedback State
  const [toast, setToast] = useState(null);
  const [fetchError, setFetchError] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Expanded Team Details Modal
  const [expandedRecord, setExpandedRecord] = useState(null);

  // Load active records
  const loadRecords = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const res = await client.get('/team-od');
      if (res.data?.success) {
        const list = res.data.data || [];
        setRecords(list);
        setFetchError(null);
        if (res.data.stats) {
          setStats(res.data.stats);
        } else {
          const today = new Date().toISOString().slice(0, 10);
          setStats({
            total: list.length,
            pending: list.filter(r => r.reporting_status === 'pending').length,
            not_reported: list.filter(r => r.reporting_status === 'not_reported').length,
            upcoming: list.filter(r => r.start_date > today).length,
            overdue_pending: list.filter(r => r.end_date < today && r.reporting_status === 'pending').length
          });
        }
      }
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Failed to load Team OD reporting records from server.';
      setFetchError(errMsg);
      if (!isSilent) {
        showToast(errMsg, 'error');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load and periodic polling (every 15s) for automatic visibility
  useEffect(() => {
    loadRecords(false);
    const interval = setInterval(() => {
      loadRecords(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [loadRecords]);

  // Handle "Reported" action (Confirmation followed by active record deletion)
  const handleConfirmReported = async () => {
    if (!deleteTarget) return;
    try {
      setActionInProgress(true);
      const res = await client.delete(`/team-od/${deleteTarget.id}`);
      if (res.data?.success) {
        showToast(`Team '${deleteTarget.team_name}' confirmed as Reported. Active record removed from database.`, 'success');
        setRecords(prev => prev.filter(r => r.id !== deleteTarget.id));
        setStats(prev => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
          pending: deleteTarget.reporting_status === 'pending' ? Math.max(0, prev.pending - 1) : prev.pending,
          not_reported: deleteTarget.reporting_status === 'not_reported' ? Math.max(0, prev.not_reported - 1) : prev.not_reported
        }));
        setDeleteTarget(null);
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to complete Reported deletion.', 'error');
    } finally {
      setActionInProgress(false);
    }
  };

  // Handle "Not Reported" action
  const handleMarkNotReported = async (record) => {
    try {
      setActionInProgress(true);
      const res = await client.patch(`/team-od/${record.id}/not-reported`);
      if (res.data?.success) {
        showToast(`Team '${record.team_name}' marked as Not Reported. Responsible faculty has been notified.`, 'success');
        setRecords(prev => prev.map(r => r.id === record.id ? { ...r, reporting_status: 'not_reported' } : r));
        setStats(prev => ({
          ...prev,
          pending: Math.max(0, prev.pending - 1),
          not_reported: prev.not_reported + 1
        }));
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update record status to Not Reported.', 'error');
    } finally {
      setActionInProgress(false);
    }
  };

  // Handle "Mark Informed" action
  const handleMarkInformed = async (record) => {
    try {
      setActionInProgress(true);
      const res = await client.patch(`/team-od/${record.id}/informed`);
      if (res.data?.success) {
        showToast(`Team '${record.team_name}' marked as Informed. Follow-up communication recorded.`, 'success');
        setRecords(prev => prev.map(r => r.id === record.id ? { ...r, reporting_status: 'informed', informed_at: new Date().toISOString() } : r));
        setStats(prev => ({
          ...prev,
          not_reported: Math.max(0, prev.not_reported - 1),
          informed: (prev.informed || 0) + 1
        }));
      }
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update status to Informed.', 'error');
    } finally {
      setActionInProgress(false);
    }
  };

  const todayStr = new Date().toISOString().slice(0, 10);

  // Filter records
  const filteredRecords = records.filter(r => {
    if (statusFilter === 'overdue') {
      if (!(r.end_date < todayStr && r.reporting_status === 'pending')) return false;
    } else if (statusFilter !== 'all' && r.reporting_status !== statusFilter) {
      return false;
    }
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.team_name || '').toLowerCase().includes(q) ||
      (r.event_name || '').toLowerCase().includes(q) ||
      (r.faculty_name || '').toLowerCase().includes(q) ||
      (r.college_name || '').toLowerCase().includes(q) ||
      (r.venue || '').toLowerCase().includes(q) ||
      (r.team_details || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="team-od-management-container animate-fadeIn">
      {/* Toast Feedback */}
      {toast && (
        <div
          className="animate-scaleIn"
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: toast.type === 'error' ? 'rgba(220, 38, 38, 0.95)' : 'rgba(16, 185, 129, 0.95)',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: 10,
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            fontSize: 13.5,
            fontWeight: 600,
            maxWidth: 420
          }}
        >
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div
        style={{
          background: 'var(--bg-glass-card, rgba(255,255,255,0.03))',
          border: '1px solid var(--border)',
          borderRadius: 14,
          padding: '20px 24px',
          marginBottom: 24,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <FileSpreadsheet size={22} color="var(--accent-primary, #10b981)" />
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: 'var(--color-text)' }}>
              Team OD Reporting Management
            </h2>
          </div>
          <p style={{ margin: 0, fontSize: 13.5, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>
            Monitor and record post-event reporting outcomes for student teams On-Duty. Submissions by faculty appear here automatically.
          </p>
        </div>

        <button
          type="button"
          onClick={() => loadRecords(false)}
          disabled={refreshing}
          className="btn btn-ghost"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13 }}
        >
          <RefreshCw size={14} className={refreshing ? 'sc-spin-anim' : ''} />
          {refreshing ? 'Syncing…' : 'Refresh Feed'}
        </button>
      </div>

      {/* ── HOD Alert & Notification Banners ── */}
      {stats.overdue_pending > 0 && (
        <div
          className="animate-fadeIn"
          style={{
            background: 'rgba(220, 38, 38, 0.12)',
            border: '1.5px solid rgba(220, 38, 38, 0.45)',
            borderRadius: 12,
            padding: '14px 18px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertTriangle size={22} color="#EF4444" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 700, color: '#EF4444', fontSize: 14 }}>
                Action Required: {stats.overdue_pending} team(s) have concluded their events and are overdue for post-event reporting.
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', marginTop: 2 }}>
                The event end date has passed. You can send immediate reminder notifications to responsible faculty or update their status.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStatusFilter('overdue')}
            className="btn btn-sm"
            style={{
              background: '#DC2626',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: 12.5,
              padding: '8px 16px',
              borderRadius: 8
            }}
          >
            Review Overdue ({stats.overdue_pending})
          </button>
        </div>
      )}

      {/* Summary Statistics Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 14,
          marginBottom: 24
        }}
      >
        {/* Total Active */}
        <div
          style={{
            background: 'var(--bg-card, #0f1a2b)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '16px 18px'
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>
            TOTAL ACTIVE OD
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--color-text)' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 4 }}>
            Events currently active
          </div>
        </div>

        {/* Pending Records */}
        <div
          style={{
            background: 'var(--bg-card, #0f1a2b)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '16px 18px'
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>
            PENDING OUTCOME
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#F59E0B' }}>
            {stats.pending}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 4 }}>
            Awaiting HOD action
          </div>
        </div>

        {/* Not Reported */}
        <div
          style={{
            background: 'var(--bg-card, #0f1a2b)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '16px 18px'
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>
            NOT REPORTED
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#EF4444' }}>
            {stats.not_reported}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 4 }}>
            Faculty meeting requested
          </div>
        </div>

        {/* Upcoming Events */}
        <div
          style={{
            background: 'var(--bg-card, #0f1a2b)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '16px 18px'
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>
            UPCOMING EVENTS
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent-text, #10b981)' }}>
            {stats.upcoming}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 4 }}>
            Starts in the future
          </div>
        </div>

        {/* Overdue Pending */}
        <div
          style={{
            background: 'var(--bg-card, #0f1a2b)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '16px 18px'
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>
            OVERDUE PENDING
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#DC2626' }}>
            {stats.overdue_pending}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 4 }}>
            Event ended, not yet reported
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20
        }}
      >
        <div style={{ position: 'relative', minWidth: 280, flex: 1, maxWidth: 440 }}>
          <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by team, event, faculty, or college…"
            className="form-input"
            style={{ width: '100%', paddingLeft: 40 }}
          />
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 8, fontSize: 12.5 }}
          >
            All ({records.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className={`btn btn-sm ${statusFilter === 'pending' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 8, fontSize: 12.5 }}
          >
            Pending ({stats.pending})
          </button>
          {stats.overdue_pending > 0 && (
            <button
              type="button"
              onClick={() => setStatusFilter('overdue')}
              className={`btn btn-sm ${statusFilter === 'overdue' ? 'btn-primary' : 'btn-ghost'}`}
              style={{
                borderRadius: 8,
                fontSize: 12.5,
                background: statusFilter === 'overdue' ? '#DC2626' : 'rgba(220, 38, 38, 0.15)',
                color: statusFilter === 'overdue' ? '#fff' : '#EF4444',
                borderColor: '#DC2626'
              }}
            >
              ⚠️ Overdue ({stats.overdue_pending})
            </button>
          )}
          <button
            type="button"
            onClick={() => setStatusFilter('not_reported')}
            className={`btn btn-sm ${statusFilter === 'not_reported' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 8, fontSize: 12.5 }}
          >
            Not Reported ({stats.not_reported})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('informed')}
            className={`btn btn-sm ${statusFilter === 'informed' ? 'btn-primary' : 'btn-ghost'}`}
            style={{ borderRadius: 8, fontSize: 12.5 }}
          >
            Informed ({stats.informed || 0})
          </button>
        </div>
      </div>

      {/* Main Records List / Table */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--color-text-muted)' }}>
          <RefreshCw size={28} className="sc-spin-anim" style={{ margin: '0 auto 12px' }} />
          <div>Loading Team OD records from database…</div>
        </div>
      ) : fetchError && records.length === 0 ? (
        <div
          style={{
            background: 'var(--bg-card, #0f1a2b)',
            border: '1.5px solid rgba(220, 38, 38, 0.4)',
            borderRadius: 14,
            padding: '50px 20px',
            textAlign: 'center',
            color: 'var(--color-text-muted)'
          }}
        >
          <AlertCircle size={40} color="#EF4444" style={{ margin: '0 auto 14px' }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>
            Server Connection Issue
          </div>
          <p style={{ margin: '0 auto 16px auto', fontSize: 13.5, maxWidth: 440, color: '#EF4444' }}>
            {fetchError}
          </p>
          <button
            type="button"
            onClick={() => loadRecords(false)}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <RefreshCw size={14} /> Retry Connection
          </button>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div
          style={{
            background: 'var(--bg-card, #0f1a2b)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '50px 20px',
            textAlign: 'center',
            color: 'var(--color-text-muted)'
          }}
        >
          <FileSpreadsheet size={40} style={{ margin: '0 auto 14px', opacity: 0.4 }} />
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>
            No Active Team OD Records Found
          </div>
          <p style={{ margin: 0, fontSize: 13.5, maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
            {search || statusFilter !== 'all'
              ? 'No records match the selected filters. Try clearing your search.'
              : 'When faculty members submit Team OD records for off-campus events, they will automatically appear here for HOD reporting.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {filteredRecords.map(r => {
            const isNotReported = r.reporting_status === 'not_reported';
            const isInformed = r.reporting_status === 'informed';
            const isOverdue = r.end_date < todayStr && r.reporting_status === 'pending';

            return (
              <div
                key={r.id}
                style={{
                  background: 'var(--bg-card, #0f1a2b)',
                  border: `1.5px solid ${isNotReported ? 'rgba(220, 38, 38, 0.4)' : isInformed ? 'rgba(59, 130, 246, 0.4)' : isOverdue ? 'rgba(245, 158, 11, 0.4)' : 'var(--border)'}`,
                  borderRadius: 12,
                  padding: '20px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
                }}
              >
                {/* Top Row: Team Name, Event, Status Badge */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--color-text)' }}>
                        {r.team_name}
                      </span>

                      {/* Status Badge */}
                      {isNotReported ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            background: 'rgba(220, 38, 38, 0.12)',
                            border: '1px solid #DC2626',
                            color: '#EF4444',
                            fontSize: 12,
                            fontWeight: 700,
                            padding: '2px 9px',
                            borderRadius: 6
                          }}
                        >
                          <ShieldAlert size={12} />
                          Not Reported
                        </span>
                      ) : isInformed ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            background: 'rgba(59, 130, 246, 0.12)',
                            border: '1px solid #3B82F6',
                            color: '#60A5FA',
                            fontSize: 12,
                            fontWeight: 700,
                            padding: '2px 9px',
                            borderRadius: 6
                          }}
                        >
                          <CheckCircle2 size={12} />
                          Informed
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            background: 'rgba(217, 119, 6, 0.12)',
                            border: '1px solid #D97706',
                            color: '#F59E0B',
                            fontSize: 12,
                            fontWeight: 700,
                            padding: '2px 9px',
                            borderRadius: 6
                          }}
                        >
                          <Clock size={12} />
                          Pending Review
                        </span>
                      )}

                      {isOverdue && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4,
                            background: 'rgba(220, 38, 38, 0.15)',
                            color: '#DC2626',
                            fontSize: 11,
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 6
                          }}
                        >
                          <AlertTriangle size={11} />
                          Event Ended (Awaiting Reporting)
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--accent-text, #10b981)' }}>
                      {r.event_name}
                    </div>
                  </div>

                  {/* Dates */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 13,
                      color: 'var(--color-text-muted)',
                      background: 'var(--bg-glass-card, rgba(255,255,255,0.03))',
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border)'
                    }}
                  >
                    <Calendar size={14} />
                    <span>{r.start_date} → {r.end_date}</span>
                  </div>
                </div>

                {/* Details Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, fontSize: 13 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-muted)' }}>
                    <Building2 size={15} color="var(--accent-primary, #10b981)" />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Hosting College</div>
                      <div style={{ color: 'var(--color-text)', fontWeight: 600 }}>{r.college_name}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-muted)' }}>
                    <MapPin size={15} color="var(--accent-primary, #10b981)" />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Venue / Place</div>
                      <div style={{ color: 'var(--color-text)', fontWeight: 600 }}>{r.venue}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-muted)' }}>
                    <User size={15} color="var(--accent-primary, #10b981)" />
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' }}>Responsible Faculty</div>
                      <div style={{ color: 'var(--color-text)', fontWeight: 600 }}>
                        {r.faculty_name} ({r.faculty_designation || 'Faculty'})
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team Details Preview / Expanded */}
                {r.team_details && (
                  <div
                    style={{
                      background: 'var(--bg-glass-card, rgba(255,255,255,0.02))',
                      border: '1px solid var(--border-light, rgba(255,255,255,0.05))',
                      borderRadius: 8,
                      padding: '12px 16px',
                      fontSize: 12.5,
                      color: 'var(--color-text)'
                    }}
                  >
                    <div style={{ fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={13} />
                      Team Members / Participants:
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                      {r.team_details}
                    </div>
                  </div>
                )}

                {r.remarks && (
                  <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
                    Remarks: {r.remarks}
                  </div>
                )}

                {/* Action Buttons for HOD */}
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: 10,
                    borderTop: '1px solid var(--border)',
                    gap: 12
                  }}
                >
                  <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                    Submission ID: <code style={{ fontSize: 11 }}>{r.id.slice(0, 8)}…</code>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {/* STATUS ACTION BUTTONS */}
                    {r.reporting_status === 'pending' ? (
                      <button
                        type="button"
                        onClick={() => handleMarkNotReported(r)}
                        disabled={actionInProgress}
                        className="btn btn-ghost btn-sm"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          color: '#EF4444',
                          border: '1px solid rgba(220, 38, 38, 0.4)',
                          borderRadius: 8,
                          padding: '6px 14px'
                        }}
                      >
                        <ShieldAlert size={14} />
                        Not Reported
                      </button>
                    ) : r.reporting_status === 'not_reported' ? (
                      <>
                        <span
                          style={{
                            fontSize: 12,
                            color: '#EF4444',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <BellRing size={13} />
                          Faculty Notified
                        </span>
                        <button
                          type="button"
                          onClick={() => handleMarkInformed(r)}
                          disabled={actionInProgress}
                          className="btn btn-secondary btn-sm"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            color: '#38BDF8',
                            border: '1px solid rgba(56, 189, 248, 0.4)',
                            background: 'rgba(56, 189, 248, 0.08)',
                            borderRadius: 8,
                            padding: '6px 14px'
                          }}
                        >
                          <CheckCircle2 size={14} />
                          Mark Informed
                        </button>
                      </>
                    ) : (
                      <span
                        style={{
                          fontSize: 12,
                          color: '#34D399',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          background: 'rgba(16, 185, 129, 0.12)',
                          padding: '4px 10px',
                          borderRadius: 6,
                          border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}
                      >
                        <CheckCircle2 size={13} />
                        Case Informed & Acknowledged
                      </span>
                    )}

                    {/* REPORTED BUTTON (Opens Confirmation Dialog) */}
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(r)}
                      disabled={actionInProgress}
                      className="btn btn-primary btn-sm"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        borderRadius: 8,
                        padding: '6px 16px',
                        background: 'linear-gradient(135deg, #059669, #10B981)'
                      }}
                    >
                      <Check size={14} />
                      Reported (Clear Active)
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog for "Reported" Action */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Confirm Team Reported & Remove Active Record"
        message="Marking this team as Reported will remove its active Team OD record from the database. Are you sure you want to continue?"
        itemName={deleteTarget ? `Team: "${deleteTarget.team_name}" — Event: "${deleteTarget.event_name}"` : ''}
        confirmText="Confirm & Remove Record"
        cancelText="Cancel"
        confirmVariant="danger"
        iconType="danger"
        onConfirm={handleConfirmReported}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
