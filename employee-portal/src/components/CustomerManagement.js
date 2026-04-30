import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './Header';
import { employeeAPI } from '../api';

function CustomerManagement() {
  const [customers, setCustomers]           = useState([]);
  const [loading, setLoading]               = useState(true);
  const [search, setSearch]                 = useState('');
  const [page, setPage]                     = useState(0);
  const [sortKey, setSortKey]               = useState('createdAt');
  const [sortDir, setSortDir]               = useState('desc');
  const [totalPages, setTotalPages]         = useState(0);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAccount, setDepositAccount] = useState('');
  const [depositAmount, setDepositAmount]   = useState('');
  const [depositDesc, setDepositDesc]       = useState('');
  const [depositing, setDepositing]         = useState(false);
  const [depositMsg, setDepositMsg]         = useState('');
  const [depositError, setDepositError]     = useState('');
  const debounceRef = useRef(null);

  const isAccountNumber = (val) => /^FINS/i.test(val.trim());

  const loadCustomers = useCallback(async (searchVal, pageVal) => {
    setLoading(true);
    try {
      const q = searchVal !== undefined ? searchVal : search;
      const p = pageVal !== undefined ? pageVal : page;

      if (q.trim() && isAccountNumber(q)) {
        const res = await employeeAPI.getCustomerByAccount(q.trim());
        setCustomers(res.data.data || []);
        setTotalPages(1);
      } else {
        const res = await employeeAPI.getCustomers(p, q, sortKey, sortDir);
        const { content, totalPages } = res.data.data;
        setCustomers(content || []);
        setTotalPages(totalPages || 0);
      }
    } catch { setCustomers([]); }
    finally { setLoading(false); }
  }, [search, page, sortKey, sortDir]);

  useEffect(() => { loadCustomers(); }, [page, sortKey, sortDir]);

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(0);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadCustomers(val, 0), 400);
  };

  const handleDeposit = async () => {
    if (!depositAccount || !depositAmount) return;
    setDepositing(true);
    try {
      await employeeAPI.depositToAccount({
        accountNumber: depositAccount,
        amount: parseFloat(depositAmount),
        description: depositDesc || 'Cash deposit by employee',
      });
      setDepositMsg(`₹${parseFloat(depositAmount).toLocaleString('en-IN')} deposited to ${depositAccount}`);
      setShowDepositModal(false);
      setDepositAmount('');
      setDepositDesc('');
    } catch (e) {
      setDepositError(e.response?.data?.message || 'Deposit failed');
    } finally { setDepositing(false); }
  };

  const kycColor = {
    PENDING: '#d97706', SUBMITTED: '#7c3aed', APPROVED: '#059669', REJECTED: '#dc2626',
  };

  const s = {
    page:       { maxWidth: 1200, margin: '0 auto', padding: '32px 24px' },
    h1:         { fontSize: 26, fontWeight: 700, color: '#0f172a', marginBottom: 0 },
    card:       { background: 'white', borderRadius: 14, padding: 20, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
    table:      { background: 'white', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' },
    th:         { padding: '14px 16px', textAlign: 'left', fontSize: 13, color: '#475569', fontWeight: 700, borderBottom: '2px solid #e2e8f0' },
    td:         { padding: '12px 16px' },
    successMsg: { background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between' },
    errorMsg:   { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 16px', marginBottom: 16 },
    depositBtn: { padding: '5px 12px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 },
    select:     { padding: '7px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 12, background: '#f8fafc', cursor: 'pointer', color: '#334155', fontWeight: 600 },
  };

  return (
    <>
      <Header />
      <div style={s.page}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h1 style={s.h1}>Customer Management</h1>
          <button style={{ background: 'linear-gradient(135deg,#1e3a8a,#1d4ed8)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
            onClick={() => { setShowDepositModal(true); setDepositError(''); }}>
            + Deposit to Account
          </button>
        </div>

        {depositMsg && (
          <div style={s.successMsg}>
            {depositMsg}
            <button onClick={() => setDepositMsg('')} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
          </div>
        )}
        {depositError && <div style={s.errorMsg}>{depositError}</div>}

        <div style={s.card}>
          <input
            style={{ width: '100%', padding: '12px 16px', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
            type="text"
            placeholder="Search by customer name or account number (e.g. FINS...)..."
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
          />
          <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8' }}>
            💡 Enter a name to search by customer — or start with <strong>FINS</strong> to search by account number
          </div>
        </div>


        {/* Sort controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Sort by:</span>
          {[
            { key: 'firstName', label: 'Name A→Z',    dir: 'asc'  },
            { key: 'firstName', label: 'Name Z→A',    dir: 'desc' },
            { key: 'createdAt', label: 'Newest First', dir: 'desc' },
            { key: 'createdAt', label: 'Oldest First', dir: 'asc'  },
            { key: 'kycStatus', label: 'KYC Status',  dir: 'asc'  },
          ].map(opt => {
            const active = sortKey === opt.key && sortDir === opt.dir;
            return (
              <button key={opt.label}
                onClick={() => { setSortKey(opt.key); setSortDir(opt.dir); setPage(0); }}
                style={{ padding: '6px 14px', borderRadius: 20, border: active ? 'none' : '1px solid #e2e8f0', background: active ? '#1d4ed8' : 'white', color: active ? 'white' : '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {opt.label}
              </button>
            );
          })}
        </div>
        <div style={s.table}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>Loading...</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th style={s.th}>Name</th>
                  <th style={s.th}>Email</th>
                  <th style={s.th}>Phone</th>
                  <th style={s.th}>PAN</th>
                  <th style={s.th}>KYC Status</th>
                  <th style={s.th}>Joined</th>
                  <th style={s.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={s.td}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a' }}>{c.firstName} {c.lastName}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>@{c.username}</div>
                    </td>
                    <td style={{ ...s.td, fontSize: 13, color: '#334155' }}>{c.email}</td>
                    <td style={{ ...s.td, fontSize: 13, color: '#475569' }}>{c.phone}</td>
                    <td style={{ ...s.td, fontSize: 13, color: '#475569', fontFamily: 'monospace' }}>
                      {c.panNumber || '-'}
                    </td>
                    <td style={s.td}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: (kycColor[c.kycStatus] || '#94a3b8') + '20', color: kycColor[c.kycStatus] || '#94a3b8' }}>
                        {c.kycStatus}
                      </span>
                    </td>
                    <td style={{ ...s.td, fontSize: 13, color: '#64748b' }}>
                      {new Date(c.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td style={s.td}>
                      <button style={s.depositBtn}
                        onClick={() => { setShowDepositModal(true); setDepositDesc(`Deposit for ${c.firstName} ${c.lastName}`); setDepositError(''); }}>
                        💰 Deposit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {customers.length === 0 && !loading && (
            <div style={{ padding: 48, textAlign: 'center', color: '#94a3b8' }}>No customers found</div>
          )}
        </div>

        {totalPages > 1 && !isAccountNumber(search) && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 20 }}>
            <button onClick={() => setPage(p => p - 1)} disabled={page === 0}
              style={{ padding: '8px 16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Previous</button>
            <span style={{ padding: '8px 16px', fontSize: 13, color: '#64748b' }}>Page {page + 1} of {totalPages}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}
              style={{ padding: '8px 16px', background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>Next</button>
          </div>
        )}
      </div>

      {showDepositModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={() => setShowDepositModal(false)}>
          <div style={{ background: 'white', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 1.25rem', color: '#0f172a' }}>Deposit to Customer Account</h3>
            {depositError && <div style={s.errorMsg}>{depositError}</div>}
            {[
              { label: 'Account Number', key: 'account', value: depositAccount, setter: setDepositAccount, placeholder: 'e.g. FINS0000123456', type: 'text' },
              { label: 'Amount (₹)',     key: 'amount',  value: depositAmount,  setter: setDepositAmount,  placeholder: 'e.g. 5000',           type: 'number' },
              { label: 'Description',    key: 'desc',    value: depositDesc,    setter: setDepositDesc,    placeholder: 'Reason for deposit',   type: 'text' },
            ].map(f => (
              <div key={f.key} style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 600, color: '#374151', marginBottom: '0.4rem', fontSize: '0.9rem' }}>{f.label}</label>
                <input type={f.type} value={f.value} onChange={e => f.setter(e.target.value)} placeholder={f.placeholder}
                  style={{ width: '100%', padding: '0.65rem 1rem', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.95rem', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button onClick={() => setShowDepositModal(false)}
                style={{ background: '#f1f5f9', color: '#374151', border: '1px solid #e2e8f0', padding: '0.65rem 1.4rem', borderRadius: 8, cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
              <button disabled={depositing || !depositAccount || !depositAmount} onClick={handleDeposit}
                style={{ background: depositing ? '#93c5fd' : '#1d4ed8', color: 'white', border: 'none', padding: '0.65rem 1.4rem', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                {depositing ? 'Depositing...' : 'Deposit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CustomerManagement;