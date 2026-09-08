import { CATS } from '../App';

export default function CatPills({ value, onChange }) {
  return (
    <div className="cat-pills">
      {Object.keys(CATS).map((c) => (
        <button key={c} className={c === value ? 'active' : ''} onClick={() => onChange(c)}>
          {CATS[c].label}
        </button>
      ))}
    </div>
  );
}
