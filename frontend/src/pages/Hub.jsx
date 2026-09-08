import { Face } from '../App';

export default function Hub({ sections, onEnter, onLogout }) {
  return (
    <div className="hub">
      <h1>Where to, champ?</h1>
      <div className="hub-cards">
        {sections.map((s) => (
          <button key={s.id} className="hub-card" onClick={() => onEnter(s.id)}>
            <span className="face" style={{ background: s.color }}>
              <Face mouth={s.mouth} />
              {s.adminOnly && <span className="lock">🔒</span>}
            </span>
            {s.label}
          </button>
        ))}
      </div>
      <button className="hub-manage" onClick={onLogout}>✎ &nbsp;Switch account</button>
    </div>
  );
}
