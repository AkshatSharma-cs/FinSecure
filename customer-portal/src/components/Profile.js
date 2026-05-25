import React, { useState, useEffect } from 'react';
import Header from './Header';
import { customerAPI } from '../api';
import './Dashboard.css';

function Profile() {
  const [profile, setProfile] = useState(null);
  const [kycDocs, setKycDocs] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showKycModal, setShowKycModal] = useState(false);
  const [kycForm, setKycForm] = useState({ documentType: 'AADHAAR', documentNumber: '', filePath: '', fileName: '' });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [submitting, setSubmitting] = useState(false);
  const currentDate = new Date();
  const [statementAccountId, setStatementAccountId] = useState('');
  const [statementMode, setStatementMode] = useState('monthly');
  const [statementYear, setStatementYear] = useState(currentDate.getFullYear());
  const [statementMonth, setStatementMonth] = useState(currentDate.getMonth() + 1);
  const [statementQuarter, setStatementQuarter] = useState(Math.floor(currentDate.getMonth() / 3) + 1);
  const [statementDownloading, setStatementDownloading] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i);
  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ];

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [profileRes, kycRes, dashboardRes] = await Promise.all([
        customerAPI.getProfile(),
        customerAPI.getKycDocuments(),
        customerAPI.getDashboard(),
      ]);
      setProfile(profileRes.data.data);
      setKycDocs(kycRes.data.data || []);
      const loadedAccounts = dashboardRes.data.data?.accounts || [];
      setAccounts(loadedAccounts);
      if (!statementAccountId && loadedAccounts.length > 0) {
        setStatementAccountId(String(loadedAccounts[0].id));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKycSubmit = async (e) => {
    e.preventDefault();
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

  const handleDownloadStatement = async () => {
    if (!statementAccountId) {
      setMessage({ text: 'Please select an account first.', type: 'error' });
      return;
    }

    setStatementDownloading(true);
    try {
      const options = statementMode === 'quarterly'
        ? { period: 'quarterly', year: statementYear, quarter: statementQuarter }
        : { period: 'monthly', year: statementYear, month: statementMonth };
      const res = await customerAPI.downloadStatement(statementAccountId, options);
      const selectedAccount = accounts.find(acc => String(acc.id) === String(statementAccountId));
      const accountLabel = selectedAccount?.accountNumber || statementAccountId;
      const periodLabel = statementMode === 'quarterly'
        ? `Q${statementQuarter}_${statementYear}`
        : `${String(statementMonth).padStart(2, '0')}_${statementYear}`;
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `FinSecure_Statement_${accountLabel}_${statementMode}_${periodLabel}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setMessage({ text: 'Statement download started.', type: 'success' });
    } catch (err) {
      setMessage({ text: err.response?.data?.message || 'Failed to download statement.', type: 'error' });
    } finally {
      setStatementDownloading(false);
    }
  };

  const kycBadgeColor = (status) => ({
    UPLOADED: '#7c3aed', UNDER_REVIEW: '#d97706', APPROVED: '#059669', REJECTED: '#dc2626'
  }[status] || '#6b7280');

  if (loading) return <><Header /><div className="loading">Loading...</div></>;

  return (
    <>
      <Header />
      <div className="page-container">
        <h1 className="page-title">My Profile</h1>

        {message.text && <div className={message.type === 'success' ? 'success-msg' : 'error-msg'} style={{ marginBottom: 16 }}>{message.text}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div className="section-card">
            <div className="section-title" style={{ marginBottom: 20 }}>Personal Information</div>
            {profile && (
              <div style={{ display: 'grid', gap: 14 }}>
                {[
                  { label: 'Full Name', value: profile.firstName + ' ' + profile.lastName },
                  { label: 'Email', value: profile.email },
                  { label: 'Username', value: profile.username },
                  { label: 'Phone', value: profile.phone },
                  { label: 'Date of Birth', value: profile.dateOfBirth },
                  { label: 'PAN Number', value: profile.panNumber || 'Not provided' },
                  { label: 'Address', value: [profile.address, profile.city, profile.state, profile.pinCode].filter(Boolean).join(', ') || 'Not provided' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', gap: 12 }}>
                    <span style={{ minWidth: 130, fontSize: 13, color: '#718096', fontWeight: 600 }}>{item.label}:</span>
                    <span style={{ fontSize: 14, color: '#1a202c', fontWeight: 500 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="section-card" style={{ marginBottom: 20 }}>
              <div className="section-title" style={{ marginBottom: 16 }}>KYC Status</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <span style={{ fontSize: 32 }}>{profile?.kycStatus === 'APPROVED' ? '✅' : profile?.kycStatus === 'REJECTED' ? '❌' : '⏳'}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: kycBadgeColor(profile?.kycStatus) }}>{profile?.kycStatus}</div>
                  <div style={{ fontSize: 13, color: '#718096' }}>
                    {profile?.kycStatus === 'APPROVED' ? 'All features unlocked' :
                     profile?.kycStatus === 'SUBMITTED' ? 'Under review by our team' :
                     profile?.kycStatus === 'REJECTED' ? 'Please resubmit with correct documents' :
                     'Submit KYC documents to unlock features'}
                  </div>
                </div>
              </div>
              <button onClick={() => setShowKycModal(true)}
                style={{ padding: '10px 20px', background: '#3182ce', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, width: '100%' }}>
                + Upload KYC Document
              </button>
            </div>

            <div className="section-card" style={{ marginBottom: 20 }}>
              <div className="section-title" style={{ marginBottom: 16 }}>Account Statements</div>
              <div style={{ display: 'grid', gap: 12 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Account</label>
                  <select value={statementAccountId} onChange={e => setStatementAccountId(e.target.value)}>
                    {accounts.length === 0 && <option value="">No accounts available</option>}
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.accountNumber} ({acc.accountType.replace('_', ' ')})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button type="button"
                    onClick={() => setStatementMode('monthly')}
                    style={{
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: `1px solid ${statementMode === 'monthly' ? '#3182ce' : '#e2e8f0'}`,
                      background: statementMode === 'monthly' ? '#ebf8ff' : '#f8fafc',
                      color: statementMode === 'monthly' ? '#2b6cb0' : '#4a5568',
                      cursor: 'pointer',
                      fontWeight: 700,
                    }}>
                    Monthly
                  </button>
                  <button type="button"
                    onClick={() => setStatementMode('quarterly')}
                    style={{
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: `1px solid ${statementMode === 'quarterly' ? '#3182ce' : '#e2e8f0'}`,
                      background: statementMode === 'quarterly' ? '#ebf8ff' : '#f8fafc',
                      color: statementMode === 'quarterly' ? '#2b6cb0' : '#4a5568',
                      cursor: 'pointer',
                      fontWeight: 700,
                    }}>
                    Quarterly
                  </button>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Year</label>
                  <select value={statementYear} onChange={e => setStatementYear(Number(e.target.value))}>
                    {years.map(year => <option key={year} value={year}>{year}</option>)}
                  </select>
                </div>

                {statementMode === 'monthly' ? (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Month</label>
                    <select value={statementMonth} onChange={e => setStatementMonth(Number(e.target.value))}>
                      {months.map(month => (
                        <option key={month.value} value={month.value}>{month.label}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label>Quarter</label>
                    <select value={statementQuarter} onChange={e => setStatementQuarter(Number(e.target.value))}>
                      <option value={1}>Q1 - Jan to Mar</option>
                      <option value={2}>Q2 - Apr to Jun</option>
                      <option value={3}>Q3 - Jul to Sep</option>
                      <option value={4}>Q4 - Oct to Dec</option>
                    </select>
                  </div>
                )}

                <button onClick={handleDownloadStatement}
                  disabled={statementDownloading || !statementAccountId}
                  style={{
                    padding: '11px 20px',
                    background: statementDownloading || !statementAccountId ? '#a0aec0' : '#1a202c',
                    color: 'white',
                    border: 'none',
                    borderRadius: 8,
                    cursor: statementDownloading || !statementAccountId ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontSize: 14,
                    width: '100%',
                  }}>
                  {statementDownloading ? 'Downloading...' : 'Download PDF Statement'}
                </button>
              </div>
            </div>

            <div className="section-card">
              <div className="section-title" style={{ marginBottom: 16 }}>Submitted Documents</div>
              {kycDocs.length > 0 ? kycDocs.map(doc => (
                <div key={doc.id} style={{ padding: '12px 0', borderBottom: '1px solid #f7fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#2d3748' }}>{doc.documentType.replace('_', ' ')}</div>
                    <div style={{ fontSize: 12, color: '#718096' }}>{doc.documentNumber}</div>
                  </div>
                  <span style={{ padding: '3px 10px', background: kycBadgeColor(doc.status) + '20', color: kycBadgeColor(doc.status), borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                    {doc.status}
                  </span>
                </div>
              )) : <div className="empty-state" style={{ padding: '20px 0' }}>No documents uploaded yet</div>}
            </div>
          </div>
        </div>

        {showKycModal && (
          <div className="modal-overlay" onClick={() => setShowKycModal(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3 className="modal-title">Upload KYC Document</h3>
              <form onSubmit={handleKycSubmit}>
                <div className="form-group">
                  <label>Document Type</label>
                  <select value={kycForm.documentType} onChange={e => setKycForm({ ...kycForm, documentType: e.target.value })}>
                    {['AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE', 'VOTER_ID', 'UTILITY_BILL', 'BANK_STATEMENT', 'SALARY_SLIP'].map(t => (
                      <option key={t} value={t}>{t.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Document Number</label>
                  <input type="text" value={kycForm.documentNumber} onChange={e => setKycForm({ ...kycForm, documentNumber: e.target.value })} required />
                </div>
                <div className="form-group">
                  <label>File Path / URL</label>
                  <input type="text" value={kycForm.filePath} onChange={e => setKycForm({ ...kycForm, filePath: e.target.value })}
                    placeholder="/uploads/doc.pdf or https://..." required />
                </div>
                <div className="form-group">
                  <label>File Name</label>
                  <input type="text" value={kycForm.fileName} onChange={e => setKycForm({ ...kycForm, fileName: e.target.value })}
                    placeholder="document.pdf" />
                </div>
                <div className="modal-actions">
                  <button type="button" className="btn-cancel" onClick={() => setShowKycModal(false)}>Cancel</button>
                  <button type="submit" className="btn-submit" disabled={submitting}>
                    {submitting ? 'Uploading...' : 'Upload Document'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Profile;
