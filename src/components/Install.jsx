import { useState } from 'react';
import { Download, Share, PlusSquare, MoreVertical, MonitorDown, ExternalLink, Copy, Check } from 'lucide-react';
import { useInstall, platform } from '../pwa';
import { Sheet, useToast } from './ui';

/** Botón "Instalar app": instala directo si el navegador lo permite; si no, muestra los pasos. */
export function InstallButton({ variant = 'pill', label = 'Instalar app' }) {
  const inst = useInstall();
  const toast = useToast();
  const [help, setHelp] = useState(false);
  if (inst.installed) return null;

  const onClick = async () => {
    // Se revisa en el momento del toque (el aviso del navegador puede llegar o gastarse en cualquier momento)
    if (window.__bip) {
      try {
        const ok = await inst.install();
        if (ok) toast('¡App instalada!');
        return;
      } catch { /* el aviso ya se usó: mostrar pasos */ }
    }
    setHelp(true);
  };

  return (
    <>
      {variant === 'pill' && (
        <button className="install-pill" onClick={onClick}><Download size={16} />{label}</button>
      )}
      {variant === 'banner' && (
        <div className="install-banner">
          <img src={`${import.meta.env.BASE_URL}pwa-192.png`} alt="" />
          <div className="grow">
            <b>Instala Mi Vehículo</b>
            <small>Ábrela desde tu pantalla de inicio, a pantalla completa y sin conexión.</small>
          </div>
          <button className="btn btn-primary btn-sm" onClick={onClick}><Download size={16} />Instalar</button>
        </div>
      )}
      {variant === 'icon' && (
        <button className="icon-btn install-icon" onClick={onClick} aria-label="Instalar app" title="Instalar app"><Download size={20} /></button>
      )}
      {variant === 'block' && (
        <button className="btn btn-primary block" onClick={onClick}><Download size={16} />{label}</button>
      )}
      {help && <InstallHelp onClose={() => setHelp(false)} />}
    </>
  );
}

function InstallHelp({ onClose }) {
  const p = platform();
  const [copied, setCopied] = useState(false);
  const url = window.location.href.split('#')[0];
  const copy = async () => { try { await navigator.clipboard.writeText(url); setCopied(true); } catch { /* sin permiso */ } };

  let title, steps;
  if (p.inApp) {
    title = 'Abre el enlace en tu navegador';
    steps = [
      [ExternalLink, 'Estás dentro de WhatsApp, Instagram u otra app, y desde ahí no se puede instalar.'],
      [MoreVertical, `Toca el menú (⋮ o ···) y elige "Abrir en ${p.ios ? 'Safari' : 'Chrome'}", o copia el enlace y pégalo en el navegador.`],
      [Download, 'Allí vuelve a tocar "Instalar app".']
    ];
  } else if (p.ios && p.iosNotSafari) {
    title = 'En iPhone usa Safari';
    steps = [
      [ExternalLink, 'Copia el enlace y ábrelo en Safari.'],
      [Share, 'Toca el botón Compartir (el cuadro con la flecha hacia arriba).'],
      [PlusSquare, 'Elige "Agregar a pantalla de inicio" y luego "Agregar".']
    ];
  } else if (p.ios) {
    title = 'Instalar en iPhone / iPad';
    steps = [
      [Share, 'Toca el botón Compartir (el cuadro con la flecha hacia arriba), abajo o arriba en Safari.'],
      [PlusSquare, 'Desliza y elige "Agregar a pantalla de inicio".'],
      [Check, 'Toca "Agregar". El ícono de Mi Vehículo aparecerá en tu inicio.']
    ];
  } else if (p.android) {
    title = 'Instalar en Android';
    steps = [
      [MoreVertical, `Toca el menú ⋮ de ${p.samsung ? 'Samsung Internet (☰)' : 'Chrome'}, arriba a la derecha.`],
      [Download, 'Elige "Instalar app" o "Agregar a pantalla de inicio".'],
      [Check, 'Confirma con "Instalar". Si no aparece la opción, recarga la página y espera unos segundos.']
    ];
  } else {
    title = 'Instalar en el computador';
    steps = [
      [MonitorDown, 'En Chrome o Edge, toca el ícono de instalar (un monitor con una flecha) al lado derecho de la barra de direcciones.'],
      [MoreVertical, 'O abre el menú ⋮ → "Transmitir, guardar y compartir" → "Instalar página como app".'],
      [Check, p.firefox ? 'Firefox no instala apps web: usa Chrome o Edge.' : 'Confirma con "Instalar".']
    ];
  }

  return (
    <Sheet title={title} onClose={onClose} icon={Download} color="#6366f1">
      <ol className="install-steps">
        {steps.map(([Icon, text], i) => (
          <li key={i} style={{ '--d': `${i * 80}ms` }}>
            <span className="step-n">{i + 1}</span>
            <span className="grow">{text}</span>
            <Icon size={20} className="muted" />
          </li>
        ))}
      </ol>
      {(p.inApp || p.iosNotSafari) && (
        <button className="btn btn-soft block mt" onClick={copy}>{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Enlace copiado' : 'Copiar enlace'}</button>
      )}
    </Sheet>
  );
}
