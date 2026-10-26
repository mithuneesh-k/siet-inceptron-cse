import { useState, useRef } from 'react';
import client from '../api/client';
import { 
  UploadCloud, FileSpreadsheet, FileText, CheckCircle2, 
  AlertCircle, X, Loader2, ArrowRight, Check, AlertTriangle 
} from 'lucide-react';

export default function MarksheetUploadModal({ onClose, onSuccess, showToast }) {
  const [file, setFile] = useState(null);
  const [semester, setSemester] = useState('auto');
  const [examSession, setExamSession] = useState('auto');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selected) => {
    setError(null);
    const ext = selected.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv', 'pdf'].includes(ext)) {
      setError('Please select an Excel (.xlsx, .xls), CSV (.csv), or PDF (.pdf) file.');
      return;
    }
    if (selected.size > 40 * 1024 * 1024) {
      setError('File size exceeds the 40 MB limit.');
      return;
    }
    setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    if (semester !== 'auto') formData.append('semester', semester);
    if (examSession !== 'auto') formData.append('exam_session', examSession);

    try {
      const res = await client.post('/academics/upload-marksheet', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setResult(res.data?.summary || res.data);
      if (showToast) {
        showToast(res.data?.message || 'Marksheet uploaded and records updated successfully!');
      }
      if (onSuccess) {
        onSuccess(res.data);
      }
    } catch (err) {
      console.error('Marksheet upload error:', err);
      const errMsg = err?.response?.data?.error || err.message || 'Failed to process marksheet';
      setError(errMsg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div 
      className="modal-backdrop animate-fadeIn"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !uploading) onClose();
      }}
    >
      <div 
        className="card animate-scaleUp"
        style={{
          width: '100%',
          maxWidth: '620px',
          maxHeight: '90vh',
          overflowY: 'auto',
          padding: '28px',
          background: 'var(--bg-card, #121c16)',
          borderRadius: '16px',
          border: '1px solid var(--color-border)',
          boxShadow: '0 20px 45px rgba(0,0,0,0.5)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div 
              style={{ 
                width: 44, 
                height: 44, 
                borderRadius: '12px', 
                background: 'rgba(16, 185, 129, 0.15)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                color: 'var(--accent-text, #10b981)'
              }}
            >
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--color-text)' }}>
                Advisor Marksheet Upload
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                Auto-matches students by Register No & Name, calculates CGPA & Standing Arrears (RA)
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            disabled={uploading}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              color: 'var(--color-text-muted)', 
              cursor: uploading ? 'not-allowed' : 'pointer',
              padding: '6px',
              borderRadius: '8px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Success View */}
        {result ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div 
              style={{ 
                background: 'rgba(16, 185, 129, 0.12)', 
                border: '1px solid rgba(16, 185, 129, 0.3)', 
                borderRadius: '12px', 
                padding: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}
            >
              <CheckCircle2 size={24} color="#10b981" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 style={{ margin: 0, fontSize: '15px', color: '#10b981', fontWeight: '700' }}>
                  Marksheet Processed & Records Updated!
                </h4>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  All student scores, course results, and standing arrears (RA) have been updated in the database.
                </p>
              </div>
            </div>

            {/* Stat Summary Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#10b981' }}>
                  {result.matchedStudents || 0}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: '4px' }}>
                  Students Updated
                </div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '22px', fontWeight: '800', color: 'var(--accent-text)' }}>
                  {result.coursesUpdated || 0}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: '4px' }}>
                  Courses Updated
                </div>
              </div>
              <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '22px', fontWeight: '800', color: (result.unmatchedCount || 0) > 0 ? '#f59e0b' : '#10b981' }}>
                  {result.unmatchedCount || 0}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginTop: '4px' }}>
                  Unmatched
                </div>
              </div>
            </div>

            {/* Unmatched list if any */}
            {result.unmatched && result.unmatched.length > 0 && (
              <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '10px', padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f59e0b', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
                  <AlertTriangle size={16} /> Unmatched Rows ({result.unmatched.length})
                </div>
                <div style={{ maxHeight: '120px', overflowY: 'auto', fontSize: '12px' }}>
                  {result.unmatched.map((u, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <span>{u.name || u.rollNo || `Page ${u.page}`}</span>
                      <span style={{ color: 'var(--color-text-muted)' }}>{u.reason || 'No match'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={onClose}
                style={{ padding: '8px 20px' }}
              >
                Close & Refresh
              </button>
            </div>
          </div>
        ) : (
          /* Upload View */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Options */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                  Semester
                </label>
                <select 
                  className="form-control" 
                  value={semester} 
                  onChange={(e) => setSemester(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                >
                  <option value="auto">Auto-detect from file</option>
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                  <option value="3">Semester 3</option>
                  <option value="4">Semester 4</option>
                  <option value="5">Semester 5</option>
                  <option value="6">Semester 6</option>
                  <option value="7">Semester 7</option>
                  <option value="8">Semester 8</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '6px' }}>
                  Exam Session
                </label>
                <select 
                  className="form-control" 
                  value={examSession} 
                  onChange={(e) => setExamSession(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                >
                  <option value="auto">Auto-detect from file</option>
                  <option value="APR 2026">APR 2026</option>
                  <option value="NOV 2025">NOV 2025</option>
                  <option value="MAY 2025">MAY 2025</option>
                  <option value="NOV 2024">NOV 2024</option>
                </select>
              </div>
            </div>

            {/* Drag & Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragActive ? 'var(--accent-primary, #10b981)' : file ? '#10b981' : 'var(--color-border)'}`,
                borderRadius: '12px',
                padding: '30px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragActive ? 'rgba(16, 185, 129, 0.08)' : file ? 'rgba(16, 185, 129, 0.04)' : 'var(--bg-secondary)',
                transition: 'all 0.2s ease'
              }}
            >
              <input 
                ref={fileInputRef} 
                type="file" 
                accept=".xlsx,.xls,.csv,.pdf" 
                style={{ display: 'none' }} 
                onChange={handleFileChange} 
              />

              {file ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <div style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
                    {file.name.endsWith('.pdf') ? <FileText size={32} /> : <FileSpreadsheet size={32} />}
                  </div>
                  <div style={{ fontWeight: '700', fontSize: '15px', color: 'var(--color-text)' }}>
                    {file.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB • Click or drag to replace
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <UploadCloud size={38} style={{ color: 'var(--color-text-muted)' }} />
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-text)' }}>
                    Drop your Marksheet file here, or <span style={{ color: 'var(--accent-text, #10b981)' }}>browse</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    Supports Excel (.xlsx, .xls), CSV (.csv), or College PDF Marksheets (up to 40 MB)
                  </div>
                </div>
              )}
            </div>

            {/* Error banner */}
            {error && (
              <div 
                style={{ 
                  background: 'rgba(239, 68, 68, 0.12)', 
                  border: '1px solid rgba(239, 68, 68, 0.3)', 
                  color: '#ef4444', 
                  borderRadius: '10px', 
                  padding: '12px 14px', 
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Info hint */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: '10px', padding: '12px 14px', fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: '1.5' }}>
              <strong>Automatic Processing:</strong> The system will match students by <em>Register No</em> or <em>Student Name</em>. Standing arrears are designated for any course with result <strong>RA</strong> or <strong>RA*</strong> until cleared by a subsequent PASS.
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={onClose} 
                disabled={uploading}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                disabled={!file || uploading} 
                onClick={handleUpload}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 22px' }}
              >
                {uploading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing Marksheet...
                  </>
                ) : (
                  <>
                    <ArrowRight size={16} />
                    Process & Update Marks
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
