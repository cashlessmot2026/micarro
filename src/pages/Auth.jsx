import { useState } from 'react';
import { Mail, Lock, Loader2, ArrowRight, Fuel, Bell, MapPin, ScanLine } from 'lucide-react';
import { supabase } from '../supabase';
import { useStore } from '../store';
import { Segmented } from '../components/ui';

export default function Auth() {
  const { setMode } = useStore();
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try {
      if (tab === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
      } else if (tab === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password: pass, options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL } });
        if (error) throw error;
        if (!data.session) setMsg({ ok: true, text: 'Te enviamos un correo para confirmar tu cuenta. Luego inicia sesión.' });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + import.meta.env.BASE_URL });
        if (error) throw error;
        setMsg({ ok: true, text: 'Revisa tu correo para restablecer la contraseña.' });
      }
    } catch (err) {
      setMsg({ ok: false, text: traducir(err.message) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-hero">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="auth-logo" />
        <h1>Mi Vehículo</h1>
        <p>Combustible, mantenimientos, documentos, multas y alertas. Todo en un solo lugar.</p>
        <div className="auth-feats">
          <span><Fuel size={16} />Rendimiento</span><span><Bell size={16} />Alertas</span>
          <span><MapPin size={16} />GPS</span><span><ScanLine size={16} />OCR tarjeta</span>
        </div>
      </div>

      <form className="card auth-card" onSubmit={submit}>
        <Segmented options={[{ value: 'login', label: 'Ingresar' }, { value: 'signup', label: 'Crear cuenta' }]} value={tab === 'reset' ? 'login' : tab} onChange={(t) => { setTab(t); setMsg(null); }} />
        <label className="field"><span className="label">Correo</span>
          <div className="input-wrap"><span className="prefix"><Mail size={16} /></span>
            <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" /></div></label>
        {tab !== 'reset' && (
          <label className="field"><span className="label">Contraseña</span>
            <div className="input-wrap"><span className="prefix"><Lock size={16} /></span>
              <input type="password" required minLength={6} autoComplete={tab === 'login' ? 'current-password' : 'new-password'} value={pass} onChange={(e) => setPass(e.target.value)} placeholder="Mínimo 6 caracteres" /></div></label>
        )}
        {msg && <p className={`small ${msg.ok ? 'ok-text' : 'warn-text'}`}>{msg.text}</p>}
        <button className="btn btn-primary block" disabled={busy}>
          {busy ? <Loader2 size={18} className="spin" /> : <ArrowRight size={18} />}
          {tab === 'login' ? 'Ingresar' : tab === 'signup' ? 'Crear cuenta' : 'Enviar enlace'}
        </button>
        {tab === 'login' && <button type="button" className="link center" onClick={() => setTab('reset')}>¿Olvidaste tu contraseña?</button>}
      </form>

      <button className="btn btn-ghost block" onClick={() => setMode('local')}>Usar sin cuenta (solo este dispositivo)</button>
    </div>
  );
}

function traducir(m = '') {
  if (/Invalid login/i.test(m)) return 'Correo o contraseña incorrectos.';
  if (/Email not confirmed/i.test(m)) return 'Confirma tu correo antes de ingresar.';
  if (/already registered/i.test(m)) return 'Este correo ya tiene cuenta. Inicia sesión.';
  if (/Failed to fetch/i.test(m)) return 'Sin conexión con el servidor.';
  return m;
}
