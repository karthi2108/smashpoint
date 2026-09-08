import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { CATS } from '../App';
import CatPills from '../components/CatPills';

export default function Players() {
  const [cat, setCat] = useState('MS');
  const [entries, setEntries] = useState([]);
  const [paste, setPaste] = useState('');
  const [msg, setMsg] = useState('');
  const fileRef = useRef(null);

  const load = async (c = cat) => setEntries(await api.entries(c));
  useEffect(() => { load(cat); }, [cat]);

  const addPasted = async () => {
    const names = paste.split('\n').map((s) => s.trim()).filter(Boolean);
    if (!names.length) { setMsg('Nothing to add — paste names or choose a file first.'); return; }
    try {
      await api.addEntries(cat, names);
      setPaste(''); setMsg(`Added ${names.length} entries.`); load();
    } catch (e) { setMsg(e.message); }
  };

  const upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMsg('Importing…');
    try {
      const created = await api.importFile(cat, file);
      setMsg(`Imported ${created.length} entries from ${file.name}.`); load();
    } catch (err) { setMsg(err.message); }
    if (fileRef.current) fileRef.current.value = '';
  };

  const remove = async (id) => { await api.deleteEntry(id); load(); };
  const clear = async () => {
    if (window.confirm('Remove all entries in this category?')) { await api.clearCategory(cat); load(); }
  };

  const info = CATS[cat];
  return (
    <>
      <h2>Players & entries</h2>
      <div className="sub">
        Import from Excel/CSV or add manually. For doubles, one entry = a pair, written as <b>Player 1 / Player 2</b>.
      </div>
      <CatPills value={cat} onChange={setCat} />
      <div className="grid-2">
        <div className="card">
          <h3 style={{ fontSize: '1rem', marginBottom: '.6rem' }}>Import into {info.label}</h3>
          <div className="field" style={{ marginBottom: '.8rem' }}>
            <label>Excel / CSV file (first column = name{info.type === 'doubles' ? ' or "Name1 / Name2"' : ''})</label>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={upload} />
          </div>
          <div className="field">
            <label>Or paste names — one per line</label>
            <textarea rows={6} value={paste} onChange={(e) => setPaste(e.target.value)}
              placeholder={info.type === 'doubles' ? 'Arun / Vignesh\nKarthik / Mohan' : 'Arun Kumar\nVignesh R'} />
          </div>
          <div style={{ marginTop: '.9rem', display: 'flex', gap: '.6rem' }}>
            <button className="btn" onClick={addPasted}>Add to {info.label}</button>
            <button className="btn-dark" onClick={clear}>Clear category</button>
          </div>
          <div className="sub" style={{ margin: '.6rem 0 0' }}>{msg}</div>
        </div>
        <div className="card">
          <h3 style={{ fontSize: '1rem' }}>
            {info.label} — {entries.length} entries <span className="tag">{info.type}</span>
          </h3>
          {entries.length ? (
            <ul className="entries">
              {entries.map((e, i) => (
                <li key={e.id}>
                  <span>{i + 1}. {e.name}</span>
                  <button title="Remove" onClick={() => remove(e.id)}>✕</button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty">No entries yet. Import a file or paste names on the left.</div>
          )}
        </div>
      </div>
    </>
  );
}
