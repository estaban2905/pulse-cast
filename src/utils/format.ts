export function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const DAYS = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
const MONTHS = [
'ENERO',
'FEBRERO',
'MARZO',
'ABRIL',
'MAYO',
'JUNIO',
'JULIO',
'AGOSTO',
'SEPTIEMBRE',
'OCTUBRE',
'NOVIEMBRE',
'DICIEMBRE'];


export function formatClock(date: Date): {time: string;date: string;} {
  const hh = date.getHours().toString().padStart(2, '0');
  const mm = date.getMinutes().toString().padStart(2, '0');
  return {
    time: `${hh}:${mm}`,
    date: `${DAYS[date.getDay()]} · ${date.getDate()} ${MONTHS[date.getMonth()]}`
  };
}