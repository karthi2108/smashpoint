import { useEffect, useState } from 'react';
import { api } from '../api';
import { CATS } from '../App';

const CUSTOM = '__custom__';

export default function Scorecard({ pending, clearPending, onFinished }) {
  const [match, setMatch] = useState(null); // active live match
  const [openMatches, setOpenMatches] = useState([]);

  // config
  const [target, setTarget] = useState(21);
  const [bestOf, setBestOf] = useState(3);
  const [matchType, setMatchType] = useState(pending ? CATS[pending.category].type : 'singles');

  // player fetch (friendly flow)
  const [players, setPlayers] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [selFixture, setSelFixture] = useState('');
  const [selA, setSelA] = useState('');
  const [selB, setSelB] = useState('');
  const [custA, setCustA] = useState('');
  const [custB, setCustB] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => {
    api.matches().then((ms) => setOpenMatches(ms.filter((m) => !m.finished)));
  }, [match]);

  // Fetch players + ready fixtures whenever the match type changes (friendly flow only)
  useEffect(() => {
    if (pending) return;
    (async () => {
      const cats = Object.keys(CATS).filter((c) => CATS[c].type === matchType);
      const all = [];
      const fx = [];
      for (const c of cats) {
        const entries = await api.entries(c);
        entries.forEach((e) => all.push({ name: e.name, cat: c }));
        const bracket = await api.bracket(c);
        bracket
          .filter((b) => b.side_a && b.side_b && !b.winner)
          .forEach((b) => fx.push({ ...b, label: `${CATS[c].label}: ${b.side_a} vs ${b.side_b}` }));
      }
      setPlayers(all);
      setFixtures(fx);
      setSelA(all[0]?.name || CUSTOM);
      setSelB(all[1]?.name || CUSTOM);
      setSelFixture('');
    })();
  }, [matchType, pending]);

  const start = async () => {
    setErr('');
    try {
      let body = { target: Number(target), best_of: Number(bestOf), match_type: matchType };
      if (pending) {
        body.bracket_match_id = pending.id;
      } else if (selFixture) {
        body.bracket_match_id = Number(selFixture);
      } else {
        body.side_a = selA === CUSTOM ? custA.trim() : selA;
        body.side_b = selB === CUSTOM ? custB.trim() : selB;
      }
      const m = await api.createMatch(body);
      clearPending();
      setMatch(m);
    } catch (e) { setErr(e.message); }
  };

  const point = async (side) => {
    try {
      const m = await api.point(match.id, side);
      setMatch(m);
      if (m.finished) {
        window.alert(`🏆 ${m.state.note}`);
        setMatch(null);
        onFinished();
      }
    } catch (e) { setErr(e.message); }
  };

  const undo = async () => {
    try { setMatch(await api.undo(match.id)); } catch (e) { setErr(e.message); }
  };
  const abandon = async () => {
    if (!window.confirm('Abandon this match? Scores will be discarded.')) return;
    await api.abandon(match.id);
    setMatch(null);
  };

  /* ---------- live scoreboard ---------- */
  if (match && !match.finished) {
    const { state: st, config: c } = match;
    const need = Math.ceil(c.best_of / 2);
    const dots = (n) => '●'.repeat(n) + '○'.repeat(need - n);
    const court = st.pts[st.server] % 2 === 0 ? 'right' : 'left';
    const Pad = ({ side, name }) => (
      <div className={`pad ${side}`} onClick={() => point(side)}>
        {st.server === side && <span className="serve">SERVE</span>}
        <div className="pname">{name}</div>
        <div className="pts digits">{st.pts[side]}</div>
        <div className="setdots">{dots(st.sets_won[side])}</div>
      </div>
    );
    return (
      <>
        <h2>
          Umpire scorecard{' '}
          <span className="tag">
            {c.match_type} · {c.target} pts · {c.best_of === 1 ? 'single set' : 'best of 3'}
          </span>
        </h2>
        <div className="sub">
          Tap the side that won the rally. Game {st.set_log.length + 1}. Serving from the <b>{court}</b> service court.
        </div>
        <div className="umpire">
          <Pad side="a" name={match.side_a} />
          <div className="mid">
            <button className="btn-ghost" onClick={undo}>↩ Undo</button>
            <button className="btn-danger btn-sm" onClick={abandon}>Abandon</button>
            <div className="info">
              Interval at {Math.floor(c.target / 2) + 1} · deuce win-by-2 · cap {c.cap}
            </div>
          </div>
          <Pad side="b" name={match.side_b} />
        </div>
        <div className="banner">{st.note || '\u00A0'}</div>
        {st.set_log.length > 0 && (
          <table className="setlog">
            <tbody>
              <tr><th>Game</th>{st.set_log.map((_, i) => <th key={i}>{i + 1}</th>)}</tr>
              <tr><td>{match.side_a}</td>{st.set_log.map((s, i) => <td className="digits" key={i}>{s[0]}</td>)}</tr>
              <tr><td>{match.side_b}</td>{st.set_log.map((s, i) => <td className="digits" key={i}>{s[1]}</td>)}</tr>
            </tbody>
          </table>
        )}
        <div className="err">{err}</div>
      </>
    );
  }

  /* ---------- config screen ---------- */
  const stepStart = pending ? 2 : 3;
  return (
    <>
      <h2>Umpire scorecard</h2>
      <div className="sub">Set the match format first — the player list is fetched automatically to match it.</div>
      <div className="card">
        {pending && (
          <div style={{ marginBottom: '.4rem' }}>
            <span className="tag">{CATS[pending.category].label}</span>{' '}
            <b style={{ marginLeft: '.5rem' }}>{pending.side_a}</b>{' '}
            <span style={{ color: 'var(--muted)' }}>vs</span> <b>{pending.side_b}</b>
            <span className="sub" style={{ display: 'block', margin: '.3rem 0 0' }}>
              Names and match type came from the fixture — just confirm points and sets.
            </span>
          </div>
        )}
        <div className="step"><span className="n">1</span> Match format</div>
        <div className="row">
          <div className="field">
            <label>Points per game</label>
            <select value={target} onChange={(e) => setTarget(e.target.value)}>
              <option>11</option><option>21</option><option>30</option>
            </select>
          </div>
          <div className="field">
            <label>Sets</label>
            <select value={bestOf} onChange={(e) => setBestOf(e.target.value)}>
              <option value="1">Single set</option>
              <option value="3">Best of 3</option>
            </select>
          </div>
          <div className="field">
            <label>Match type</label>
            <select value={matchType} disabled={!!pending} onChange={(e) => setMatchType(e.target.value)}>
              <option>singles</option><option>doubles</option>
            </select>
          </div>
        </div>
        {!pending && (
          <>
            <div className="step">
              <span className="n">2</span> Players{' '}
              <span className="sub" style={{ margin: 0, fontWeight: 400 }}>
                — fetched from entries matching the type above
              </span>
            </div>
            <div className="row">
              <div className="field">
                <label>Fixture match (optional)</label>
                <select value={selFixture} onChange={(e) => setSelFixture(e.target.value)}>
                  <option value="">— none / friendly —</option>
                  {fixtures.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                </select>
              </div>
              {!selFixture && (
                <>
                  <div className="field">
                    <label>Side A</label>
                    <select value={selA} onChange={(e) => setSelA(e.target.value)}>
                      {players.map((p, i) => <option key={i} value={p.name}>{p.name} ({p.cat})</option>)}
                      <option value={CUSTOM}>✏️ Custom name…</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Side B</label>
                    <select value={selB} onChange={(e) => setSelB(e.target.value)}>
                      {players.map((p, i) => <option key={i} value={p.name}>{p.name} ({p.cat})</option>)}
                      <option value={CUSTOM}>✏️ Custom name…</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="row" style={{ marginTop: '.5rem' }}>
              {selA === CUSTOM && !selFixture && (
                <div className="field"><label>Custom side A</label>
                  <input value={custA} onChange={(e) => setCustA(e.target.value)} placeholder="Type a name" /></div>
              )}
              {selB === CUSTOM && !selFixture && (
                <div className="field"><label>Custom side B</label>
                  <input value={custB} onChange={(e) => setCustB(e.target.value)} placeholder="Type a name" /></div>
              )}
            </div>
          </>
        )}
        <div className="step"><span className="n">{stepStart}</span> Start</div>
        <button className="btn" onClick={start}>Start match ▶</button>
        <div className="err">{err}</div>
        {openMatches.length > 0 && (
          <div className="sub" style={{ marginTop: '1rem' }}>
            In progress:{' '}
            {openMatches.map((m) => (
              <button key={m.id} className="btn-dark btn-sm" style={{ marginRight: '.4rem' }}
                onClick={() => setMatch(m)}>
                {m.side_a} vs {m.side_b}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
