import { useState } from 'react';
import { setToken } from './api';
import Login from './pages/Login';
import Hub from './pages/Hub';
import Players from './pages/Players';
import Fixtures from './pages/Fixtures';
import Scorecard from './pages/Scorecard';
import Live from './pages/Live';

export const CATS = {
  MS: { label: "Men's singles", type: 'singles' },
  MD: { label: "Men's doubles", type: 'doubles' },
  WS: { label: "Women's singles", type: 'singles' },
  WD: { label: "Women's doubles", type: 'doubles' },
  XD: { label: 'Mixed doubles', type: 'doubles' },
};

export const SECTIONS = [
  { id: 'players', label: 'Players', color: '#FF6B1A', mouth: 'grin', adminOnly: true },
  { id: 'fixtures', label: 'Fixtures', color: '#FFC145', mouth: 'o' },
  { id: 'scoring', label: 'Scorecard', color: '#35D0A0', mouth: 'flat', adminOnly: true },
  { id: 'live', label: 'Live display', color: '#5B8DEF', mouth: 'grin' },
];

export function Face({ mouth }) {
  const m =
    mouth === 'grin' ? <path d="M18 38 Q32 52 46 38" stroke="#111" strokeWidth="5" fill="none" strokeLinecap="round" />
    : mouth === 'o' ? <circle cx="32" cy="42" r="6" fill="#111" />
    : mouth === 'flat' ? <path d="M20 42 H44" stroke="#111" strokeWidth="5" strokeLinecap="round" />
    : <path d="M20 44 Q32 36 44 44" stroke="#111" strokeWidth="5" fill="none" strokeLinecap="round" />;
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <circle cx="20" cy="24" r="4.5" fill="#111" />
      <circle cx="44" cy="24" r="4.5" fill="#111" />
      {m}
    </svg>
  );
}

export default function App() {
  const [role, setRole] = useState(null); // null | 'admin' | 'viewer'
  const [view, setView] = useState('hub'); // 'hub' | section id
  const [pendingBracketMatch, setPendingBracketMatch] = useState(null); // fixture → scorecard handoff

  const isAdmin = role === 'admin';
  const sections = SECTIONS.filter((s) => !s.adminOnly || isAdmin);

  const login = (token, r) => { setToken(token); setRole(r); setView('hub'); };
  const logout = () => { setToken(null); setRole(null); setPendingBracketMatch(null); };

  const openScorecard = (bracketMatch) => { setPendingBracketMatch(bracketMatch); setView('scoring'); };

  if (!role) return <Login onLogin={login} />;
  if (view === 'hub') return <Hub sections={sections} onEnter={setView} onLogout={logout} />;

  const pages = {
    players: <Players />,
    fixtures: <Fixtures isAdmin={isAdmin} onScore={openScorecard} />,
    scoring: (
      <Scorecard
        pending={pendingBracketMatch}
        clearPending={() => setPendingBracketMatch(null)}
        onFinished={() => setView('fixtures')}
      />
    ),
    live: <Live />,
  };

  return (
    <>
      <header className="app">
        <div className="logo" onClick={() => setView('hub')} title="Back to menu">
          Smash<span>Point</span>
        </div>
        <nav className="tabs">
          {sections.map((s) => (
            <button key={s.id} className={view === s.id ? 'active' : ''} onClick={() => setView(s.id)}>
              <span className="mini" style={{ background: s.color }}>
                <Face mouth={s.mouth} />
              </span>
              {s.label}
            </button>
          ))}
        </nav>
        <div className="who">
          <span>{isAdmin ? 'Admin' : 'Spectator'}</span>
          <button className="btn-dark btn-sm" onClick={logout}>Sign out</button>
        </div>
      </header>
      <main>{pages[view] || pages.fixtures}</main>
    </>
  );
}
