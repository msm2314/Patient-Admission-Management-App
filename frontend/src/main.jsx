import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

const labels = { name: 'Full name', age: 'Age', gender: 'Gender', ward: 'Ward', department: 'Department', doctor: 'Doctor', admissionDate: 'Admission date', status: 'Status' };
const filterFields = ['ward', 'department', 'doctor'];
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const blank = () => ({ name: '', age: '', gender: '', ward: '', department: '', doctor: '', admissionDate: today(), status: 'Admitted' });

async function api(path, method = 'GET', body) {
  const response = await fetch('/api/' + path, { method, ...(body && {
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }) });
  if (response.status === 204) return;
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    throw Object.assign(new Error(data?.message || 'The server could not complete the request. Try again.'), { fields: data?.errors });
  }
  return data;
}

function Modal({ children, onClose, busy }) {
  const dialog = useRef(null);
  useEffect(() => {
    dialog.current.showModal();
  }, []);
  return <dialog ref={dialog} aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}>{children}</dialog>;
}

function App() {
  const [patients, setPatients] = useState([]);
  const [options, setOptions] = useState({});
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({});
  const [editor, setEditor] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failure, setFailure] = useState('');

  async function load() {
    setLoading(true);
    setFailure('');
    try {
      const [rows, choices] = await Promise.all([api('patients'), api('options')]);
      setPatients(rows);
      setOptions(choices);
    } catch (error) {
      setFailure(error.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function open(patient) {
    setErrors({});
    setFailure('');
    setMessage('');
    setEditor(patient ? { ...patient } : blank());
  }

  async function mutate(action, success) {
    setBusy(true);
    setFailure('');
    setMessage('');
    try {
      await action();
      setMessage(success);
    } catch (error) {
      setErrors(error.fields || {});
      setFailure(error.message);
    } finally {
      setBusy(false);
    }
  }

  function save(event) {
    event.preventDefault();
    const fields = {};
    const name = editor.name.trim();
    const age = Number(editor.age);
    if (!/^\p{L}+(?: +\p{L}+)*$/u.test(name)) fields.name = 'Enter a name using letters and spaces only.';
    if (String(editor.age).trim() === '' || !Number.isInteger(age) || age < 0 || age > 120) fields.age = 'Enter a whole number from 0 to 120.';
    for (const key of ['gender', ...filterFields, 'status']) {
      if (!options[key]?.includes(editor[key])) fields[key] = 'Select a valid ' + labels[key].toLowerCase() + '.';
    }
    const parsedDate = new Date(editor.admissionDate + 'T00:00:00Z');
    if (!/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(editor.admissionDate) || Number.isNaN(parsedDate.valueOf()) ||
        parsedDate.toISOString().slice(0, 10) !== editor.admissionDate || editor.admissionDate > today()) {
      fields.admissionDate = 'Enter a valid admission date on or before today.';
    }
    setErrors(fields);
    setFailure('');
    if (Object.keys(fields).length) return;
    const { id, ...values } = editor;
    mutate(async () => {
      const saved = await api(id ? 'patients/' + id : 'patients', id ? 'PUT' : 'POST', { ...values, name, age });
      setPatients(rows => id ? rows.map(row => row.id === id ? saved : row) : [...rows, saved]);
      setEditor(null);
    }, id ? 'Patient details updated.' : 'Patient added.');
  }

  const rows = patients.filter(patient =>
    patient.name.toLowerCase().includes(query.trim().toLowerCase()) &&
    filterFields.every(key => !filters[key] || filters[key] === patient[key])
  ).sort((a, b) => b.admissionDate.localeCompare(a.admissionDate) || a.name.localeCompare(b.name));
  const admitted = patients.filter(patient => patient.status === 'Admitted').length;
  const close = () => { setEditor(null); setPendingDelete(null); setFailure(''); };

  return <>
    <header><div className="shell top"><div className="brand"><span aria-hidden="true" className="logo">+</span>WardDesk</div><span className="header-label">Hospital operations</span></div></header>
    <main className="shell">
      <section className="intro"><div><h1>Patient admissions</h1><p>Manage patient records and track discharges.</p></div><button className="primary" disabled={loading || busy || !options.gender} onClick={() => open()}>＋ Add patient</button></section>
      <section className="stats" aria-label="Patient counts">
        {[['Total patients', patients.length], ['Admitted', admitted], ['Discharged', patients.length - admitted]].map(([label, count]) =>
          <div className="stat" key={label}><span>{label}</span><strong>{loading || !options.gender ? '—' : count}</strong></div>
        )}
      </section>
      <section className="panel" aria-labelledby="registry">
        <div className="panel-head"><h2 id="registry">Patient registry</h2><span>{rows.length} of {patients.length} patients</span></div>
        <div className="filters">
          <label>Search by name<input type="search" placeholder="Enter a patient name" value={query} onChange={e => setQuery(e.target.value)}/></label>
          {filterFields.map(key => <label key={key}>{labels[key]}<select value={filters[key] || ''} onChange={e => setFilters({ ...filters, [key]: e.target.value })}>
            <option value="">All {labels[key].toLowerCase()}s</option>{options[key]?.map(choice => <option key={choice}>{choice}</option>)}
          </select></label>)}
          <button onClick={() => {setFilters({}); setQuery('');}} disabled={!query && !Object.values(filters).some(Boolean)}>Clear filters</button>
        </div>
        {message && <p className="notice" role="status">{message}</p>}
        {failure && !editor && !pendingDelete && <p className="notice error" role="alert">{failure} {!options.gender && <button onClick={load}>Retry</button>}</p>}
        {loading ? <p className="empty" role="status">Loading patients…</p> : options.gender && (rows.length ?
          <table><thead><tr>{['Patient', 'Ward', 'Department', 'Doctor', 'Admission date', 'Status', 'Actions'].map(heading => <th key={heading} scope="col">{heading}</th>)}</tr></thead>
          <tbody>{rows.map(patient => <tr key={patient.id}>
            <th scope="row">{patient.name}<small>{patient.age} years · {patient.gender}</small></th>
            <td data-label="Ward">{patient.ward}</td><td data-label="Department">{patient.department}</td>
            <td data-label="Doctor">{patient.doctor}</td><td data-label="Admission date">{patient.admissionDate}</td>
            <td data-label="Status"><span className={'badge ' + patient.status.toLowerCase()}>{patient.status}</span></td>
            <td className="actions"><button disabled={busy} onClick={() => open(patient)}>Edit</button>
              {patient.status === 'Admitted' && <button disabled={busy} onClick={() => mutate(async () => {
                const saved = await api('patients/' + patient.id + '/discharge', 'PATCH');
                setPatients(list => list.map(row => row.id === saved.id ? saved : row));
              }, 'Patient discharged.')}>Discharge</button>}
              <button className="danger-text" disabled={busy} onClick={() => { setFailure(''); setPendingDelete(patient); }}>Delete</button>
            </td>
          </tr>)}</tbody></table> : <p className="empty">{patients.length ? 'No patients match your search and filters.' : 'No patients yet. Add a patient to start the registry.'}</p>)}
      </section>
    </main>
    {editor && <Modal onClose={close} busy={busy}><form onSubmit={save} noValidate>
      <h2 id="dialog-title">{editor.id ? 'Edit patient' : 'Add patient'}</h2>
      <div className="form-grid">{Object.entries(labels).map(([key, label]) => <label key={key}>{label}
        {options[key] ? <select required value={editor[key]} onChange={e => setEditor({ ...editor, [key]: e.target.value })} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? key + '-error' : undefined}>
          <option value="">Select {label.toLowerCase()}</option>{options[key].map(choice => <option key={choice}>{choice}</option>)}
        </select> : <input required type={key === 'age' ? 'number' : key === 'admissionDate' ? 'date' : 'text'} min={key === 'age' ? 0 : undefined} max={key === 'age' ? 120 : key === 'admissionDate' ? today() : undefined} value={editor[key]} onChange={e => setEditor({ ...editor, [key]: e.target.value })} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? key + '-error' : undefined}/>}
        {errors[key] && <small className="error" id={key + '-error'}>{errors[key]}</small>}
      </label>)}</div>
      {failure && <p className="error" role="alert">{failure}</p>}
      <div className="dialog-actions"><button type="button" disabled={busy} onClick={close}>Cancel</button><button className="primary" disabled={busy}>{busy ? 'Saving…' : 'Save patient'}</button></div>
    </form></Modal>}
    {pendingDelete && <Modal onClose={close} busy={busy}><h2 id="dialog-title">Delete patient?</h2>
      <p>Permanently delete the record for <strong>{pendingDelete.name}</strong>?</p>
      {failure && <p className="error" role="alert">{failure}</p>}
      <div className="dialog-actions"><button autoFocus disabled={busy} onClick={close}>Cancel</button><button className="danger" disabled={busy} onClick={() => mutate(async () => {
        await api('patients/' + pendingDelete.id, 'DELETE');
        setPatients(list => list.filter(row => row.id !== pendingDelete.id));
        setPendingDelete(null);
      }, 'Patient deleted.')}>{busy ? 'Deleting…' : 'Delete patient'}</button></div>
    </Modal>}
  </>;
}

createRoot(document.getElementById('root')).render(<App />);
