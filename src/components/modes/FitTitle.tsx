import React, { useEffect, useRef, useState } from 'react';

/**
 * Titulo que se adapta a su longitud.
 *
 * El diseno asume titulos cortos de demo. Con el catalogo real entran titulos
 * de 40-50 caracteres que revientan la composicion. Aqui se mide el texto y se
 * reduce hasta que cabe en el ancho disponible, con suelo minimo legible.
 */
export function FitTitle({ texto, maxVw }: { texto: string; maxVw: number }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const probeRef = useRef<HTMLSpanElement>(null);
  const [vw, setVw] = useState(maxVw);

  useEffect(() => {
    const root = ref.current;
    const probe = probeRef.current;
    if (!root || !probe) return;

    const calcular = () => {
      const max = root.clientWidth;
      probe.style.fontSize = maxVw + 'vw';
      probe.textContent = texto;
      const natural = probe.scrollWidth;
      if (natural <= max || natural === 0) {
        setVw(maxVw);
        return;
      }
      let s = maxVw;
      probe.style.fontSize = s + 'vw';
      while (probe.scrollWidth > max && s > 1.6) {
        s -= 0.1;
        probe.style.fontSize = s + 'vw';
      }
      setVw(Number(s.toFixed(2)));
    };

    calcular();
    const obs = new ResizeObserver(calcular);
    obs.observe(root);
    return () => obs.disconnect();
  }, [texto, maxVw]);

  return (
    <h1
      ref={ref}
      className="text-glow mt-3 block font-display font-extrabold leading-[0.94] tracking-tight"
      style={{ fontSize: vw + 'vw', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
      title={texto}>
      <span
        ref={probeRef}
        aria-hidden
        style={{
          position: 'absolute',
          visibility: 'hidden',
          whiteSpace: 'nowrap',
          fontFamily: 'inherit',
          fontWeight: 'inherit'
        }}>
        {texto}
      </span>
      {texto}
    </h1>
  );
}