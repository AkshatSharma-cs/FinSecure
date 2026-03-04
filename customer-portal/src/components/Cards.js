import React, { useState, useEffect } from 'react';
import Header from './Header';
import { customerAPI } from '../api';
import './Cards.css';

const CREDIT_SCHEMES = [
  { id: 'CLASSIC', name: 'Classic', limit: '₹50,000', fee: 'Zero annual fee', color: '#6b7280', gradient: 'linear-gradient(135deg, #6b7280, #374151)', perks: ['1% cashback on all spends', 'Zero joining fee', 'Online shopping enabled', 'EMI on large purchases'], badge: null },
  { id: 'GOLD', name: 'Gold', limit: '₹1,00,000', fee: '₹500/year', color: '#d97706', gradient: 'linear-gradient(135deg, #d97706, #92400e)', perks: ['2% cashback on all spends', '2x rewards on dining & fuel', 'Fuel surcharge waiver', 'EMI conversion'], badge: 'Popular' },
  { id: 'PLATINUM', name: 'Platinum', limit: '₹3,00,000', fee: '₹1000/year', color: '#7c3aed', gradient: 'linear-gradient(135deg, #7c3aed, #4c1d95)', perks: ['3x rewards on all spends', 'Airport lounge access (4/year)', 'Travel insurance ₹5L', 'Dedicated support'], badge: 'Best Value' },
  { id: 'SIGNATURE', name: 'Signature', limit: '₹10,00,000', fee: '₹2500/year', color: '#0f172a', gradient: 'linear-gradient(135deg, #1e293b, #0f172a)', perks: ['5x rewards on all spends', 'Unlimited lounge access', 'Golf privileges', 'Concierge service 24/7', 'Global travel insurance'], badge: 'Premium' },
];
const EMI_TENURES = [3, 6, 9, 12, 18, 24, 36];

