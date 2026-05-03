import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import Header from './Header';
import { customerAPI } from '../api';
import './Transactions.css';

function Transactions() {
  const { accountId } = useParams();
  const location = useLocation();
  const accountNumber = location.state?.accountNumber || '';

  const [txns, setTxns]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [page, setPage]           = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [filters, setFilters]     = useState({
    type: '', fromDate: '', toDate: '', minAmount: '', maxAmount: ''
  });
  const [appliedFilters, setAppliedFilters] = useState({});
  const [statementMonths, setStatementMonths] = useState(3);
  const [showStatementMenu, setShowStatementMenu] = useState(false);
  const [summary, setSummary] = useState({ credits: 0, debits: 0, creditCount: 0, debitCount: 0 });

  const loadTxns = useCallback(async (pageNum = 0, activeFilters = appliedFilters) => {
    setLoading(true);
    try {
      const res = await customerAPI.getTransactions(accountId, pageNum, activeFilters);
      const { content, totalPages: tp, totalElements: te } = res.data.data;
      setTxns(content || []);
      setTotalPages(tp || 0);
      setTotalElements(te || 0);
      // Summary
      const credits = content.filter(t => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);
      const debits  = content.filter(t => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0);
      setSummary({
        credits, debits,
        creditCount: content.filter(t => t.type === 'CREDIT').length,
        debitCount:  content.filter(t => t.type === 'DEBIT').length,
      });
    } catch { setTxns([]); }
    finally { setLoading(false); }
  }, [accountId, appliedFilters]);

  useEffect(() => { loadTxns(page); }, [page]);

  const handleApplyFilters = () => {
    setPage(0);
    setAppliedFilters({ ...filters });
    loadTxns(0, filters);
  };

  const handleClearFilters = () => {
    const empty = { type: '', fromDate: '', toDate: '', minAmount: '', maxAmount: '' };
    setFilters(empty);
    setAppliedFilters({});
    setPage(0);
    loadTxns(0, {});
  };

  const handleDownloadStatement = async () => {
    setDownloading(true);
    try {
      const res = await customerAPI.downloadStatement(accountId, statementMonths);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `FinSecure_Statement_${accountNumber || accountId}_${new Date().toISOString().slice(0,10)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch { alert('Failed to download statement. Please try again.'); }
    finally { setDownloading(false); setShowStatementMenu(false); }
  };

  const fmt = (a) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(a);
  const fmtDate = (d) => new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const hasActiveFilters = Object.values(appliedFilters).some(v => v);

  const s = {
    page:        { maxWidth: 1200, margin: '0 auto', padding: '32px 24px' },
    topBar:      { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title:       { fontSize: 26, fontWeight: 700, color: '#0f172a', margin: 0 },
    filterCard:  { background: 'white', borderRadius: 14, padding: '20px 24px', marginBottom: 20,
                   boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
    filterGrid:  { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 12 },
    label:       { display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 },
    input:       { width: '100%', padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8,
                   fontSize: 13, boxSizing: 'border-box', background: '#fff' },
    summaryBar:  { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 },
    summaryCard: (color) => ({
                   background: 'white', borderRadius: 12, padding: '14px 16px',
                   boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${color}` }),
    table:       { background: 'white', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
                   overflow: 'hidden' },
    th:          { padding: '14px 16px', textAlign: 'left', fontSize: 12, color: '#475569',
                   fontWeight: 700, background: '#f8fafc', borderBottom: '2px solid #e2e8f0',
                   textTransform: 'uppercase', letterSpacing: '0.04em' },
    td:          { padding: '13px 16px', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' },
    btnPrimary:  { background: '#1d4ed8', color: 'white', border: 'none', padding: '9px 18px',
                   borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
    btnSecondary:{ background: '#f1f5f9', color: '#374151', border: '1px solid #e2e8f0',
                   padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
    btnDownload: { background: '#0f172a', color: 'white', border: 'none', padding: '9px 18px',
                   borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13,
                   display: 'flex', alignItems: 'center', gap: 6, position: 'relative' },
    badge: (type) => ({
                   padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                   background: type === 'CREDIT' ? '#f0fdf4' : '#fef2f2',
                   color: type === 'CREDIT' ? '#16a34a' : '#dc2626' }),
  };

  return (
    <>
      <Header />
      <div style={s.page}>
        {/* Top bar */}
        <div style={s.topBar}>
          <div>
            <h1 style={s.title}>Transaction History</h1>
            {accountNumber && (
              <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
                Account: <strong>{accountNumber}</strong>
                {totalElements > 0 && <span style={{ marginLeft: 8 }}>· {totalElements} transactions</span>}
              </p>
            )}
          </div>
          {/* Download Statement */}
          <div style={{ position: 'relative' }}>
            <button style={s.btnDownload}
              onClick={() => setShowStatementMenu(v => !v)} disabled={downloading}>
              📄 {downloading ? 'Downloading...' : 'Download Statement'} ▾
            </button>
            {showStatementMenu && (
              <div style={{ position: 'absolute', right: 0, top: '110%', background: 'white',
                borderRadius: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.15)', padding: 16,
                zIndex: 100, minWidth: 220 }}>
                <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#374151' }}>
                  Statement Period
                </p>
                {[1, 3, 6, 12].map(m => (
                  <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 8,
                    marginBottom: 8, cursor: 'pointer', fontSize: 13 }}>
                    <input type="radio" name="months" value={m}
                      checked={statementMonths === m} onChange={() => setStatementMonths(m)} />
                    Last {m} {m === 1 ? 'Month' : 'Months'}
                  </label>
                ))}
                <button onClick={handleDownloadStatement}
                  style={{ ...s.btnPrimary, width: '100%', marginTop: 8 }}>
                  📥 Download PDF
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        <div style={s.filterCard}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12, gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>🔍 Filters</span>
            {hasActiveFilters && (
              <span style={{ padding: '2px 8px', background: '#dbeafe', color: '#1d4ed8',
                borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Active</span>
            )}
          </div>
          <div style={s.filterGrid}>
            <div>
              <label style={s.label}>Transaction Type</label>
              <select style={s.input} value={filters.type}
                onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
                <option value="">All Types</option>
                <option value="CREDIT">Credit</option>
                <option value="DEBIT">Debit</option>
              </select>
            </div>
            <div>
              <label style={s.label}>From Date</label>
              <input type="date" style={s.input} value={filters.fromDate}
                onChange={e => setFilters(f => ({ ...f, fromDate: e.target.value }))} />
            </div>
            <div>
              <label style={s.label}>To Date</label>
              <input type="date" style={s.input} value={filters.toDate}
                onChange={e => setFilters(f => ({ ...f, toDate: e.target.value }))} />
            </div>
            <div>
              <label style={s.label}>Min Amount (₹)</label>
              <input type="number" style={s.input} placeholder="0" value={filters.minAmount}
                onChange={e => setFilters(f => ({ ...f, minAmount: e.target.value }))} />
            </div>
            <div>
              <label style={s.label}>Max Amount (₹)</label>
              <input type="number" style={s.input} placeholder="Any" value={filters.maxAmount}
                onChange={e => setFilters(f => ({ ...f, maxAmount: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={s.btnPrimary} onClick={handleApplyFilters}>Apply Filters</button>
            {hasActiveFilters && (
              <button style={s.btnSecondary} onClick={handleClearFilters}>Clear Filters</button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        {!loading && txns.length > 0 && (
          <div style={s.summaryBar}>
            {[
              { label: 'Total Credits', value: fmt(summary.credits), sub: `${summary.creditCount} transactions`, color: '#16a34a' },
              { label: 'Total Debits',  value: fmt(summary.debits),  sub: `${summary.debitCount} transactions`,  color: '#dc2626' },
              { label: 'Net Flow',      value: fmt(summary.credits - summary.debits),
                sub: summary.credits >= summary.debits ? 'Surplus' : 'Deficit',
                color: summary.credits >= summary.debits ? '#16a34a' : '#dc2626' },
              { label: 'Transactions',  value: totalElements, sub: `on this page: ${txns.length}`, color: '#1d4ed8' },
            ].map(card => (
              <div key={card.label} style={s.summaryCard(card.color)}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#64748b', textTransform: 'uppercase',
                  letterSpacing: '0.05em', marginBottom: 4 }}>{card.label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{card.value}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{card.sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* Transactions Table */}
        <div style={s.table}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
              Loading transactions...
            </div>
          ) : txns.length === 0 ? (
            <div style={{ padding: 64, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <p style={{ color: '#64748b', fontSize: 15 }}>No transactions found</p>
              {hasActiveFilters && (
                <button style={{ ...s.btnSecondary, marginTop: 8 }} onClick={handleClearFilters}>
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Date & Time', 'Reference', 'Description', 'Type', 'Mode', 'Amount', 'Balance After'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {txns.map(txn => (
                    <tr key={txn.id} style={{ background: txn.type === 'CREDIT' ? '#f0fdf4' : 'white' }}>
                      <td style={{ ...s.td, fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                        {fmtDate(txn.createdAt)}
                      </td>
                      <td style={{ ...s.td, fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
                        {txn.referenceNumber}
                      </td>
                      <td style={{ ...s.td, fontSize: 13, color: '#374151', maxWidth: 200 }}>
                        {txn.description || '-'}
                        {txn.targetAccountNumber && (
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                            → {txn.targetAccountNumber}
                          </div>
                        )}
                      </td>
                      <td style={s.td}>
                        <span style={s.badge(txn.type)}>{txn.type}</span>
                      </td>
                      <td style={{ ...s.td, fontSize: 12, color: '#64748b' }}>{txn.mode}</td>
                      <td style={{ ...s.td, fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap',
                        color: txn.type === 'CREDIT' ? '#16a34a' : '#dc2626' }}>
                        {txn.type === 'CREDIT' ? '+' : '-'}{fmt(txn.amount)}
                      </td>
                      <td style={{ ...s.td, fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', color: '#0f172a' }}>
                        {fmt(txn.balanceAfter)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center',
                  gap: 12, padding: 20, borderTop: '1px solid #f1f5f9' }}>
                  <button style={s.btnSecondary} onClick={() => setPage(p => p - 1)}
                    disabled={page === 0}>← Previous</button>
                  <span style={{ fontSize: 13, color: '#64748b' }}>
                    Page <strong>{page + 1}</strong> of <strong>{totalPages}</strong>
                  </span>
                  <button style={s.btnSecondary} onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages - 1}>Next →</button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {/* Close statement menu on outside click */}
      {showStatementMenu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}
          onClick={() => setShowStatementMenu(false)} />
      )}
    </>
  );
}

export default Transactions;
