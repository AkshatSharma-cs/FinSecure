import React, { useState, useEffect } from 'react';
import Header from './Header';
import { employeeAPI } from '../api';

function LoanApprovals() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showModal, setShowModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadLoans(); }, [page]);

  const loadLoans = async () => {
    setLoading(true);
    try {
      const res = await employeeAPI.getPendingLoans(page);
      const { content, totalPages } = res.data.data;
      setLoans(content || []);
      setTotalPages(totalPages || 0);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (action) => {
    setSubmitting(true);
    try {
      await employeeAPI.reviewLoan(selectedLoan.id, action, action === 'REJECT' ? rejectionReason : null);
      setMessage({ text: `Loan ${action}d successfully`, type: 'success' });
      setShowModal(false);
      setSelectedLoan(null);
      setRejectionReason('');
      loadLoans();
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Action failed', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (a) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(a || 0);
  const statusColor = { APPLIED: '#d97706', UNDER_REVIEW: '#7c3aed', APPROVED: '#059669', REJECTED: '#dc2626' };

  return (
    <>
      <Header />
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', marginBottom: 24 }}>Loan Approvals Queue</h1>

        {message.text && (
          <div style={{ padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14,
            background: message.type === 'success' ? '#f0fdf4' : '#fff5f5',
            color: message.type === 'success' ? '#166534' : '#991b1b',
            border: `1px solid ${message.type === 'success' ? '#86efac' : '#fca5a5'}` }}>
            {message.text}
          </div>
        )}

        <div style={{ background: 'white', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>Loading...</div>
          ) : loans.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  {['Loan Number', 'Account', 'Type', 'Amount', 'EMI', 'Tenure', 'Purpose', 'Status', 'Applied', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, color: '#475569', fontWeight: 700, borderBottom: '2px solid #e2e8f0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loans.map(loan => (
                  <tr key={loan.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 13, color: '#334155' }}>{loan.loanNumber}</td>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 13, color: '#334155' }}>{loan.accountNumber || '—'}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{loan.loanType.replace('_', ' ')}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{fmt(loan.principalAmount)}</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#475569' }}>{fmt(loan.emiAmount)}/mo</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#475569' }}>{loan.tenureMonths}m</td>
                    <td style={{ padding: '14px 16px', fontSize: 13, color: '#64748b', maxWidth: 150 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loan.purpose}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: (statusColor[loan.status] || '#94a3b8') + '20', color: statusColor[loan.status] || '#94a3b8' }}>
                        {loan.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: 12, color: '#64748b' }}>
                      {new Date(loan.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button onClick={() => { setSelectedLoan(loan); setShowModal(true); }}
                        style={{ padding: '6px 12px', background: '#1e40af', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8', fontSize: 15 }}>No pending loan applications 🎉</div>
          )}
        </div>

        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 20 }}>
            <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
              style={{ padding: '8px 16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Previous</button>
            <span style={{ padding: '8px 16px', fontSize: 13, color: '#64748b' }}>Page {page + 1} of {totalPages}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
              style={{ padding: '8px 16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Next</button>
          </div>
        )}

        {showModal && selectedLoan && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: 'white', borderRadius: 14, padding: 32, width: 520, maxWidth: '95vw' }}>
              <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Review Loan Application</h3>
              <div style={{ background: '#f8fafc', borderRadius: 8, padding: 16, marginBottom: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Loan Number', value: selectedLoan.loanNumber },
                  { label: 'Account Number', value: selectedLoan.accountNumber || '—' },
                  { label: 'Type', value: selectedLoan.loanType },
                  { label: 'Amount', value: fmt(selectedLoan.principalAmount) },
                  { label: 'Rate', value: selectedLoan.interestRate + '% p.a.' },
                  { label: 'Tenure', value: selectedLoan.tenureMonths + ' months' },
                  { label: 'EMI', value: fmt(selectedLoan.emiAmount) },
                  { label: 'Total Interest', value: fmt(selectedLoan.totalInterest) },
                  { label: 'Purpose', value: selectedLoan.purpose },
                ].map(item => (
                  <div key={item.label}>
                    <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{item.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                  Rejection Reason (required if rejecting)
                </label>
                <textarea value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} rows={3}
                  placeholder="Enter reason for rejection..."
                  style={{ width: '100%', padding: '10px 14px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 14, resize: 'vertical', outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowModal(false)}
                  style={{ padding: '10px 20px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  Cancel
                </button>
                <button onClick={() => handleReview('REJECT')} disabled={submitting || !rejectionReason}
                  style={{ padding: '10px 20px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, opacity: !rejectionReason ? 0.5 : 1 }}>
                  Reject
                </button>
                <button onClick={() => handleReview('APPROVE')} disabled={submitting}
                  style={{ padding: '10px 20px', background: '#059669', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                  Approve
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default LoanApprovals;
