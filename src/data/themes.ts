import { VisualTheme } from '../types/player';

export const themes: VisualTheme[] = [
{ id: 'neon', name: 'Neon', colors: ['#ff2e98', '#38e3ff', '#966cff'], bg: '#05060c' },
{ id: 'cyberpunk', name: 'Cyberpunk', colors: ['#f9f002', '#00e5ff', '#ff2b6d'], bg: '#07060f' },
{ id: 'aurora', name: 'Aurora', colors: ['#2bf5b0', '#5ad2ff', '#a97bff'], bg: '#030a0c' },
{ id: 'sunset', name: 'Sunset', colors: ['#ff7a45', '#ff2e63', '#ffd166'], bg: '#0d0507' },
{ id: 'electric', name: 'Electric', colors: ['#4d6bff', '#00f0ff', '#c8ff2e'], bg: '#04060f' },
{ id: 'purple', name: 'Purple Night', colors: ['#a855f7', '#7a5cff', '#ff8ae0'], bg: '#08061a' },
{ id: 'minimal', name: 'Minimal', colors: ['#f4f4f5', '#b6b8c4', '#8f93a6'], bg: '#0a0a0c' },
{ id: 'party', name: 'Party', colors: ['#ff1f6b', '#ffd400', '#12f7d6'], bg: '#0a0410' }];


export function hexToRgbTriplet(hex: string): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

export function rgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}