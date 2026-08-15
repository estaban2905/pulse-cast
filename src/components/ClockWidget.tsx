import React, { useEffect, useState } from 'react';
import { usePlayer } from '../contexts/PlayerContext';
import { formatClock } from '../utils/format';

export function ClockWidget() {
  const { settings } = usePlayer();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(id);
  }, []);

  if (!settings.showClock) return null;
  const { time, date } = formatClock(now);

  return (
    <div className="text-right">
      <p className="text-glow font-display text-[clamp(2.5rem,4vw,4.5rem)] font-extrabold leading-none tabular-nums">
        {time}
      </p>
      <p className="mt-2 text-base font-semibold tracking-[0.24em] text-white/50">{date}</p>
    </div>);

}