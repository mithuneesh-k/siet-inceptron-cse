import { useState, useEffect, useCallback } from 'react';
import { 
  CalendarCheck, PlusCircle, ListFilter, RefreshCw, AlertCircle, 
  CheckCircle2, Search, Calendar, MapPin, Building2, Users, FileText, 
  Clock, ShieldAlert, ArrowRight, UserCheck, Check, X, GraduationCap,
  CheckCheck, Trash2, Crown
} from 'lucide-react';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';

// Helper to compute initials for stylish student avatars
function getStudentInitials(name) {
  if (!name) return 'ST';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function TeamOdFaculty({ onRecordCreated }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('create'); // 'create' | 'records'

  // Form State
  const [formData, setFormData] = useState({
    team_name: '',
    event_name: '',
    venue: '',
    college_name: '',
    start_date: '',
    end_date: '',
    team_details: '',
    remarks: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submissionConfirmation, setSubmissionConfirmation] = useState(null);

  // Classroom Student Selection State - strictly scoped to faculty's class with cross-section support
  const facultyClass = user?.advising_class || 'CSE-C';
  const [sectionFilter, setSectionFilter] = useState('allotted'); // 'allotted' | 'CSE-A' | 'CSE-B' | 'CSE-C' | 'all'
  const [classroomStudents, setClassroomStudents] = useState([]);
  const [classroomLoading, setClassroomLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [memberMode, setMemberMode] = useState('select'); // 'select' | 'manual'
  const [selectedStudents, setSelectedStudents] = useState([]);

  // Records State
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Load classroom students with class/section scoping
  const loadClassroomStudents = useCallback(async () => {
    setClassroomLoading(true);
    try {
      const params = {};
      if (sectionFilter === 'allotted') {
        if (facultyClass) params.class = facultyClass;
      } else if (sectionFilter !== 'all') {
        params.class = sectionFilter;
      }
      if (user?.advising_batch) params.batch = user.advising_batch;
      const res = await client.get('/admin/students', { params });
      const list = Array.isArray(res.data) ? res.data : [];
      setClassroomStudents(list);
    } catch (err) {
      console.error('Failed to load classroom students:', err);
    } finally {
      setClassroomLoading(false);
    }
  }, [facultyClass, sectionFilter, user?.advising_batch]);

  useEffect(() => {
    loadClassroomStudents();
  }, [loadClassroomStudents]);

  // Synchronize team_details text whenever selectedStudents changes
  const updateTeamDetailsFromSelection = (newList) => {
    setSelectedStudents(newList);
    if (!newList || newList.length === 0) {
      setFormData(prev => ({ ...prev, team_details: '' }));
      return;
    }
    const lines = newList.map((s, idx) => {
      const roleStr = s.role ? ` - ${s.role}` : '';
      const rollStr = s.roll_no ? ` (${s.roll_no})` : '';
      return `${idx + 1}. ${s.name}${rollStr}${roleStr}`;
    });
    setFormData(prev => ({ ...prev, team_details: lines.join('\n') }));
  };

  const toggleStudentSelection = (student) => {
    const isAlreadySelected = selectedStudents.some(s => s.user_id === student.user_id || s.id === student.id);
    let updated;
    if (isAlreadySelected) {
      updated = selectedStudents.filter(s => s.user_id !== student.user_id && s.id !== student.id);
    } else {
      const defaultRole = selectedStudents.length === 0 ? 'Team Lead' : 'Member';
      updated = [...selectedStudents, {
        id: student.id,
        user_id: student.user_id,
        name: student.name,
        roll_no: student.roll_no || student.reg_no,
        class: student.class,
        role: defaultRole
      }];
    }
    updateTeamDetailsFromSelection(updated);
  };

  const updateStudentRole = (studentId, newRole) => {
    const updated = selectedStudents.map(s => {
      if (s.id === studentId || s.user_id === studentId) {
        return { ...s, role: newRole };
      }
      return s;
    });
    updateTeamDetailsFromSelection(updated);
  };

  const filteredClassroomStudents = classroomStudents
    .filter(s => {
      if (sectionFilter === 'allotted') return !facultyClass || s.class === facultyClass;
      if (sectionFilter === 'all') return true;
      return s.class === sectionFilter;
    })
    .filter(s => {
      if (!studentSearch.trim()) return true;
      const q = studentSearch.toLowerCase();
      return (
        (s.name || '').toLowerCase().includes(q) ||
        (s.roll_no || '').toLowerCase().includes(q) ||
        (s.class || '').toLowerCase().includes(q)
      );
    });

  const handleSelectAllFiltered = () => {
    const currentKeys = new Set(selectedStudents.map(s => String(s.user_id || s.id)));
    const newItems = [];
    filteredClassroomStudents.forEach(s => {
      const key = String(s.user_id || s.id);
      if (!currentKeys.has(key)) {
        newItems.push({
          id: s.id,
          user_id: s.user_id,
          name: s.name,
          roll_no: s.roll_no || s.reg_no,
          class: s.class,
          role: selectedStudents.length + newItems.length === 0 ? 'Team Lead' : 'Member'
        });
      }
    });
    if (newItems.length > 0) {
      updateTeamDetailsFromSelection([...selectedStudents, ...newItems]);
    }
  };

  const handleClearAllSelected = () => {
    updateTeamDetailsFromSelection([]);
  };

  const handleClearSelection = () => {
    updateTeamDetailsFromSelection([]);
  };

  const handleSetTeamLead = (studentId) => {
    const updated = selectedStudents.map(s => {
      const isTarget = s.id === studentId || s.user_id === studentId;
      return {
        ...s,
        role: isTarget ? 'Team Lead' : (s.role === 'Team Lead' ? 'Member' : s.role)
      };
    });
    updateTeamDetailsFromSelection(updated);
  };

  // Load faculty's submitted records
  const loadMyRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const res = await client.get('/team-od/mine');
      if (res.data?.success) {
        setRecords(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load my Team OD records:', err);
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'records') {
      loadMyRecords();
    }
  }, [activeTab, loadMyRecords]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    // Frontend validations
    const cleanTeam = formData.team_name.trim();
    const cleanEvent = formData.event_name.trim();
    const cleanVenue = formData.venue.trim();
    const cleanCollege = formData.college_name.trim();

    if (!cleanTeam) return setFormError('Please enter a team name.');
    if (!cleanEvent) return setFormError('Please enter the event name.');
    if (!cleanVenue) return setFormError('Please enter the event venue or place.');
    if (!cleanCollege) return setFormError('Please enter the hosting college or organization.');
    if (!formData.start_date) return setFormError('Please select an event start date.');
    if (!formData.end_date) return setFormError('Please select an event end date.');

    const startMs = new Date(formData.start_date).getTime();
    const endMs = new Date(formData.end_date).getTime();
    if (endMs < startMs) {
      return setFormError('Event end date cannot be earlier than start date.');
    }

    try {
      setSubmitting(true);
      const res = await client.post('/team-od', {
        team_name: cleanTeam,
        event_name: cleanEvent,
        venue: cleanVenue,
        college_name: cleanCollege,
        start_date: formData.start_date,
        end_date: formData.end_date,
        team_details: formData.team_details.trim(),
        remarks: formData.remarks.trim(),
        students: selectedStudents
      });

      if (res.data?.success) {
        const createdData = res.data.data;
        setSubmissionConfirmation({
          message: 'Team OD submitted successfully. Your request has been sent to the HOD and is awaiting review.',
          record: createdData,
          submittedAt: new Date().toISOString()
        });
        setFormSuccess('Team OD submitted successfully. Your request has been sent to the HOD and is awaiting review.');
        setFormData({
          team_name: '',
          event_name: '',
          venue: '',
          college_name: '',
          start_date: '',
          end_date: '',
          team_details: '',
          remarks: ''
        });
        setSelectedStudents([]);
        setStudentSearch('');

        if (onRecordCreated) onRecordCreated(createdData);
        
        // Immediately reload records and switch to records view so user sees their submission
        loadMyRecords();
        setActiveTab('records');
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to submit Team OD record. Please check details and try again.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter records by search
  const filteredRecords = records.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.team_name || '').toLowerCase().includes(q) ||
      (r.event_name || '').toLowerCase().includes(q) ||
      (r.venue || '').toLowerCase().includes(q) ||
      (r.college_name || '').toLowerCase().includes(q) ||
      (r.team_details || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="team-od-faculty-container animate-fadeIn">
      {/* Sleek Section Header matching Admin Panel design */}
      <div className="section-header" style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text)', margin: 0 }}>
            <CalendarCheck size={20} color="var(--color-green)" /> Team OD & Event Reporting
          </h3>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>
            Submit official On-Duty (OD) records for student competition teams.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="badge badge-green" style={{ fontSize: 12, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
            <UserCheck size={14} /> {user?.name || 'Faculty Advisor'} {user?.advising_class ? `(${user.advising_class})` : ''}
          </span>
        </div>
      </div>

      {/* Sub-view Navigation Tabs */}
      <div className="tab-bar" style={{ marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => setActiveTab('create')}
          className={`tab-item ${activeTab === 'create' ? 'active' : ''}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <PlusCircle size={15} />
          Create Team OD
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('records')}
          className={`tab-item ${activeTab === 'records' ? 'active' : ''}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <ListFilter size={15} />
          My Team OD Records ({records.length})
        </button>
      </div>

      {/* Real Submission Confirmation Banner */}
      {submissionConfirmation && (
        <div
          className="card animate-fadeInUp"
          style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1.5px solid var(--color-green)',
            borderRadius: 12,
            padding: '16px 20px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 14
          }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <CheckCircle2 size={22} color="var(--color-green)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text)', marginBottom: 4 }}>
                Team OD submitted successfully. Your request has been sent to the HOD and is awaiting review.
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, fontSize: 12, color: 'var(--color-text-muted)', marginTop: 6 }}>
                <span><strong>Event:</strong> {submissionConfirmation.record?.event_name}</span>
                <span><strong>Team:</strong> {submissionConfirmation.record?.team_name}</span>
                <span><strong>Dates:</strong> {submissionConfirmation.record?.start_date} to {submissionConfirmation.record?.end_date}</span>
                <span><strong>Status:</strong> <span className="badge badge-yellow" style={{ fontSize: 11, padding: '2px 8px' }}>Pending HOD Review</span></span>
                <span><strong>Submitted:</strong> {new Date().toLocaleDateString()}</span>
                {submissionConfirmation.record?.students?.length > 0 && (
                  <span><strong>Students:</strong> {submissionConfirmation.record.students.length} attached</span>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSubmissionConfirmation(null)}
            className="btn btn-ghost btn-sm"
            style={{ padding: '4px 8px', color: 'var(--color-text-muted)' }}
            title="Dismiss confirmation"
          >
            ✕
          </button>
        </div>
      )}

      {/* Urgent Alert Banner: When HOD marks any record Not Reported */}
      {records.some(r => r.reporting_status === 'not_reported') && (
        <div
          className="card animate-fadeIn"
          style={{
            background: 'rgba(220, 38, 38, 0.1)',
            border: '1.5px solid #DC2626',
            borderRadius: 12,
            padding: '14px 18px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={20} color="#EF4444" style={{ flexShrink: 0 }} />
            <div>
              <strong style={{ color: '#EF4444', fontSize: 13.5 }}>Attention Required from HOD:</strong>{' '}
              <span style={{ fontSize: 13, color: 'var(--color-text)' }}>
                Your team has not reported back after the event. Please meet the HOD.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setActiveTab('records'); setSearch(''); }}
            className="btn btn-sm"
            style={{ background: '#DC2626', color: '#fff', border: 'none', fontSize: 12 }}
          >
            View Affected Record
          </button>
        </div>
      )}

      {/* VIEW 1: CREATE TEAM OD FORM */}
      {activeTab === 'create' && (
        <div
          className="card create-od-form-card"
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '24px 28px'
          }}
        >
          <h3 style={{ margin: '0 0 18px 0', fontSize: 16, fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarCheck size={18} color="var(--color-green)" /> Submit Team On-Duty (OD) Details
          </h3>

          {formError && (
            <div
              className="animate-fadeIn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'rgba(220, 38, 38, 0.1)',
                border: '1px solid #EF4444',
                color: '#EF4444',
                padding: '12px 16px',
                borderRadius: 8,
                marginBottom: 20,
                fontSize: 13.5
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{formError}</span>
            </div>
          )}

          {formSuccess && (
            <div
              className="animate-fadeIn"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid #10B981',
                color: '#10B981',
                padding: '12px 16px',
                borderRadius: 8,
                marginBottom: 20,
                fontSize: 13.5
              }}
            >
              <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
              <span>{formSuccess}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18, marginBottom: 18 }}>
              {/* Team Name */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
                  Team Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    name="team_name"
                    value={formData.team_name}
                    onChange={handleInputChange}
                    placeholder="e.g. Inceptron Robotics Alpha"
                    className="form-input"
                    maxLength={200}
                    required
                  />
                </div>
              </div>

              {/* Event Name */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
                  Event Name <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  name="event_name"
                  value={formData.event_name}
                  onChange={handleInputChange}
                  placeholder="e.g. Smart India Hackathon 2026"
                  className="form-input"
                  maxLength={200}
                  required
                />
              </div>

              {/* Venue */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
                  Event Venue or City <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    name="venue"
                    value={formData.venue}
                    onChange={handleInputChange}
                    placeholder="e.g. Campus Auditorium, IIT Madras, Chennai"
                    className="form-input"
                    maxLength={200}
                    required
                  />
                </div>
              </div>

              {/* College / Organization */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
                  Hosting College or Organization <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  name="college_name"
                  value={formData.college_name}
                  onChange={handleInputChange}
                  placeholder="e.g. Indian Institute of Technology Madras"
                  className="form-input"
                  maxLength={200}
                  required
                />
              </div>

              {/* Start Date */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
                  Event Start Date <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>

              {/* End Date */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
                  Event End Date <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  className="form-input"
                  required
                />
              </div>
            </div>

            {/* Team Members Details - Interactive Student Selector */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
                  Team Members & Details <span style={{ color: '#EF4444' }}>*</span>
                </label>

                {/* Mode Selector */}
                <div style={{ display: 'inline-flex', background: 'var(--bg-glass-card, rgba(255,255,255,0.05))', padding: 3, borderRadius: 8, border: '1px solid var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => setMemberMode('select')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: memberMode === 'select' ? 700 : 500,
                      background: memberMode === 'select' ? 'var(--color-green)' : 'transparent',
                      color: memberMode === 'select' ? '#ffffff' : 'var(--color-text-muted)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <GraduationCap size={14} />
                    Select from Classroom ({selectedStudents.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setMemberMode('manual')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 12px',
                      borderRadius: 6,
                      fontSize: 12,
                      fontWeight: memberMode === 'manual' ? 700 : 500,
                      background: memberMode === 'manual' ? 'var(--color-green)' : 'transparent',
                      color: memberMode === 'manual' ? '#ffffff' : 'var(--color-text-muted)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <FileText size={14} />
                    Manual Text Input
                  </button>
                </div>
              </div>

              {memberMode === 'select' ? (
                <div
                  style={{
                    background: 'var(--bg-glass-card, rgba(255,255,255,0.02))',
                    border: '1.5px solid var(--border-strong)',
                    borderRadius: 12,
                    padding: 16
                  }}
                >
                  {/* Top Bar: Section Filters & Search */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 14 }}>
                    {/* Section Switcher Tabs */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4 }}>
                        Section:
                      </span>
                      {[
                        { id: 'allotted', label: `My Allotted (${facultyClass} ⭐)` },
                        { id: 'CSE-A', label: 'CSE-A' },
                        { id: 'CSE-B', label: 'CSE-B' },
                        { id: 'CSE-C', label: 'CSE-C' },
                        { id: 'all', label: 'All CSE' },
                      ].map(sec => {
                        const isActive = sectionFilter === sec.id;
                        return (
                          <button
                            key={sec.id}
                            type="button"
                            onClick={() => setSectionFilter(sec.id)}
                            style={{
                              fontSize: 11.5,
                              padding: '4px 10px',
                              borderRadius: 6,
                              cursor: 'pointer',
                              fontWeight: isActive ? 700 : 500,
                              background: isActive ? 'var(--color-green)' : 'rgba(255,255,255,0.05)',
                              color: isActive ? '#ffffff' : 'var(--color-text-muted)',
                              border: isActive ? '1px solid var(--color-green)' : '1px solid var(--border)',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {sec.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Search Bar with clear button */}
                    <div style={{ position: 'relative', minWidth: 240, flex: 1, maxWidth: 360 }}>
                      <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
                      <input
                        type="text"
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                        placeholder="Search student name or roll no…"
                        className="form-input"
                        style={{ width: '100%', paddingLeft: 34, paddingRight: studentSearch ? 30 : 12, paddingTop: 7, paddingBottom: 7, fontSize: 12.5 }}
                      />
                      {studentSearch && (
                        <button
                          type="button"
                          onClick={() => setStudentSearch('')}
                          style={{
                            position: 'absolute',
                            right: 8,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer',
                            fontSize: 12,
                            padding: 4
                          }}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Actions & Stats Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 10,
                      padding: '8px 12px',
                      background: 'rgba(0,0,0,0.2)',
                      borderRadius: 8,
                      marginBottom: 12,
                      fontSize: 12
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-text-muted)' }}>
                      <span>Showing <strong style={{ color: 'var(--color-text)' }}>{filteredClassroomStudents.length}</strong> students</span>
                      <span>·</span>
                      <span style={{ color: selectedStudents.length > 0 ? 'var(--accent-text, #10b981)' : 'inherit', fontWeight: selectedStudents.length > 0 ? 700 : 500 }}>
                        <strong style={{ color: selectedStudents.length > 0 ? 'var(--accent-text, #10b981)' : 'var(--color-text)' }}>{selectedStudents.length}</strong> selected for team
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {filteredClassroomStudents.length > 0 && (
                        <button
                          type="button"
                          onClick={handleSelectAllFiltered}
                          style={{
                            background: 'none',
                            border: '1px solid var(--border)',
                            color: 'var(--accent-text, #10b981)',
                            borderRadius: 6,
                            padding: '3px 8px',
                            fontSize: 11.5,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <CheckCheck size={12} />
                          Select All Filtered
                        </button>
                      )}
                      {selectedStudents.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearSelection}
                          style={{
                            background: 'none',
                            border: '1px solid rgba(220, 38, 38, 0.4)',
                            color: '#EF4444',
                            borderRadius: 6,
                            padding: '3px 8px',
                            fontSize: 11.5,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}
                        >
                          <Trash2 size={12} />
                          Clear Selection
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Student Picker List */}
                  <div
                    style={{
                      maxHeight: 210,
                      overflowY: 'auto',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      background: 'var(--bg-card)',
                      padding: 6,
                      marginBottom: 16
                    }}
                  >
                    {classroomLoading ? (
                      <div style={{ padding: '24px', textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)' }}>
                        <RefreshCw size={18} className="sc-spin-anim" style={{ margin: '0 auto 6px' }} />
                        Loading classroom students...
                      </div>
                    ) : filteredClassroomStudents.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)' }}>
                        No students found matching "{studentSearch}" in section {facultyClass}.
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 6 }}>
                        {filteredClassroomStudents.map(s => {
                          const isSelected = selectedStudents.some(sel => sel.user_id === s.user_id || sel.id === s.id);
                          return (
                            <div
                              key={s.id || s.user_id}
                              onClick={() => toggleStudentSelection(s)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 12px',
                                borderRadius: 6,
                                cursor: 'pointer',
                                background: isSelected ? 'var(--accent-soft-2, rgba(16, 185, 129, 0.15))' : 'transparent',
                                border: isSelected ? '1px solid var(--color-green)' : '1px solid var(--border-light, rgba(255,255,255,0.05))',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  style={{ cursor: 'pointer', accentColor: 'var(--color-green)' }}
                                />
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontSize: 12.5, fontWeight: isSelected ? 700 : 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {s.name}
                                  </div>
                                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>
                                    {s.roll_no || s.reg_no} · {s.class}
                                  </div>
                                </div>
                              </div>
                              {isSelected && <Check size={14} color="var(--color-green)" />}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Selected Members Section with Roles */}
                  {selectedStudents.length > 0 ? (
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-text)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Users size={14} color="var(--color-green)" />
                        Selected Team Members ({selectedStudents.length}):
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                        {selectedStudents.map((s, idx) => (
                          <div
                            key={s.id || s.user_id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: 10,
                              background: 'var(--bg-card)',
                              padding: '8px 14px',
                              borderRadius: 8,
                              border: '1px solid var(--border)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 800, background: 'var(--green-100, #dcfce7)', color: 'var(--green-800, #166534)', padding: '2px 6px', borderRadius: 4 }}>
                                #{idx + 1}
                              </span>
                              <div>
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>{s.name}</span>
                                <span style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginLeft: 6, fontFamily: 'monospace' }}>({s.roll_no})</span>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {/* Quick Role Buttons */}
                              <div style={{ display: 'flex', gap: 4 }}>
                                {['Team Lead', 'Member', 'Developer', 'Hardware/IoT', 'Presenter'].map(roleOption => (
                                  <button
                                    key={roleOption}
                                    type="button"
                                    onClick={() => updateStudentRole(s.id || s.user_id, roleOption)}
                                    style={{
                                      fontSize: 11,
                                      padding: '2px 8px',
                                      borderRadius: 4,
                                      cursor: 'pointer',
                                      background: s.role === roleOption ? 'var(--color-green)' : 'transparent',
                                      color: s.role === roleOption ? '#ffffff' : 'var(--color-text-muted)',
                                      border: s.role === roleOption ? '1px solid var(--color-green)' : '1px solid var(--border)'
                                    }}
                                  >
                                    {roleOption === 'Team Lead' ? '👑 Lead' : roleOption}
                                  </button>
                                ))}
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleStudentSelection(s)}
                                title="Remove from team"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  cursor: 'pointer',
                                  color: 'var(--color-text-muted)',
                                  padding: 4,
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <X size={15} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Formatted Text Preview */}
                      <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: 6, fontSize: 11.5, color: 'var(--color-text-muted)', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                        {formData.team_details}
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12.5, color: 'var(--color-text-muted)', textAlign: 'center', padding: '10px 0' }}>
                      💡 Click on students in the list above to add them to this team.
                    </div>
                  )}
                </div>
              ) : (
                /* Manual Input Mode */
                <div>
                  <textarea
                    name="team_details"
                    value={formData.team_details}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="List students participating in this event:&#10;1. Aravind S (7376221CS101) - Team Lead&#10;2. Divya K (7376221CS108) - Fullstack Dev"
                    className="form-input"
                    style={{ width: '100%', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, minHeight: 110 }}
                  />
                  <div style={{ fontSize: 11.5, color: 'var(--color-text-muted)', marginTop: 4 }}>
                    ✍️ You can freely edit or paste custom student details here.
                  </div>
                </div>
              )}
            </div>

            {/* Remarks */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text)', marginBottom: 6 }}>
                Additional Remarks (Optional)
              </label>
              <input
                type="text"
                name="remarks"
                value={formData.remarks}
                onChange={handleInputChange}
                placeholder="e.g. Travel arranged via college bus; competition round 2"
                className="form-input"
                maxLength={500}
              />
            </div>

            {/* Submit Button */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    team_name: '', event_name: '', venue: '', college_name: '',
                    start_date: '', end_date: '', team_details: '', remarks: ''
                  });
                  setSelectedStudents([]);
                  setStudentSearch('');
                }}
                disabled={submitting}
                className="btn btn-ghost"
              >
                Clear Form
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px' }}
              >
                {submitting ? (
                  <>
                    <RefreshCw size={16} className="sc-spin-anim" />
                    Submitting Team OD…
                  </>
                ) : (
                  <>
                    <span>Submit Team OD</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW 2: MY TEAM OD RECORDS */}
      {activeTab === 'records' && (
        <div>
          {/* Controls bar */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18
            }}
          >
            <div style={{ position: 'relative', minWidth: 260, flex: 1, maxWidth: 420 }}>
              <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', pointerEvents: 'none' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search team, event, or college…"
                className="form-input"
                style={{ width: '100%', paddingLeft: 40 }}
              />
            </div>

            <button
              type="button"
              onClick={loadMyRecords}
              disabled={recordsLoading}
              className="btn btn-ghost btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <RefreshCw size={14} className={recordsLoading ? 'sc-spin-anim' : ''} />
              Refresh
            </button>
          </div>

          {recordsLoading ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              <RefreshCw size={24} className="sc-spin-anim" style={{ margin: '0 auto 10px' }} />
              <div>Loading your submitted records…</div>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div
              className="card empty-state"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 14,
                padding: '48px 24px',
                textAlign: 'center'
              }}
            >
              <div className="empty-icon" style={{ marginBottom: 12 }}>
                <CalendarCheck size={44} style={{ color: 'var(--color-green)', opacity: 0.5, margin: '0 auto' }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)', marginBottom: 6 }}>
                No Team OD records found
              </h3>
              <p style={{ margin: 0, fontSize: 13.5, color: 'var(--color-text-muted)', maxWidth: 440, marginLeft: 'auto', marginRight: 'auto' }}>
                {search ? 'No submitted records match your search filter.' : 'You have not submitted any Team OD records yet. Switch to the "Create Team OD" tab to register an event.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {filteredRecords.map(r => {
                const isNotReported = r.reporting_status === 'not_reported';
                return (
                  <div
                    key={r.id}
                    style={{
                      background: 'var(--bg-card, #0f1a2b)',
                      border: `1px solid ${isNotReported ? 'rgba(220, 38, 38, 0.4)' : 'var(--border)'}`,
                      borderRadius: 12,
                      padding: '18px 22px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12
                    }}
                  >
                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>
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
                                padding: '2px 8px',
                                borderRadius: 6
                              }}
                            >
                              <ShieldAlert size={12} />
                              Not Reported (Meet HOD)
                            </span>
                          ) : r.reporting_status === 'informed' ? (
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
                                padding: '2px 8px',
                                borderRadius: 6
                              }}
                            >
                              <CheckCircle2 size={12} />
                              Informed (Follow-up Recorded)
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
                                padding: '2px 8px',
                                borderRadius: 6
                              }}
                            >
                              <Clock size={12} />
                              Pending Review
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-text, #10b981)' }}>
                          {r.event_name}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--color-text-muted)' }}>
                        <Calendar size={14} />
                        <span>{r.start_date} to {r.end_date}</span>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, fontSize: 13 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--color-text-muted)' }}>
                        <Building2 size={14} />
                        <span>{r.college_name}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--color-text-muted)' }}>
                        <MapPin size={14} />
                        <span>{r.venue}</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, fontSize: 12, color: 'var(--color-text-muted)', paddingTop: 2 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={13} />
                        <span>Submitted on {new Date(r.created_at || Date.now()).toLocaleDateString()}</span>
                      </div>
                      {(r.student_count > 0 || r.students?.length > 0) && (
                        <span className="badge badge-green" style={{ fontSize: 11, padding: '2px 8px' }}>
                          <Users size={12} style={{ marginRight: 4 }} />
                          {r.student_count || r.students?.length} Students Selected
                        </span>
                      )}
                    </div>

                    {r.students && r.students.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
                        {r.students.map((st, sIdx) => (
                          <span
                            key={sIdx}
                            style={{
                              fontSize: 11.5,
                              padding: '3px 8px',
                              borderRadius: 6,
                              background: 'var(--bg-glass-card, rgba(255,255,255,0.04))',
                              border: '1px solid var(--border)',
                              color: 'var(--color-text)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4
                            }}
                          >
                            <GraduationCap size={12} color="var(--color-green)" />
                            <strong>{st.name}</strong> ({st.roll_no || st.class})
                            <span style={{ color: 'var(--color-text-muted)' }}>• {st.role || 'Member'}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {r.team_details && (
                      <div
                        style={{
                          background: 'var(--bg-glass-card, rgba(255,255,255,0.02))',
                          border: '1px solid var(--border-light, rgba(255,255,255,0.05))',
                          borderRadius: 8,
                          padding: '10px 14px',
                          fontSize: 12.5,
                          color: 'var(--color-text)'
                        }}
                      >
                        <div style={{ fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Users size={13} />
                          Team Details:
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

                    {isNotReported && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '10px 14px',
                          background: 'rgba(220, 38, 38, 0.08)',
                          border: '1px solid rgba(220, 38, 38, 0.3)',
                          borderRadius: 8,
                          color: '#EF4444',
                          fontSize: 12.5
                        }}
                      >
                        <ShieldAlert size={16} style={{ flexShrink: 0 }} />
                        <span>
                          <strong>Action Required:</strong> The HOD recorded this team as Not Reported. Please meet the HOD with event participation documentation.
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