export default function Cards() {
  const [cards, setCards] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('my-cards');
  const [showDebitModal, setShowDebitModal] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [showPrepaidModal, setShowPrepaidModal] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [selectedVariant, setSelectedVariant] = useState('REGULAR');
  const [prepaidAmount, setPrepaidAmount] = useState('');
  const [issuing, setIssuing] = useState(false);
  const [emiAmount, setEmiAmount] = useState('');
  const [emiTenure, setEmiTenure] = useState(12);
  const [emiRate, setEmiRate] = useState(14);
  const [emiResult, setEmiResult] = useState(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cardsRes, dashRes] = await Promise.all([customerAPI.getCards(), customerAPI.getDashboard()]);
      setCards(cardsRes.data.data || []);
      setAccounts(dashRes.data.data?.accounts || []);
    } catch { setError('Failed to load cards'); }
    finally { setLoading(false); }
  };

  const handleIssueDebit = async (virtual = false) => {
    if (!selectedAccount) return setError('Please select an account');
    setIssuing(true);
    try {
      if (virtual) await customerAPI.issueVirtualDebitCard(selectedAccount);
      else await customerAPI.issueDebitCard(selectedAccount);
      setSuccess(`${virtual ? 'Virtual debit' : 'Debit'} card issued successfully!`);
      setShowDebitModal(false); fetchData();
    } catch (e) { setError(e.response?.data?.message || 'Failed to issue card'); }
    finally { setIssuing(false); }
  };

  const handleIssueCreditCard = async () => {
    if (!selectedAccount || !selectedScheme) return setError('Please fill all fields');
    setIssuing(true);
    try {
      await customerAPI.issueCreditCard({ accountId: parseInt(selectedAccount), scheme: selectedScheme, variant: selectedVariant });
      setSuccess(`${selectedScheme} credit card issued!`);
      setShowCreditModal(false); setSelectedScheme(null); fetchData();
    } catch (e) { setError(e.response?.data?.message || 'Failed to issue credit card'); }
    finally { setIssuing(false); }
  };

  const handleIssuePrepaid = async () => {
    if (!selectedAccount || !prepaidAmount) return setError('Please fill all fields');
    setIssuing(true);
    try {
      await customerAPI.issuePrepaidCard({ accountId: parseInt(selectedAccount), loadAmount: parseFloat(prepaidAmount), variant: selectedVariant });
      setSuccess('Prepaid card issued!'); setShowPrepaidModal(false); setPrepaidAmount(''); fetchData();
    } catch (e) { setError(e.response?.data?.message || 'Failed to issue prepaid card'); }
    finally { setIssuing(false); }
  };

  const handleCardAction = async (cardId, action) => {
    try { await customerAPI.cardAction({ cardId, action }); setSuccess('Card updated'); fetchData(); }
    catch (e) { setError(e.response?.data?.message || 'Action failed'); }
  };

  const calculateEMI = () => {
    const P = parseFloat(emiAmount);
    if (!P || P <= 0) return;
    const r = emiRate / 12 / 100;
    const n = emiTenure;
    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    setEmiResult({ emi: emi.toFixed(2), total: (emi * n).toFixed(2), interest: (emi * n - P).toFixed(2) });
  };

  const getCardGradient = (card) => {
    if (card.cardType === 'CREDIT') { const s = CREDIT_SCHEMES.find(x => x.id === card.scheme); return s ? s.gradient : 'linear-gradient(135deg, #1a365d, #2d6a9f)'; }
    if (card.cardType === 'PREPAID') return 'linear-gradient(135deg, #065f46, #059669)';
    if (card.variant === 'VIRTUAL') return 'linear-gradient(135deg, #0369a1, #0284c7)';
    return 'linear-gradient(135deg, #1a365d, #2d6a9f)';
  };

  const fmt = (v) => v ? `₹${parseFloat(v).toLocaleString('en-IN')}` : '—';

  if (loading) return <div className="cards-loading"><div className="spinner" /></div>;

  return (
    <>
    <Header />
    <div className="cards-page">
      {error && <div className="alert alert-error">{error}<button onClick={() => setError('')}>✕</button></div>}
      {success && <div className="alert alert-success">{success}<button onClick={() => setSuccess('')}>✕</button></div>}

      <div className="cards-tabs">
        {[['my-cards','🪙 My Cards'],['credit-cards','💳 Credit Cards'],['prepaid','🎁 Prepaid & Virtual'],['emi','📊 EMI Calculator']].map(([id,label]) => (
          <button key={id} className={`tab-btn ${activeTab === id ? 'active' : ''}`} onClick={() => setActiveTab(id)}>{label}</button>
        ))}
      </div>

      {activeTab === 'my-cards' && (
        <div className="tab-content">
          <div className="section-header">
            <h2>My Cards</h2>
            <button className="btn-primary" onClick={() => { setSelectedVariant('REGULAR'); setShowDebitModal(true); }}>+ Issue Debit Card</button>
          </div>
          {cards.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">💳</div><p>No cards yet. Issue your first card!</p></div>
          ) : (
            <div className="cards-grid">
              {cards.map(card => (
                <div key={card.id} className="card-item">
                  <div className="card-visual" style={{ background: getCardGradient(card) }}>
                    <div className="card-visual-header"><span className="card-bank">FinSecure</span><span>💳</span></div>
                    <div className="card-number">{card.maskedCardNumber}</div>
                    <div className="card-visual-footer">
                      <div><div className="card-label">HOLDER</div><div className="card-value">{card.cardHolderName}</div></div>
                      <div><div className="card-label">EXPIRES</div><div className="card-value">{card.expiryDate}</div></div>
                      <div className="card-type-badge">{card.variant === 'VIRTUAL' ? 'VIRTUAL ' : ''}{card.cardType}{card.scheme && card.scheme !== 'STANDARD' && card.scheme !== 'PREPAID' ? ` · ${card.scheme}` : ''}</div>
                    </div>
                    {card.status === 'BLOCKED' && <div className="card-blocked-overlay">BLOCKED</div>}
                  </div>
                  <div className="card-info">
                    {card.cardType === 'CREDIT' && (
                      <div className="card-limits">
                        <div className="limit-labels"><span>Available: {fmt(card.availableLimit)}</span><span>Limit: {fmt(card.creditLimit)}</span></div>
                        <div className="limit-bar"><div className="limit-fill" style={{ width: `${(parseFloat(card.availableLimit||0)/parseFloat(card.creditLimit||1))*100}%` }} /></div>
                        {card.perks && <p className="card-perks">{card.perks}</p>}
                      </div>
                    )}
                    {card.cardType === 'PREPAID' && <div className="prepaid-balance">Balance: {fmt(card.prepaidBalance)}</div>}
                    <div className="card-toggles">
                      <label className="toggle-label"><span>International</span><input type="checkbox" checked={card.internationalEnabled} onChange={() => handleCardAction(card.id, card.internationalEnabled ? 'DISABLE_INTERNATIONAL' : 'ENABLE_INTERNATIONAL')} /><span className="toggle-slider" /></label>
                      <label className="toggle-label"><span>Online</span><input type="checkbox" checked={card.onlineEnabled} onChange={() => handleCardAction(card.id, card.onlineEnabled ? 'DISABLE_ONLINE' : 'ENABLE_ONLINE')} /><span className="toggle-slider" /></label>
                    </div>
                    <div className="card-actions-row">
                      {card.status === 'ACTIVE' ? <button className="btn-danger-sm" onClick={() => handleCardAction(card.id, 'BLOCK')}>🔒 Block</button> : <button className="btn-success-sm" onClick={() => handleCardAction(card.id, 'UNBLOCK')}>🔓 Unblock</button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'credit-cards' && (
        <div className="tab-content">
          <div className="section-header"><h2>Credit Cards</h2><span className="section-subtitle">Choose from 4 premium plans</span></div>
          <div className="schemes-grid">
            {CREDIT_SCHEMES.map(scheme => (
              <div key={scheme.id} className="scheme-card">
                {scheme.badge && <div className="scheme-badge" style={{ background: scheme.color }}>{scheme.badge}</div>}
                <div className="scheme-header" style={{ background: scheme.gradient }}>
                  <div className="scheme-name">{scheme.name}</div>
                  <div className="scheme-limit">{scheme.limit}</div>
                  <div className="scheme-fee">{scheme.fee}</div>
                </div>
                <div className="scheme-body">
                  <ul className="scheme-perks">{scheme.perks.map((p, i) => <li key={i}>✓ {p}</li>)}</ul>
                  <button className="btn-scheme" onClick={() => { setSelectedScheme(scheme.id); setSelectedVariant('REGULAR'); setShowCreditModal(true); }}>Apply Now</button>
                </div>
              </div>
            ))}
          </div>
          {cards.filter(c => c.cardType === 'CREDIT').length > 0 && (
            <><h3 style={{ marginTop: '2rem' }}>Your Credit Cards</h3>
            <div className="cards-grid">{cards.filter(c => c.cardType === 'CREDIT').map(card => (
              <div key={card.id} className="card-item">
                <div className="card-visual" style={{ background: getCardGradient(card) }}>
                  <div className="card-visual-header"><span className="card-bank">FinSecure</span></div>
                  <div className="card-number">{card.maskedCardNumber}</div>
                  <div className="card-visual-footer">
                    <div><div className="card-label">HOLDER</div><div className="card-value">{card.cardHolderName}</div></div>
                    <div className="card-type-badge">{card.scheme} {card.variant === 'VIRTUAL' ? '(Virtual)' : ''}</div>
                  </div>
                </div>
                <div className="card-info">
                  <div className="card-limits">
                    <div className="limit-labels"><span>Available: {fmt(card.availableLimit)}</span><span>Limit: {fmt(card.creditLimit)}</span></div>
                    <div className="limit-bar"><div className="limit-fill" style={{ width: `${(parseFloat(card.availableLimit||0)/parseFloat(card.creditLimit||1))*100}%` }} /></div>
                  </div>
                  <div className="card-actions-row">
                    {card.status === 'ACTIVE' ? <button className="btn-danger-sm" onClick={() => handleCardAction(card.id, 'BLOCK')}>🔒 Block</button> : <button className="btn-success-sm" onClick={() => handleCardAction(card.id, 'UNBLOCK')}>🔓 Unblock</button>}
                  </div>
                </div>
              </div>
            ))}</div></>
          )}
        </div>
      )}

      {activeTab === 'prepaid' && (
        <div className="tab-content">
          <div className="section-header"><h2>Prepaid & Virtual Cards</h2></div>
          <div className="card-type-options">
            <div className="card-type-option">
              <div className="cto-icon">💚</div><h3>Prepaid Card</h3>
              <p>Load money and spend like cash. No credit check needed.</p>
              <ul><li>✓ Load ₹500 – ₹1,00,000</li><li>✓ Use anywhere Visa accepted</li><li>✓ Reloadable</li></ul>
              <button className="btn-primary" onClick={() => { setSelectedVariant('REGULAR'); setShowPrepaidModal(true); }}>Get Physical Card</button>
            </div>
            <div className="card-type-option">
              <div className="cto-icon">🔵</div><h3>Virtual Prepaid Card</h3>
              <p>Instant online card for secure shopping.</p>
              <ul><li>✓ Instant issuance</li><li>✓ Online purchases only</li><li>✓ Secure & disposable</li></ul>
              <button className="btn-primary" onClick={() => { setSelectedVariant('VIRTUAL'); setShowPrepaidModal(true); }}>Get Virtual Prepaid</button>
            </div>
            <div className="card-type-option">
              <div className="cto-icon">🌐</div><h3>Virtual Debit Card</h3>
              <p>A virtual version of your savings debit card.</p>
              <ul><li>✓ Linked to your account</li><li>✓ Instant access</li><li>✓ No physical card needed</li></ul>
              <button className="btn-primary" onClick={() => { setSelectedVariant('VIRTUAL'); setShowDebitModal(true); }}>Get Virtual Debit</button>
            </div>
          </div>
          {cards.filter(c => c.cardType === 'PREPAID').length > 0 && (
            <><h3 style={{ marginTop: '2rem' }}>Your Prepaid Cards</h3>
            <div className="cards-grid">{cards.filter(c => c.cardType === 'PREPAID').map(card => (
              <div key={card.id} className="card-item">
                <div className="card-visual" style={{ background: getCardGradient(card) }}>
                  <div className="card-visual-header"><span className="card-bank">FinSecure</span></div>
                  <div className="card-number">{card.maskedCardNumber}</div>
                  <div className="card-visual-footer">
                    <div><div className="card-label">BALANCE</div><div className="card-value">{fmt(card.prepaidBalance)}</div></div>
                    <div className="card-type-badge">{card.variant === 'VIRTUAL' ? 'Virtual Prepaid' : 'Prepaid'}</div>
                  </div>
                </div>
              </div>
            ))}</div></>
          )}
        </div>
      )}

      {activeTab === 'emi' && (
        <div className="tab-content">
          <div className="emi-layout">
            <div className="emi-calculator">
              <h2>EMI Calculator</h2>
              <p className="emi-subtitle">Calculate your monthly EMI for loans and credit card purchases.</p>
              <div className="emi-form">
                <div className="emi-field">
                  <label>Loan / Purchase Amount (₹)</label>
                  <input type="number" placeholder="e.g. 500000" value={emiAmount} onChange={e => setEmiAmount(e.target.value)} />
                </div>
                <div className="emi-field">
                  <label>Annual Interest Rate: <strong>{emiRate}%</strong></label>
                  <input type="range" min="6" max="36" step="0.5" value={emiRate} onChange={e => setEmiRate(parseFloat(e.target.value))} />
                  <div className="range-labels"><span>6%</span><span>36%</span></div>
                </div>
                <div className="emi-field">
                  <label>Tenure</label>
                  <div className="tenure-options">
                    {EMI_TENURES.map(t => <button key={t} className={`tenure-btn ${emiTenure === t ? 'active' : ''}`} onClick={() => setEmiTenure(t)}>{t}m</button>)}
                  </div>
                </div>
                <button className="btn-primary btn-calc" onClick={calculateEMI}>Calculate EMI</button>
              </div>
              {emiResult && (
                <div className="emi-result">
                  <div className="emi-result-main"><span className="emi-label">Monthly EMI</span><span className="emi-value">₹{parseFloat(emiResult.emi).toLocaleString('en-IN')}</span></div>
                  <div className="emi-breakdown">
                    <div className="emi-breakdown-item"><span>Principal Amount</span><span>₹{parseFloat(emiAmount).toLocaleString('en-IN')}</span></div>
                    <div className="emi-breakdown-item"><span>Total Interest</span><span className="interest-amount">₹{parseFloat(emiResult.interest).toLocaleString('en-IN')}</span></div>
                    <div className="emi-breakdown-item total"><span>Total Payment</span><span>₹{parseFloat(emiResult.total).toLocaleString('en-IN')}</span></div>
                  </div>
                </div>
              )}
            </div>
            <div className="emi-info">
              <h3>FinSecure Card EMI Rates</h3>
              <div className="emi-rates-table">
                <div className="emi-rate-row header"><span>Card</span><span>Rate</span><span>Min Txn</span></div>
                {[['Classic Credit','14%','₹5,000'],['Gold Credit','13%','₹3,000'],['Platinum Credit','12%','₹3,000'],['Signature Credit','11%','₹2,000'],['Debit Card EMI','15%','₹10,000']].map(([c,r,m],i) => (
                  <div key={i} className="emi-rate-row"><span>{c}</span><span>{r}</span><span>{m}</span></div>
                ))}
              </div>
              <div className="emi-offers">
                <h4>🎉 Current EMI Offers</h4>
                <div className="offer-card">0% EMI on electronics above ₹15,000 for Gold & above</div>
                <div className="offer-card">No-cost EMI on Amazon & Flipkart with Platinum card</div>
                <div className="offer-card">3-month no-cost EMI on fuel purchases (Signature)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDebitModal && (
        <div className="modal-overlay" onClick={() => setShowDebitModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{selectedVariant === 'VIRTUAL' ? 'Issue Virtual Debit Card' : 'Issue Debit Card'}</h3>
            <div className="modal-field">
              <label>Select Account</label>
              <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}>
                <option value="">-- Choose account --</option>
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.accountNumber} ({acc.accountType}) — {fmt(acc.balance)}</option>)}
              </select>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowDebitModal(false)}>Cancel</button>
              <button className="btn-primary" disabled={issuing} onClick={() => handleIssueDebit(selectedVariant === 'VIRTUAL')}>{issuing ? 'Issuing...' : 'Issue Card'}</button>
            </div>
          </div>
        </div>
      )}

      {showCreditModal && selectedScheme && (
        <div className="modal-overlay" onClick={() => setShowCreditModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Apply for {selectedScheme} Credit Card</h3>
            {(() => { const s = CREDIT_SCHEMES.find(x => x.id === selectedScheme); return s ? <div className="scheme-mini" style={{ background: s.gradient }}><div style={{color:'white',fontWeight:700}}>{s.name}</div><div style={{color:'rgba(255,255,255,0.8)',fontSize:'0.85rem'}}>{s.limit} limit · {s.fee}</div></div> : null; })()}
            <div className="modal-field">
              <label>Select Account</label>
              <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}>
                <option value="">-- Choose account --</option>
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.accountNumber} ({acc.accountType})</option>)}
              </select>
            </div>
            <div className="modal-field">
              <label>Card Variant</label>
              <div className="variant-options">
                {['REGULAR','VIRTUAL'].map(v => <label key={v} className={`variant-opt ${selectedVariant === v ? 'active' : ''}`}><input type="radio" value={v} checked={selectedVariant === v} onChange={() => setSelectedVariant(v)} /><span>{v === 'REGULAR' ? 'Physical Card' : 'Virtual Card'}</span></label>)}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowCreditModal(false)}>Cancel</button>
              <button className="btn-primary" disabled={issuing} onClick={handleIssueCreditCard}>{issuing ? 'Issuing...' : 'Apply Now'}</button>
            </div>
          </div>
        </div>
      )}

      {showPrepaidModal && (
        <div className="modal-overlay" onClick={() => setShowPrepaidModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>{selectedVariant === 'VIRTUAL' ? 'Issue Virtual Prepaid Card' : 'Issue Prepaid Card'}</h3>
            <div className="modal-field">
              <label>Select Account</label>
              <select value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}>
                <option value="">-- Choose account --</option>
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.accountNumber} — {fmt(acc.balance)}</option>)}
              </select>
            </div>
            <div className="modal-field">
              <label>Load Amount (₹500 – ₹1,00,000)</label>
              <input type="number" min="500" max="100000" placeholder="e.g. 5000" value={prepaidAmount} onChange={e => setPrepaidAmount(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowPrepaidModal(false)}>Cancel</button>
              <button className="btn-primary" disabled={issuing} onClick={handleIssuePrepaid}>{issuing ? 'Issuing...' : 'Issue Card'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}