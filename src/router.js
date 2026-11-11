import { useEffect, useState } from 'react';

const parse = () => {
  const h = window.location.hash.slice(1) || '/';
  const [path, qs] = h.split('?');
  return { path: path || '/', params: Object.fromEntries(new URLSearchParams(qs || '')) };
};

export function useRoute() {
  const [r, setR] = useState(parse);
  useEffect(() => {
    const f = () => { setR(parse()); window.scrollTo({ top: 0 }); };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return r;
}

export const go = (p) => { window.location.hash = p.startsWith('/') ? p : `/${p}`; };
