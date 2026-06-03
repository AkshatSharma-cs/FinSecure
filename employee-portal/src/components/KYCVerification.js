import React, { useState, useEffect } from 'react';
import Header from './Header';
import { employeeAPI } from '../api';

// ── View-only PDF modal ───────────────────────────────────────────────────────
function PdfViewerModal({ url, title, onClose }) {
  useEffect(() => {
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [url]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 2000, padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%', maxWidth: 900,
          background: 'white', borderRadius: 12,
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
          display: 'flex', flexDirection: 'column',
          maxHeight: '90vh', overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 20px', borderBottom: '1px solid #e2e8f0', flexShrink: 0,
          background: '#f8fafc',
        }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>
            📄 {title || 'KYC Document'}
          </span>
          {/* No download button — view only */}
          <button
            onClick={onClose}
            style={{
              background: '#e2e8f0', border: 'none', borderRadius: 6,
              padding: '6px 14px', cursor: 'pointer', fontSize: 13,
              fontWeight: 600, color: '#374151',
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* PDF rendered inline — no download attribute, no Content-Disposition: attachment */}
        <iframe
          src={url}
          title="KYC Document Viewer"
          style={{ flex: 1, width: '100%', minHeight: 560, border: 'none' }}
        />
      </div>
    </div>
  );
}

// ── Main KYCVerification component ───────────────────────────────────────────
function KYCVerification() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Review modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // PDF viewer
  const [viewerUrl, setViewerUrl] = useState(null);
  const [viewerTitle, setViewerTitle] = useState('');
  const [viewLoading, setViewLoading] = useState(false);

  useEffect(() => { loadDocs(); }, [page]);

  const loadDocs = async () => {
    setLoading(true);
    try {
      const res = await employeeAPI.getPendingKyc(page);
      const { content, totalPages } = res.data.data;
      setDocs(content || []);
      setTotalPages(totalPages || 0);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (action) => {
    setSubmitting(true);
    try {
      await employeeAPI.verifyKyc({
        documentId: selectedDoc.id,
        action,
        rejectionReason: action === 'REJECT' ? rejectionReason : null,
      });
      setMessage({ text: `Document ${action}d successfully`, type: 'success' });
      setShowReviewModal(false);
      setSelectedDoc(null);
      setRejectionReason('');
      loadDocs();
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Action failed', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDocument = async (doc) => {
    setViewLoading(doc.id);
    try {
      const url = await employeeAPI.getKycDocumentViewUrl(doc.id);
      setViewerTitle(doc.fileName || doc.documentType.replace(/_/g, ' '));
      setViewerUrl(url);
    } catch {
      setMessage({ text: 'Could not load document. Please try again.', type: 'error' });
    } finally {
      setViewLoading(false);
    }
  };

  const closeViewer = () => {
    if (viewerUrl) URL.revokeObjectURL(viewerUrl);
    setViewerUrl(null);
  };

  const badgeColor = {
    UPLOADED: '#7c3aed', UNDER_REVIEW: '#d97706',
    APPROVED: '#059669', REJECTED: '#dc2626',
  };

  return (
    <>
      <Header />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', marginBottom: 24 }}>
          KYC Verification Queue
        </h1>

        {message.text && (
          <div style={{
            padding: '12px 16px', borderRadius: 8, marginBottom: 20,
            fontSize: 14, fontWeight: 500,
            background: message.type === 'success' ? '#f0fdf4' : '#fff5f5',
            color: message.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${message.type === 'success' ? '#86efac' : '#fca5a5'}`,
          }}>
            {message.text}
          </div>
        )}

        <div style={{
          background: 'white', borderRadius: 14,
          boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden',
        }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>Loading...</div>
          ) : docs.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  {['Customer', 'Document Type', 'Document No.', 'File', 'Status', 'Submitted', 'Actions'].map((h) => (
                    <th key={h} style={{
                      padding: '14px 16px', textAlign: 'left', fontSize: 13,
                      color: '#475569', fontWeight: 700, borderBottom: '2px solid #e2e8f0',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => (
                  <tr key={doc.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>
                        {doc.customerName}
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>ID: {doc.customerId}</div>
                    </td>

                    <td style={{ padding: '14px 16px', fontSize: 14, color: '#334155', fontWeight: 500 }}>
                      {doc.documentType.replace(/_/g, ' ')}
                    </td>

                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#64748b', fontFamily: 'monospace' }}>
                      {doc.documentNumber}
                    </td>

                    {/* File column — View button if PDF is stored */}
                    <td style={{ padding: '14px 16px' }}>
                      {doc.hasFile ? (
                        <button
                          onClick={() => handleViewDocument(doc)}
                          disabled={viewLoading === doc.id}
                          style={{
                            padding: '5px 12px',
                            background: '#eff6ff', color: '#1d4ed8',
                            border: '1px solid #bfdbfe', borderRadius: 6,
                            cursor: 'pointer', fontSize: 12, fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {viewLoading === doc.id ? '…' : '👁 View PDF'}
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: '#94a3b8' }}>No file</span>
                      )}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                        background: (badgeColor[doc.status] || '#94a3b8') + '20',
                        color: badgeColor[doc.status] || '#94a3b8',
                      }}>
                        {doc.status}
                      </span>
                    </td>

                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#64748b' }}>
                      {new Date(doc.createdAt).toLocaleDateString('en-IN')}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <button
                        onClick={() => { setSelectedDoc(doc); setShowReviewModal(true); }}
                        style={{
                          padding: '6px 14px', background: '#1e40af', color: 'white',
                          border: 'none', borderRadius: 6, cursor: 'pointer',
                          fontSize: 13, fontWeight: 600,
                        }}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8', fontSize: 15 }}>
              No pending KYC documents 🎉
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 20 }}>
            <button
              onClick={() => setPage((p) => p - 1)} disabled={page === 0}
              style={{ padding: '8px 16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
            >
              Previous
            </button>
            <span style={{ padding: '8px 16px', fontSize: 13, color: '#64748b' }}>
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}
              style={{ padding: '8px 16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* ── Review modal ─────────────────────────────────────────────────────── */}
      {showReviewModal && selectedDoc && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{ background: 'white', borderRadius: 14, padding: 32, width: 480, maxWidth: '95vw' }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Review KYC Document</h3>

            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 14, color: '#0f172a', fontWeight: 600, marginBottom: 8 }}>
                Document Details
              </div>
              <div style={{ fontSize: 13, color: '#475569' }}>
                <strong>Customer:</strong> {selectedDoc.customerName}
              </div>
              <div style={{ fontSize: 13, color: '#475569' }}>
                <strong>Document:</strong> {selectedDoc.documentType.replace(/_/g, ' ')}
              </div>
              <div style={{ fontSize: 13, color: '#475569' }}>
                <strong>Number:</strong> {selectedDoc.documentNumber}
              </div>
              {selectedDoc.hasFile && (
                <button
                  onClick={() => handleViewDocument(selectedDoc)}
                  disabled={viewLoading === selectedDoc.id}
                  style={{
                    marginTop: 10, padding: '6px 14px',
                    background: '#eff6ff', color: '#1d4ed8',
                    border: '1px solid #bfdbfe', borderRadius: 6,
                    cursor: 'pointer', fontSize: 13, fontWeight: 600,
                  }}
                >
                  {viewLoading === selectedDoc.id ? 'Loading…' : '👁 View PDF'}
                </button>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                Rejection Reason (required if rejecting)
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                placeholder="Enter reason for rejection..."
                style={{
                  width: '100%', padding: '10px 14px',
                  border: '2px solid #e2e8f0', borderRadius: 8,
                  fontSize: 14, resize: 'vertical', outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowReviewModal(false); setRejectionReason(''); }}
                style={{ padding: '10px 20px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleVerify('REJECT')}
                disabled={submitting || !rejectionReason}
                style={{ padding: '10px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: !rejectionReason ? 0.5 : 1 }}
              >
                Reject
              </button>
              <button
                onClick={() => handleVerify('APPROVE')}
                disabled={submitting}
                style={{ padding: '10px 20px', background: '#059669', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PDF viewer modal ─────────────────────────────────────────────────── */}
      {viewerUrl && (
        <PdfViewerModal
          url={viewerUrl}
          title={viewerTitle}
          onClose={closeViewer}
        />
      )}
    </>
  );
}

export default KYCVerification;
