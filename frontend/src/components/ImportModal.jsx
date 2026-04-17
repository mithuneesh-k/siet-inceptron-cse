import { useState, useRef } from 'react';
import client from '../api/client';

const REQUIRED_HEADERS = ['name', 'regno', 'email', 'class', 'batch', 'dateofbirth'];
const HEADER_LABELS = ['name', 'regno', 'email', 'class', 'batch', 'dateOfBirth'];

function parseCSV(text) {
  const lines = text.trim().split('\n').filter(l => l.trim());
  if (lines.length < 2) return { error: 'CSV must have a header row and at least one student row.' };

  const rawHeaders = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, ''));
  // Validate headers
  const missing = REQUIRED_HEADERS.filter(h => !rawHeaders.includes(h));
  if (missing.length > 0) {
    return { error: `Missing required columns: ${missing.join(', ')}` };
  }

  const idxOf = col => rawHeaders.indexOf(col);

  const students = lines.slice(1).map((line, i) => {
    const cols = line.split(',').map(c => c.trim());
    return {
      name: cols[idxOf('name')] || '',
      regno: cols[idxOf('regno')] || '',
      email: cols[idxOf('email')] || '',
      class: cols[idxOf('class')] || '',
      batch: cols[idxOf('batch')] || '',
      dateOfBirth: cols[idxOf('dateofbirth')] || '',
      _row: i + 2,
    };
  }).filter(s => s.name || s.email);

  return { students };
}

