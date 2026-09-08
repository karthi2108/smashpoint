import { useState } from 'react';
import { api } from '../api';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');

  const submit = async () => {
    setErr('');
    try {
      const r = await api.login(username.trim(), password);
      onLogin(r.access_token, r.role);
    } catch (e) {
      setErr(e.message || 'Login failed');
    }
  };

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="logo">Smash<span>Point</span></div>
        <p>Badminton tournament fixtures, umpire scoring and live courtside display.</p>
        <label htmlFor="lu">Username</label>
        <input id="lu" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin" />
        <label htmlFor="lp">Password</label>
        <input id="lp" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()} placeholder="••••••••" />
        <div className="err">{err}</div>
        <button className="btn" style={{ width: '100%' }} onClick={submit}>Sign in as admin</button>
        <div className="divider">or</div>
        <button className="btn-ghost" style={{ width: '100%' }} onClick={() => onLogin(null, 'viewer')}>
          Continue as player / spectator
        </button>
        <div className="hint">Default admin — username <b>admin</b>, password <b>admin123</b></div>
      </div>
    </div>
  );
}
