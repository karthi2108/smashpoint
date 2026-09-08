import { useEffect, useRef, useState } from 'react';
import { api, matchSocket } from '../api';
import { CATS } from '../App';

export default function Live() {
  const [all, setAll] = useState([]);
  const [selected, setSelected] = useState(null); // match id
  const [board, setBoard] = useState(null); // live payload
  const wsRef = useRef(null);

  useEffect(() => {
    api.matches().then((ms) => {
      setAll(ms);
      const live = ms.find((m) => !m.finished) || ms[0];
      if (live) setSelected(live.id);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    if (wsRef.current) wsRef.current.close();
    setBoard(null);
    const ws = matchSocket(selected, (payload) => {
      if (!payload.deleted) setBoard(payload);
    });
    wsRef.current = ws;
    return () => ws.close();
  }, [selected]);

  const st = board?.state;
  const c = board?.config;

  return (
    <>
      <h2>Live display</h2>
      <div className="sub">
        Open this on the courtside monitor — it updates instantly over WebSocket as the umpire scores.
        Press <b>F11</b> for fullscreen.
      </div>
      {all.length > 0 && (
        <div className="row" style={{ marginBottom: '1rem' }}>
          <div className="field">
            <label>Court / match</label>
            <select value={selected || ''} onChange={(e) => setSelected(Number(e.target.value))}>
              {all.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.side_a} vs {m.side_b} {m.finished ? '(finished)' : '(live)'}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
      <div className="liveBoard">
        {!board ? (
          <div className="empty" style={{ color: 'var(--muted)' }}>
            {all.length ? 'Connecting…' : 'No matches yet. Start one from the scorecard.'}
          </div>
        ) : (
          <>
            <div className="lb-cat">
              {(board.category ? CATS[board.category].label : 'Friendly')} · {c.target} points ·{' '}
              {c.best_of === 1 ? 'single set' : 'best of 3'}
            </div>
            <div className="lb-grid">
              <div>
                <div className="lb-serve">{st.server === 'a' && !board.finished ? '● SERVING' : ''}</div>
                <div className="lb-name">{board.side_a}</div>
                <div className="lb-pts a digits">{st.pts.a}</div>
              </div>
              <div className="lb-sets digits">
                {st.sets_won.a} <span style={{ color: '#5a5650' }}>sets</span> {st.sets_won.b}
              </div>
              <div>
                <div className="lb-serve">{st.server === 'b' && !board.finished ? '● SERVING' : ''}</div>
                <div className="lb-name">{board.side_b}</div>
                <div className="lb-pts b digits">{st.pts.b}</div>
              </div>
            </div>
            <div className="lb-status">
              {board.finished ? st.note : st.note || `Game ${st.set_log.length + 1} of ${c.best_of}`}
              {st.set_log.length > 0 && ' · Games: ' + st.set_log.map((s) => `${s[0]}–${s[1]}`).join(', ')}
            </div>
          </>
        )}
      </div>
    </>
  );
}
