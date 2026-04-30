import React, { useState, useEffect } from 'react';
import Header from './Header';
import { employeeAPI } from '../api';

const DEPARTMENTS = ['CUSTOMER_SERVICE', 'LOANS', 'KYC', 'ACCOUNTS', 'MANAGEMENT', 'IT'];

const styles = {
  page: { padding: '2rem', maxWidth: '1200px', margin: '0 auto' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' },
  title: { margin: 0, fontSize: '1.6rem', color: '#1a365d' },
  btnPrimary: { background: '#2d6a9f', color: '#fff', border: 'none', padding: '0.65rem 1.4rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' },
  btnDanger: { background: '#fff', color: '#e53e3e', border: '1px solid #e53e3e', padding: '0.35rem 0.85rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 },
  table: { width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' },
  th: { background: '#f0f4f8', padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '0.05em' },
  td: { padding: '0.85rem 1rem', borderBottom: '1px solid #e2e8f0', fontSize: '0.9rem', color: '#2d3748' },
  badge: (dept) => ({
    display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: 600,
    background: dept === 'KYC' ? '#ebf8ff' : dept === 'LOANS' ? '#fffaf0' : dept === 'IT' ? '#f0fff4' : '#faf5ff',
    color: dept === 'KYC' ? '#2b6cb0' : dept === 'LOANS' ? '#c05621' : dept === 'IT' ? '#276749' : '#553c9a',
  }),
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: '16px', padding: '2rem', width: '480px', maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' },
  modalTitle: { margin: '0 0 1.5rem', fontSize: '1.2rem', color: '#1a365d' },
  field: { marginBottom: '1rem' },
  label: { display: 'block', marginBottom: '0.3rem', fontSize: '0.82rem', fontWeight: 600, color: '#4a5568' },
  input: { width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #cbd5e0', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' },
  select: { width: '100%', padding: '0.6rem 0.8rem', border: '1px solid #cbd5e0', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box', background: '#fff' },
  modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' },
  btnSecondary: { background: '#f7fafc', color: '#4a5568', border: '1px solid #cbd5e0', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 },
  alert: (type) => ({ padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.88rem', background: type === 'error' ? '#fff5f5' : '#f0fff4', color: type === 'error' ? '#c53030' : '#276749', border: `1px solid ${type === 'error' ? '#feb2b2' : '#9ae6b4'}` }),
  emptyState: { textAlign: 'center', padding: '3rem', color: '#718096' },
};

export default function ManageEmployees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', username: '',
    password: '', phone: '', joiningDate: new Date().toISOString().split('T')[0],
    department: 'KYC',
  });

  useEffect(() => { fetchEmployees(); }, []);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await employeeAPI.getAllEmployees();
      setEmployees(res.data.data || []);
    } catch (e) {
      setError('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    setError(''); setSuccess('');
    if (!form.firstName || !form.lastName || !form.email || !form.username || !form.password || !form.phone) {
      setError('All fields are required'); return;
    }
    setSubmitting(true);
    try {
      await employeeAPI.createEmployee(form);
      setSuccess(`Employee ${form.firstName} ${form.lastName} created successfully!`);
      setShowModal(false);
      setForm({ firstName: '', lastName: '', email: '', username: '', password: '', phone: '', joiningDate: new Date().toISOString().split('T')[0], department: 'KYC' });
      fetchEmployees();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to create employee');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (emp) => {
    if (!window.confirm(`Delete employee ${emp.firstName} ${emp.lastName} (${emp.employeeId})?`)) return;
    try {
      await employeeAPI.deleteEmployee(emp.id);
      setSuccess(`${emp.firstName} ${emp.lastName} removed successfully`);
      fetchEmployees();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to delete employee');
    }
  };

  return (
    <>
      <Header />
      <div style={styles.page}>
        <div style={styles.topBar}>
          <h2 style={styles.title}>👥 Manage Employees</h2>
          <button style={styles.btnPrimary} onClick={() => { setError(''); setSuccess(''); setShowModal(true); }}>
            + Add Employee
          </button>
        </div>

        {error && <div style={styles.alert('error')}>{error}</div>}
        {success && <div style={styles.alert('success')}>{success}</div>}

        {loading ? (
          <div style={styles.emptyState}>Loading employees...</div>
        ) : employees.length === 0 ? (
          <div style={styles.emptyState}>No employees found.</div>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                {['Emp ID', 'Name', 'Email', 'Phone', 'Department', 'Joining Date', 'Status', 'Actions'].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(emp => (
                <tr key={emp.id}>
                  <td style={styles.td}><strong>{emp.employeeId}</strong></td>
                  <td style={styles.td}>{emp.firstName} {emp.lastName}</td>
                  <td style={styles.td}>{emp.email}</td>
                  <td style={styles.td}>{emp.phone}</td>
                  <td style={styles.td}><span style={styles.badge(emp.department)}>{emp.department.replace('_', ' ')}</span></td>
                  <td style={styles.td}>{emp.joiningDate}</td>
                  <td style={styles.td}>
                    <span style={{ color: emp.status === 'ACTIVE' ? '#276749' : '#c05621', fontWeight: 600 }}>
                      {emp.status}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <button style={styles.btnDanger} onClick={() => handleDelete(emp)}>🗑 Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {showModal && (
          <div style={styles.overlay} onClick={() => setShowModal(false)}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
              <h3 style={styles.modalTitle}>➕ Add New Employee</h3>
              {error && <div style={styles.alert('error')}>{error}</div>}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[['firstName','First Name'],['lastName','Last Name'],['email','Email'],['username','Username'],['password','Password'],['phone','Phone']].map(([name, label]) => (
                  <div key={name} style={styles.field}>
                    <label style={styles.label}>{label}</label>
                    <input
                      style={styles.input}
                      type={name === 'password' ? 'password' : name === 'email' ? 'email' : 'text'}
                      name={name}
                      value={form[name]}
                      onChange={handleChange}
                      placeholder={label}
                    />
                  </div>
                ))}
                <div style={styles.field}>
                  <label style={styles.label}>Joining Date</label>
                  <input style={styles.input} type="date" name="joiningDate" value={form.joiningDate} onChange={handleChange} />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Department</label>
                  <select style={styles.select} name="department" value={form.department} onChange={handleChange}>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d.replace('_', ' ')}</option>)}
                  </select>
                </div>
              </div>

              <div style={styles.modalActions}>
                <button style={styles.btnSecondary} onClick={() => setShowModal(false)}>Cancel</button>
                <button style={styles.btnPrimary} disabled={submitting} onClick={handleSubmit}>
                  {submitting ? 'Creating...' : 'Create Employee'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}