export default function ImportModal({ onClose, onImported, showToast }) {
  const [stage, setStage] = useState('format'); // 'format' | 'upload' | 'preview' | 'importing' | 'result'
  const [preview, setPreview] = useState([]);
  const [parseError, setParseError] = useState('');
  const [result, setResult] = useState(null);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef();

  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      const { students, error } = parseCSV(ev.target.result);
      if (error) {
        setParseError(error);
        setPreview([]);
      } else {
        setPreview(students);
        setStage('preview');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setStage('importing');
    try {
      const res = await client.post('/admin/students/import', { students: preview });
      setResult(res.data);
      setStage('result');
      onImported();
    } catch (err) {
      setParseError(err.response?.data?.error || 'Import failed.');
      setStage('preview');
    }
  };

  const handleBackToUpload = () => {
    setPreview([]);
    setParseError('');
    setFileName('');
    setStage('upload');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="modal-overlay" onClick={handleBackdrop}>
      <div className="modal" style={{ maxWidth: 680 }}>

        {/* STAGE: format notice */}
        {stage === 'format' && (
          <>
            <div className="modal-header">
              <h2 className="modal-title">ðŸ“¥ Import Students via CSV</h2>
              <button className="modal-close btn btn-ghost btn-sm" onClick={onClose}>âœ•</button>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div className="alert alert-info" style={{ marginBottom: 16 }}>
                âš ï¸ Please ensure your CSV file matches the <strong>exact format</strong> below before uploading.
              </div>

              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Required CSV Format</h3>
              <div style={{ background: 'var(--bg-primary)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '14px 18px', fontFamily: 'monospace', fontSize: 14, marginBottom: 16 }}>
                {HEADER_LABELS.join(', ')}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[
                  { col: 'name', desc: 'Full name of the student (e.g. MITHUNEESH K)' },
                  { col: 'regno', desc: 'Registration number (e.g. 714025104144)' },
                  { col: 'email', desc: 'Official email address' },
                  { col: 'class', desc: 'Section (e.g. CSE-A, CSE-B)' },
                  { col: 'batch', desc: 'Enrollment year range (e.g. 2025-2029)' },
                  { col: 'dateOfBirth', desc: 'Date in any standard format (e.g. 2006-10-24)' },
                ].map(({ col, desc }) => (
                  <div key={col} style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '10px 14px' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-green)', fontFamily: 'monospace', marginBottom: 2 }}>{col}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{desc}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: 'var(--green-50)', border: '1.5px solid var(--green-200)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', fontSize: 13, color: 'var(--color-green-dark)', marginBottom: 20 }}>
                ðŸ’¡ <strong>Default Password:</strong> All imported students will be assigned the password <code style={{ background: 'var(--green-100)', padding: '1px 6px', borderRadius: 3 }}>password123</code>. They can change it after logging in.
              </div>

              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Example Row</h3>
              <div style={{ background: 'var(--bg-primary)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '12px 18px', fontFamily: 'monospace', fontSize: 12, overflowX: 'auto', color: 'var(--color-text-muted)' }}>
                MITHUNEESH K, 714025104144, mithuneesh@srishakthi.ac.in, CSE-C, 2025-2029, 2006-10-24
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn btn-primary" onClick={() => setStage('upload')}>âœ“ I Understand, Continue â†’</button>
            </div>
          </>
        )}

        {/* STAGE: file upload */}
        {stage === 'upload' && (
          <>
            <div className="modal-header">
              <h2 className="modal-title">ðŸ“‚ Select CSV File</h2>
              <button className="modal-close btn btn-ghost btn-sm" onClick={onClose}>âœ•</button>
            </div>

            <label
              htmlFor="csv-upload"
              className="csv-dropzone"
              onClick={() => fileRef.current?.click()}
            >
              <div style={{ fontSize: 48, marginBottom: 12 }}>ðŸ“„</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Click to select a CSV file</div>
              <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Supports .csv files only</div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFile}
                style={{ display: 'none' }}
              />
            </label>

            {parseError && <div className="alert alert-error" style={{ marginTop: 16 }}>{parseError}</div>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button className="btn btn-ghost" onClick={() => setStage('format')}>â† Back</button>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}

        {/* STAGE: preview */}
        {stage === 'preview' && (
          <>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">ðŸ‘ï¸ Preview Import</h2>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {fileName} â€” <strong>{preview.length}</strong> students found
                </div>
              </div>
              <button className="modal-close btn btn-ghost btn-sm" onClick={onClose}>âœ•</button>
            </div>

            <div style={{ maxHeight: 340, overflowY: 'auto', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-primary)', position: 'sticky', top: 0 }}>
                    {['#', 'Name', 'Reg No', 'Email', 'Class', 'Batch', 'DOB'].map(h => (
                      <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 700, color: 'var(--color-text-muted)', borderBottom: '1.5px solid var(--border)', whiteSpace: 'nowrap', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((s, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '8px 12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>{s.name}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 12 }}>{s.regno}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--color-text-muted)' }}>{s.email}</td>
                      <td style={{ padding: '8px 12px' }}><span className="badge badge-violet">{s.class}</span></td>
                      <td style={{ padding: '8px 12px' }}><span className="badge badge-blue">{s.batch}</span></td>
                      <td style={{ padding: '8px 12px', color: 'var(--color-text-muted)', fontSize: 12 }}>{s.dateOfBirth}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {parseError && <div className="alert alert-error" style={{ marginBottom: 12 }}>{parseError}</div>}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={handleBackToUpload}>â† Choose Different File</button>
              <button className="btn btn-primary" onClick={handleImport}>
                ðŸ“¥ Import {preview.length} Students
              </button>
            </div>
          </>
        )}

        {/* STAGE: importing */}
        {stage === 'importing' && (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <div className="spinner" style={{ margin: '0 auto 20px' }} />
            <div style={{ fontWeight: 700, fontSize: 16 }}>Importing studentsâ€¦</div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 6 }}>This may take a moment.</div>
          </div>
        )}

        {/* STAGE: result */}
        {stage === 'result' && result && (
          <>
            <div className="modal-header">
              <h2 className="modal-title">âœ… Import Complete</h2>
              <button className="modal-close btn btn-ghost btn-sm" onClick={onClose}>âœ•</button>
            </div>

            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <div className="admin-stat card" style={{ flex: 1, borderTop: '3px solid var(--color-green)' }}>
                <div style={{ fontSize: 28 }}>âœ…</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--color-green)', fontFamily: "'Epilogue', sans-serif" }}>{result.success}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Imported</div>
              </div>
              <div className="admin-stat card" style={{ flex: 1, borderTop: '3px solid var(--color-gold)' }}>
                <div style={{ fontSize: 28 }}>âš ï¸</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--color-gold)', fontFamily: "'Epilogue', sans-serif" }}>{result.skipped}</div>
                <div style={{ fontSize: 12, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Skipped</div>
              </div>
            </div>

            {result.errors?.length > 0 && (
              <div style={{ maxHeight: 160, overflowY: 'auto', marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8, color: 'var(--color-text-muted)' }}>Skipped rows:</div>
                {result.errors.map((e, i) => (
                  <div key={i} className="alert alert-error" style={{ fontSize: 12, marginBottom: 6 }}>
                    <strong>{e.name || e.email}</strong>: {e.reason}
                  </div>
                ))}
              </div>
            )}

            <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>Done</button>
          </>
        )}
      </div>
    </div>
  );
}
