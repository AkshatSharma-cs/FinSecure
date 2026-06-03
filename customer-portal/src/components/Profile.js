import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './Header';
import { customerAPI } from '../api';
import './Dashboard.css';

// ── Reusable PDF viewer modal ─────────────────────────────────────────────────
function PdfViewerModal({ url, title, onClose }) {
  // Revoke the object URL when the modal unmounts to free memory
  useEffect(() => {
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [url]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 860,
          background: 'white', borderRadius: 12,
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column',
          maxHeight: '90vh', overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px', borderBottom: '1px solid #e2e8f0', flexShrink: 0,
        }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#1a202c' }}>
            📄 {title || 'KYC Document'}
          </span>
          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9', border: 'none', borderRadius: 6,
              padding: '6px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#374151',
            }}
          >
            ✕ Close
          </button>
        </div>
        {/* PDF iframe */}
        <iframe
          src={url}
          title="KYC Document"
          style={{ flex: 1, width: '100%', minHeight: 520, border: 'none' }}
        />
      </div>
    </div>
  );
}

// ── Main Profile component ────────────────────────────────────────────────────
function Profile() {
  const [profile, setProfile] = useState(null);
  const [kycDocs, setKycDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal — upload
  const [showKycModal, setShowKycModal] = useState(false);
  const [kycForm, setKycForm] = useState({
    documentType: 'AADHAAR',
    documentNumber: '',
    fileData: '',
    fileName: '',
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Modal — viewer
  const [viewerUrl, setViewerUrl] = useState(null);
  const [viewerTitle, setViewerTitle] = useState('');
  const [viewLoading, setViewLoading] = useState(false);

  const [message, setMessage] = useState({ text: '', type: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [profileRes, kycRes] = await Promise.all([
        customerAPI.getProfile(),
        customerAPI.getKycDocuments(),
      ]);
      setProfile(profileRes.data.data);
      setKycDocs(kycRes.data.data || []);
    } finally {
      setLoading(false);
    }
  };

  // ── File handling ────────────────────────────────────────────────────────────
  const processFile = useCallback((file) => {
    setFileError('');
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setFileError('Only PDF files are accepted.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setFileError('File size must be under 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setKycForm((prev) => ({ ...prev, fileData: e.target.result, fileName: file.name }));
      setSelectedFile(file);
    };
    reader.onerror = () => setFileError('Could not read the file. Please try again.');
    reader.readAsDataURL(file);
  }, []);

  const handleFileInputChange = (e) => {
    processFile(e.target.files[0] || null);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files[0] || null);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFileError('');
    setKycForm((prev) => ({ ...prev, fileData: '', fileName: '' }));
  };

  // ── Open / close upload modal ────────────────────────────────────────────────
  const openModal = () => {
    setKycForm({ documentType: 'AADHAAR', documentNumber: '', fileData: '', fileName: '' });
    setSelectedFile(null);
    setFileError('');
    setShowKycModal(true);
  };

  // ── Submit upload ────────────────────────────────────────────────────────────
  const handleKycSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) { setFileError('Please select a PDF file to upload.'); return; }
    setSubmitting(true);
    try {
      await customerAPI.uploadKyc(kycForm);
      setMessage({ text: 'KYC document uploaded successfully!', type: 'success' });
      setShowKycModal(false);
      loadData();
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Upload failed.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── View PDF ─────────────────────────────────────────────────────────────────
  const handleViewDoc = async (doc) => {
    setViewLoading(true);
    try {
      const url = await customerAPI.getKycDocumentViewUrl(doc.id);
      setViewerTitle(doc.fileName || doc.documentType.replace(/_/g, ' '));
      setViewerUrl(url);
    } catch {
      setMessage({ text: 'Could not load document. Please try again.', type: 'error' });
    } finally {
      setViewLoading(false);
    }
  };

  // ── Helpers ──────────────────────────────────────────────────────────────────
  const kycBadgeColor = (status) =>
    ({ UPLOADED: '#7c3aed', UNDER_REVIEW: '#d97706', APPROVED: '#059669', REJECTED: '#dc2626' }[status] || '#6b7280');

  const formatBytes = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) return <><Header /><div className="loading">Loading...</div></>;

  return (
    <>
      <Header />
      <div className="page-container">
        <h1 className="page-title">My Profile</h1>

        {message.text && (
          <div className={message.type === 'success' ? 'success-msg' : 'error-msg'} style={{ marginBottom: 16 }}>
            {message.text}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* ── Personal Information ─────────────────────────────────────── */}
          <div className="section-card">
            <div className="section-title" style={{ marginBottom: 20 }}>Personal Information</div>
            {profile && (
              <div style={{ display: 'grid', gap: 14 }}>
                {[
                  { label: 'Full Name',     value: profile.firstName + ' ' + profile.lastName },
                  { label: 'Email',         value: profile.email },
                  { label: 'Username',      value: profile.username },
                  { label: 'Phone',         value: profile.phone },
                  { label: 'Date of Birth', value: profile.dateOfBirth },
                  { label: 'PAN Number',    value: profile.panNumber || 'Not provided' },
                  { label: 'Address',       value: [profile.address, profile.city, profile.state, profile.pinCode].filter(Boolean).join(', ') || 'Not provided' },
                ].map((item) => (
                  <div key={item.label} style={{ display: 'flex', gap: 12 }}>
                    <span style={{ minWidth: 130, fontSize: 13, color: '#718096', fontWeight: 600 }}>{item.label}:</span>
                    <span style={{ fontSize: 14, color: '#1a202c', fontWeight: 500 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            {/* ── KYC Status ────────────────────────────────────────────── */}
            <div className="section-card" style={{ marginBottom: 20 }}>
              <div className="section-title" style={{ marginBottom: 16 }}>KYC Status</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <span style={{ fontSize: 32 }}>
                  {profile?.kycStatus === 'APPROVED' ? '✅' : profile?.kycStatus === 'REJECTED' ? '❌' : '⏳'}
                </span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: kycBadgeColor(profile?.kycStatus) }}>
                    {profile?.kycStatus}
                  </div>
                  <div style={{ fontSize: 13, color: '#718096' }}>
                    {profile?.kycStatus === 'APPROVED' ? 'All features unlocked'
                      : profile?.kycStatus === 'SUBMITTED' ? 'Under review by our team'
                      : profile?.kycStatus === 'REJECTED' ? 'Please resubmit with correct documents'
                      : 'Submit KYC documents to unlock features'}
                  </div>
                </div>
              </div>
              <button
                onClick={openModal}
                style={{ padding: '10px 20px', background: '#3182ce', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, width: '100%' }}
              >
                + Upload KYC Document
              </button>
            </div>

            {/* ── Submitted Documents ───────────────────────────────────── */}
            <div className="section-card">
              <div className="section-title" style={{ marginBottom: 16 }}>Submitted Documents</div>
              {kycDocs.length > 0 ? kycDocs.map((doc) => (
                <div key={doc.id} style={{ padding: '12px 0', borderBottom: '1px solid #f7fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#2d3748' }}>
                      {doc.documentType.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: 12, color: '#718096' }}>
                      {doc.documentNumber}
                      {doc.fileName && <span style={{ marginLeft: 6, color: '#a0aec0' }}>· {doc.fileName}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {doc.hasFile && (
                      <button
                        onClick={() => handleViewDoc(doc)}
                        disabled={viewLoading}
                        style={{ padding: '4px 12px', background: '#ebf8ff', color: '#2b6cb0', border: '1px solid #bee3f8', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                      >
                        {viewLoading ? '…' : '👁 View'}
                      </button>
                    )}
                    <span style={{ padding: '3px 10px', background: kycBadgeColor(doc.status) + '20', color: kycBadgeColor(doc.status), borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                      {doc.status}
                    </span>
                  </div>
                </div>
              )) : (
                <div className="empty-state" style={{ padding: '20px 0' }}>No documents uploaded yet</div>
              )}
            </div>
          </div>
        </div>

        {/* ── KYC Upload Modal ─────────────────────────────────────────────── */}
        {showKycModal && (
          <div className="modal-overlay" onClick={() => setShowKycModal(false)}>
            <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
              <h3 className="modal-title">Upload KYC Document</h3>
              <form onSubmit={handleKycSubmit}>

                <div className="form-group">
                  <label>Document Type</label>
                  <select value={kycForm.documentType} onChange={(e) => setKycForm({ ...kycForm, documentType: e.target.value })}>
                    {['AADHAAR','PAN','PASSPORT','DRIVING_LICENSE','VOTER_ID','UTILITY_BILL','BANK_STATEMENT','SALARY_SLIP'].map((t) => (
                      <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Document Number</label>
                  <input
                    type="text"
                    value={kycForm.documentNumber}
                    onChange={(e) => setKycForm({ ...kycForm, documentNumber: e.target.value })}
                    placeholder="e.g. XXXX-XXXX-XXXX"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Document File{' '}
                    <span style={{ color: '#9ca3af', fontWeight: 400 }}>(PDF only, max 5 MB)</span>
                  </label>

                  {!selectedFile ? (
                    <div
                      onDrop={handleDrop}
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={() => setIsDragging(false)}
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        border: `2px dashed ${isDragging ? '#3182ce' : fileError ? '#e53e3e' : '#cbd5e0'}`,
                        borderRadius: 10, padding: '28px 16px', textAlign: 'center', cursor: 'pointer',
                        background: isDragging ? '#ebf8ff' : fileError ? '#fff5f5' : '#f7fafc',
                        transition: 'all 0.15s', userSelect: 'none',
                      }}
                    >
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#2d3748', marginBottom: 4 }}>
                        {isDragging ? 'Drop your PDF here' : 'Click to browse or drag & drop'}
                      </div>
                      <div style={{ fontSize: 12, color: '#718096' }}>PDF files only · Max 5 MB</div>
                      {fileError && (
                        <div style={{ marginTop: 10, fontSize: 13, color: '#e53e3e', fontWeight: 600 }}>
                          ⚠ {fileError}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ border: '1.5px solid #c6f6d5', borderRadius: 10, padding: '14px 16px', background: '#f0fff4', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 40, height: 40, background: '#e53e3e', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 700, color: 'white', letterSpacing: 0.5 }}>
                        PDF
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#2d3748', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {selectedFile.name}
                        </div>
                        <div style={{ fontSize: 12, color: '#718096', marginTop: 2 }}>{formatBytes(selectedFile.size)}</div>
                      </div>
                      <button type="button" onClick={clearFile} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#718096', fontSize: 18, padding: '2px 6px', borderRadius: 4, flexShrink: 0, lineHeight: 1 }}>✕</button>
                    </div>
                  )}

                  <input ref={fileInputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleFileInputChange} />
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowKycModal(false)}>Cancel</button>
                  <button type="submit" className="btn-submit" disabled={submitting || !selectedFile || !kycForm.documentNumber}>
                    {submitting ? 'Uploading…' : 'Upload Document'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ── PDF Viewer Modal ──────────────────────────────────────────────── */}
      {viewerUrl && (
        <PdfViewerModal
          url={viewerUrl}
          title={viewerTitle}
          onClose={() => { URL.revokeObjectURL(viewerUrl); setViewerUrl(null); }}
        />
      )}
    </>
  );
}

export default Profile;