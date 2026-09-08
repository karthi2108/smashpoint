import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { CATS } from '../App';
import CatPills from '../components/CatPills';

function roundName(idx, total) {
  const remaining = total - idx;
  if (remaining === 1) return 'Final';
  if (remaining === 2) return 'Semi-finals';
  if (remaining === 3) return 'Quarter-finals';
  return `Round ${idx + 1}`;
}

export default function Fixtures({ isAdmin, onScore }) {
  const [cat, setCat] = useState('MS');
  const [flat, setFlat] = useState([]);
  const [entryCount, setEntryCount] = useState(0);

  const load = async (c = cat) => {
    setFlat(await api.bracket(c));
    setEntryCount((await api.entries(c)).length);
  };
  useEffect(() => { load(cat); }, [cat]);

  const rounds = useMemo(() => {
    const byRound = new Map();
    for (const m of flat) {
      if (!byRound.has(m.round_idx)) byRound.set(m.round_idx, []);
      byRound.get(m.round_idx).push(m);
    }
    return [...byRound.keys()].sort((a, b) => a - b).map((r) => byRound.get(r));
  }, [flat]);

  const generate = async () => {
    try { await api.generateBracket(cat); load(); } catch (e) { alert(e.message); }
  };
  const removeDraw = async () => {
    if (window.confirm('Delete this draw?')) { await api.deleteBracket(cat); load(); }
  };
  const rename = async (m, side) => {
    const current = side === 'a' ? m.side_a : m.side_b;
    const name = window.prompt('Edit name:', current);
    if (name && name.trim()) { await api.renameSide(m.id, side, name.trim()); load(); }
  };
  const walkover = async (m) => {
    const w = window.prompt(`Who advances by walkover?\n1 = ${m.side_a}\n2 = ${m.side_b}`);
    if (w === '1' || w === '2') { await api.walkover(m.id, w === '1' ? 'a' : 'b'); load(); }
  };

  const Side = ({ m, side }) => {
    const name = side === 'a' ? m.side_a : m.side_b;
    const won = m.winner && name && m.winner === name;
    const ready = m.side_a && m.side_b && !m.winner;
    const editable = isAdmin && name && !m.winner;
    return (
      <div className={`side ${won ? 'winner' : ''}`}>
        <span className={`nm ${editable ? 'editable' : ''}`} onClick={editable ? () => rename(m, side) : undefined}>
          {name || <span style={{ color: 'var(--muted)' }}>— TBD —</span>}
        </span>
        {won && <span className="sc">🏆</span>}
        {isAdmin && ready && (
          <button className="btn btn-sm" title="Open scorecard for this match" onClick={() => onScore(m)}>
            ▶ Score
          </button>
        )}
      </div>
    );
  };

  return (
    <>
      <h2>Fixtures</h2>
      <div className="sub">
        Knockout draws per category.{' '}
        {isAdmin
          ? 'Click a name to edit it. The ▶ button opens the scorecard with names and match type pre-filled.'
          : 'Live view — scores update as matches are played.'}
      </div>
      <CatPills value={cat} onChange={setCat} />
      {isAdmin && (
        <div style={{ marginBottom: '1rem', display: 'flex', gap: '.6rem' }}>
          <button className="btn" onClick={generate}>
            {rounds.length ? 'Regenerate draw' : 'Generate draw'} ({entryCount} entries)
          </button>
          {rounds.length > 0 && <button className="btn-danger btn-sm" onClick={removeDraw}>Delete draw</button>}
        </div>
      )}
      {rounds.length === 0 ? (
        <div className="card empty">
          No fixtures yet for {CATS[cat].label}.
          {isAdmin ? ' Generate the draw from the current entry list.' : ' Check back once the admin publishes the draw.'}
        </div>
      ) : (
        <div className="bracket-wrap">
          <div className="bracket">
            {rounds.map((round, r) => (
              <div className="round" key={r}>
                <h4>{roundName(r, rounds.length)}</h4>
                {round.map((m) => (
                  <div className={`match ${m.winner ? 'done' : ''}`} key={m.id}>
                    <Side m={m} side="a" />
                    <Side m={m} side="b" />
                    {m.score_text && (
                      <div className="side" style={{ justifyContent: 'center' }}>
                        <span className="sc">{m.score_text}</span>
                      </div>
                    )}
                    {isAdmin && m.side_a && m.side_b && !m.winner && (
                      <div className="actions">
                        <button className="btn-ghost btn-sm" onClick={() => walkover(m)}>Walkover</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
