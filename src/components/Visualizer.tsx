import React, { useEffect, useRef } from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import { audioSim, BAND_COUNT, WAVE_COUNT } from '../utils/audioSim';
import { rgba } from '../data/themes';
import { VizStyle } from '../types/player';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  c: number;
}

interface Ring {
  r: number;
  a: number;
  c: number;
}

interface VisualizerProps {
  /** Overrides the globally selected visualizer style. */
  style?: VizStyle;
  className?: string;
  /** 0-1 overall presence, used to keep background visualizers discreet. */
  intensity?: number;
}

export function Visualizer({ style, className = '', intensity = 1 }: VisualizerProps) {
  const { vizStyle, theme, settings, partyMode } = usePlayer();
  const active = style ?? vizStyle;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const ringsRef = useRef<Ring[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const colors = theme.colors;
    const glow = settings.glow * (partyMode ? 1.5 : 1);
    let w = 0;
    let h = 0;
    let raf = 0;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, rect.width);
      h = Math.max(1, rect.height);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const drawSpectrum = (bands: Float32Array, bass: number) => {
      const count = Math.max(18, Math.min(BAND_COUNT, Math.floor(w / 22)));
      const gap = Math.max(3, w / count / 5);
      const bw = (w - gap * (count - 1)) / count;
      const grad = ctx.createLinearGradient(0, h, 0, h * 0.1);
      grad.addColorStop(0, rgba(colors[1], 0.95));
      grad.addColorStop(0.55, rgba(colors[0], 0.95));
      grad.addColorStop(1, rgba(colors[2], 0.9));
      ctx.fillStyle = grad;
      ctx.shadowColor = rgba(colors[0], 0.6);
      ctx.shadowBlur = 26 * glow;
      for (let i = 0; i < count; i++) {
        const v = bands[Math.floor(i / count * BAND_COUNT)];
        const bh = Math.max(4, v * h * 0.72);
        const x = i * (bw + gap);
        const r = Math.min(bw / 2, 8);
        ctx.beginPath();
        ctx.moveTo(x, h);
        ctx.lineTo(x, h - bh + r);
        ctx.quadraticCurveTo(x, h - bh, x + r, h - bh);
        ctx.lineTo(x + bw - r, h - bh);
        ctx.quadraticCurveTo(x + bw, h - bh, x + bw, h - bh + r);
        ctx.lineTo(x + bw, h);
        ctx.closePath();
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.18 + bass * 0.15;
      ctx.fillStyle = rgba(colors[1], 0.5);
      ctx.fillRect(0, h - 2, w, 2);
      ctx.globalAlpha = 1;
    };

    const drawWaves = (wave: Float32Array, energy: number) => {
      const mid = h * 0.5;
      for (let layer = 0; layer < 3; layer++) {
        ctx.beginPath();
        const amp = h * (0.16 - layer * 0.04) * (0.6 + energy);
        for (let i = 0; i < WAVE_COUNT; i++) {
          const x = i / (WAVE_COUNT - 1) * w;
          const y = mid + wave[i] * amp * (layer % 2 === 0 ? 1 : -1);
          if (i === 0) ctx.moveTo(x, y);else
          ctx.lineTo(x, y);
        }
        ctx.lineWidth = 3 - layer * 0.7;
        ctx.strokeStyle = rgba(colors[layer % 3], 0.85 - layer * 0.22);
        ctx.shadowColor = rgba(colors[layer % 3], 0.8);
        ctx.shadowBlur = 30 * glow;
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    };

    const drawCircular = (bands: Float32Array, bass: number) => {
      const cx = w / 2;
      const cy = h / 2;
      const base = Math.min(w, h) * 0.24 * (1 + bass * 0.06);
      const count = BAND_COUNT;
      ctx.lineCap = 'round';
      for (let i = 0; i < count; i++) {
        const a = i / count * Math.PI * 2 - Math.PI / 2;
        const v = bands[i];
        const len = base * 0.25 + v * Math.min(w, h) * 0.2;
        const x1 = cx + Math.cos(a) * base;
        const y1 = cy + Math.sin(a) * base;
        const x2 = cx + Math.cos(a) * (base + len);
        const y2 = cy + Math.sin(a) * (base + len);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = Math.max(3, Math.min(w, h) * 0.007);
        ctx.strokeStyle = rgba(colors[i % 3], 0.9);
        ctx.shadowColor = rgba(colors[i % 3], 0.7);
        ctx.shadowBlur = 22 * glow;
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(cx, cy, base * (0.96 + bass * 0.04), 0, Math.PI * 2);
      ctx.strokeStyle = rgba(colors[1], 0.28);
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };

    const drawParticles = (bass: number, energy: number) => {
      const target = Math.floor(60 + settings.particles * 260 * (partyMode ? 1.5 : 1));
      const list = particlesRef.current;
      while (list.length < target) {
        list.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.5,
          vy: -0.2 - Math.random() * 0.7,
          r: 1 + Math.random() * 3.4,
          c: Math.floor(Math.random() * 3)
        });
      }
      if (list.length > target) list.length = target;
      for (const p of list) {
        p.x += p.vx * (1 + energy * 2.2);
        p.y += p.vy * (1 + bass * 3.6);
        if (p.y < -10) {
          p.y = h + 10;
          p.x = Math.random() * w;
        }
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * (1 + bass * 0.7), 0, Math.PI * 2);
        ctx.fillStyle = rgba(colors[p.c], 0.55);
        ctx.shadowColor = rgba(colors[p.c], 0.9);
        ctx.shadowBlur = 16 * glow;
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    };

    const drawNeon = (bands: Float32Array, energy: number) => {
      const horizon = h * 0.72;
      ctx.strokeStyle = rgba(colors[2], 0.22);
      ctx.lineWidth = 1;
      for (let i = 1; i <= 9; i++) {
        const y = horizon + Math.pow(i / 9, 2.2) * (h - horizon);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }
      for (let i = -6; i <= 6; i++) {
        ctx.beginPath();
        ctx.moveTo(w / 2 + i * (w / 26), horizon);
        ctx.lineTo(w / 2 + i * (w / 4.2), h);
        ctx.stroke();
      }
      ctx.beginPath();
      const count = 90;
      for (let i = 0; i < count; i++) {
        const x = i / (count - 1) * w;
        const v = bands[Math.floor(i / count * BAND_COUNT)];
        const y = horizon - v * h * 0.42;
        if (i === 0) ctx.moveTo(x, y);else
        ctx.lineTo(x, y);
      }
      ctx.lineWidth = 4;
      ctx.strokeStyle = rgba(colors[0], 0.95);
      ctx.shadowColor = rgba(colors[0], 1);
      ctx.shadowBlur = 40 * glow;
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = rgba(colors[1], 0.6 + energy * 0.3);
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const drawPulse = (bass: number, beat: number) => {
      const cx = w / 2;
      const cy = h / 2;
      const rings = ringsRef.current;
      if (beat > 0.6 && (rings.length === 0 || rings[rings.length - 1].r > 40)) {
        rings.push({ r: 10, a: 0.85, c: rings.length % 3 });
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i];
        ring.r += 5 + bass * 8;
        ring.a -= 0.008;
        if (ring.a <= 0) {
          rings.splice(i, 1);
          continue;
        }
        ctx.beginPath();
        ctx.arc(cx, cy, ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = rgba(colors[ring.c], ring.a);
        ctx.lineWidth = 2 + bass * 4;
        ctx.shadowColor = rgba(colors[ring.c], ring.a);
        ctx.shadowBlur = 30 * glow;
        ctx.stroke();
      }
      const core = Math.min(w, h) * (0.08 + bass * 0.05);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, core * 3);
      g.addColorStop(0, rgba(colors[0], 0.55));
      g.addColorStop(1, rgba(colors[0], 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, core * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    };

    const loop = (now: number) => {
      const sim = audioSim.read(now);
      ctx.clearRect(0, 0, w, h);
      ctx.globalAlpha = intensity;
      ctx.globalCompositeOperation = 'lighter';
      switch (active) {
        case 'waves':
          drawWaves(sim.wave, sim.energy);
          break;
        case 'circular':
          drawCircular(sim.bands, sim.bass);
          break;
        case 'particles':
          drawParticles(sim.bass, sim.energy);
          break;
        case 'neon':
          drawNeon(sim.bands, sim.energy);
          break;
        case 'pulse':
          drawPulse(sim.bass, sim.beat);
          break;
        default:
          drawSpectrum(sim.bands, sim.bass);
      }
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [active, theme, settings.glow, settings.particles, partyMode, intensity]);

  return <canvas ref={canvasRef} aria-hidden="true" className={`block h-full w-full ${className}`} />;
}