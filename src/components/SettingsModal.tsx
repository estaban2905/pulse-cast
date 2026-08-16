import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MaximizeIcon, XIcon } from 'lucide-react';
import { usePlayer } from '../contexts/PlayerContext';
import { themes } from '../data/themes';
import { Settings, VizStyle } from '../types/player';

type Tab = 'appearance' | 'visualizer' | 'lyrics' | 'screen';

const TABS: {id: Tab;label: string;}[] = [
{ id: 'appearance', label: 'Apariencia' },
{ id: 'visualizer', label: 'Visualizador' },
{ id: 'lyrics', label: 'Letras' },
{ id: 'screen', label: 'Pantalla' }];


function Row({ label, children }: {label: string;children: React.ReactNode;}) {
  return (
    <div className="flex items-center justify-between gap-8 border-b border-white/[0.07] py-5">
      <span className="text-lg font-semibold text-white/85">{label}</span>
      <div className="flex shrink-0 items-center gap-4">{children}</div>
    </div>);

}

function Slider({
  value,
  min,
  max,
  step = 0.05,
  onChange,
  label







}: {value: number;min: number;max: number;step?: number;onChange: (v: number) => void;label: string;}) {
  return (
    <>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-56 cursor-pointer appearance-none rounded-full bg-white/15 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-c1" />
      
      <span className="w-14 text-right font-sans text-base tabular-nums text-white/50">
        {Math.round(value / max * 100)}%
      </span>
    </>);

}

function Toggle({
  on,
  onChange,
  label,
  disabled = false





}: {on: boolean;onChange: (v: boolean) => void;label: string;disabled?: boolean;}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-9 w-16 rounded-full transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-c2 ${
      on ? 'bg-c1' : 'bg-white/15'} ${
      disabled ? 'opacity-50' : ''}`}>
      
      <span
        className="absolute top-1 h-7 w-7 rounded-full bg-white transition-transform duration-150 ease-out"
        style={{ transform: on ? 'translateX(32px)' : 'translateX(4px)' }} />
      
    </button>);

}

function Segment<T extends string>({
  value,
  options,
  onChange,
  label





}: {value: T;options: {id: T;label: string;}[];onChange: (v: T) => void;label: string;}) {
  return (
    <div className="flex gap-1 rounded-2xl bg-white/[0.07] p-1" role="radiogroup" aria-label={label}>
      {options.map((o) =>
      <button
        key={o.id}
        type="button"
        role="radio"
        aria-checked={value === o.id}
        onClick={() => onChange(o.id)}
        className={`rounded-xl px-4 py-2.5 text-base font-semibold transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-c2 ${
        value === o.id ? 'bg-white text-black' : 'text-white/60 hover:text-white'}`
        }>
        
          {o.label}
        </button>
      )}
    </div>);

}

export function SettingsModal() {
  const {
    settingsOpen,
    setSettingsOpen,
    settings,
    updateSetting,
    theme,
    setThemeId,
    vizStyle,
    setVizStyle,
    toggleFullscreen,
    playlistOpen,
    setPlaylistOpen
  } = usePlayer();
  const [tab, setTab] = useState<Tab>('appearance');

  const set = <K extends keyof Settings,>(key: K) => (v: Settings[K]) => updateSetting(key, v);

  return (
    <AnimatePresence>
      {settingsOpen &&
      <motion.div
        key="settings"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-xl"
        onClick={() => setSettingsOpen(false)}
        role="dialog"
        aria-modal="true"
        aria-label="Configuración">
        
          <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 12 }}
          transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          onClick={(e) => e.stopPropagation()}
          className="glass flex h-[76vh] w-[68vw] min-w-[900px] overflow-hidden rounded-[32px]">
          
            {/* Tabs */}
            <nav className="flex w-[22%] flex-col gap-2 border-r border-white/10 p-6">
              <h2 className="mb-4 px-3 font-display text-2xl font-extrabold">Ajustes</h2>
              {TABS.map((t) =>
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id}
              className={`rounded-2xl px-5 py-4 text-left text-lg font-semibold transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-c2 ${
              tab === t.id ? 'bg-c1/20 text-white ring-1 ring-c1/50' : 'text-white/55 hover:bg-white/10'}`
              }>
              
                  {t.label}
                </button>
            )}
            </nav>

            <div className="no-scrollbar flex-1 overflow-y-auto p-9">
              <div className="mb-6 flex items-start justify-between">
                <h3 className="font-display text-3xl font-extrabold tracking-tight">
                  {TABS.find((t) => t.id === tab)?.label}
                </h3>
                <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                aria-label="Cerrar configuración"
                className="rounded-full p-3 text-white/60 transition-colors duration-150 ease-out hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-c2">
                
                  <XIcon className="h-7 w-7" />
                </button>
              </div>

              {tab === 'appearance' &&
            <div>
                  <Row label="Intensidad de luces">
                    <Slider label="Intensidad de luces" value={settings.lightIntensity} min={0.2} max={2} onChange={set('lightIntensity')} />
                  </Row>
                  <Row label="Brillo">
                    <Slider label="Brillo" value={settings.brightness} min={0.6} max={1.4} onChange={set('brightness')} />
                  </Row>
                  <Row label="Opacidad de paneles">
                    <Slider label="Opacidad de paneles" value={settings.panelOpacity} min={0.15} max={0.9} onChange={set('panelOpacity')} />
                  </Row>
                  <Row label="Animaciones">
                    <Toggle label="Animaciones" on={settings.animations} onChange={set('animations')} />
                  </Row>
                  <Row label="Modo oscuro">
                    <span className="text-base text-white/40">Siempre activo en TV</span>
                    <Toggle label="Modo oscuro" on onChange={() => undefined} disabled />
                  </Row>

                  <p className="mt-8 text-lg font-semibold text-white/85">Tema visual</p>
                  <div className="mt-4 grid grid-cols-4 gap-4">
                    {themes.map((t) =>
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setThemeId(t.id)}
                  aria-pressed={theme.id === t.id}
                  className={`overflow-hidden rounded-2xl p-4 text-left transition-colors duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-c2 ${
                  theme.id === t.id ? 'bg-white/12 ring-2 ring-c1' : 'bg-white/[0.05] hover:bg-white/10'}`
                  }>
                  
                        <span className="flex gap-1.5">
                          {t.colors.map((c) =>
                    <span key={c} className="h-8 flex-1 rounded-md" style={{ background: c }} />
                    )}
                        </span>
                        <span className="mt-3 block font-display text-base font-bold">{t.name}</span>
                      </button>
                )}
                  </div>
                </div>
            }

              {tab === 'visualizer' &&
            <div>
                  <Row label="Tipo">
                    <Segment<VizStyle>
                  label="Tipo de visualizador"
                  value={vizStyle}
                  onChange={setVizStyle}
                  options={[
                  { id: 'spectrum', label: 'Spectrum' },
                  { id: 'waves', label: 'Waves' },
                  { id: 'circular', label: 'Circular' }]
                  } />
                
                  </Row>
                  <Row label="Más estilos">
                    <Segment<VizStyle>
                  label="Más tipos de visualizador"
                  value={vizStyle}
                  onChange={setVizStyle}
                  options={[
                  { id: 'particles', label: 'Particles' },
                  { id: 'neon', label: 'Neon' },
                  { id: 'pulse', label: 'Pulse' }]
                  } />
                
                  </Row>
                  <Row label="Sensibilidad">
                    <Slider label="Sensibilidad" value={settings.sensitivity} min={0.4} max={1.8} onChange={set('sensitivity')} />
                  </Row>
                  <Row label="Velocidad">
                    <Slider label="Velocidad" value={settings.vizSpeed} min={0.4} max={2} onChange={set('vizSpeed')} />
                  </Row>
                  <Row label="Cantidad de partículas">
                    <Slider label="Cantidad de partículas" value={settings.particles} min={0.1} max={1} onChange={set('particles')} />
                  </Row>
                  <Row label="Intensidad del glow">
                    <Slider label="Intensidad del glow" value={settings.glow} min={0.2} max={2} onChange={set('glow')} />
                  </Row>
                </div>
            }

              {tab === 'lyrics' &&
            <div>
                  <Row label="Tamaño">
                    <Slider label="Tamaño de letras" value={settings.lyricsSize} min={0.7} max={1.5} onChange={set('lyricsSize')} />
                  </Row>
                  <Row label="Fuente">
                    <Segment
                  label="Fuente de letras"
                  value={settings.lyricsFont}
                  onChange={set('lyricsFont')}
                  options={[
                  { id: 'display' as const, label: 'Display' },
                  { id: 'sans' as const, label: 'Neutra' }]
                  } />
                
                  </Row>
                  <Row label="Color">
                    <Segment
                  label="Color de letras"
                  value={settings.lyricsColor}
                  onChange={set('lyricsColor')}
                  options={[
                  { id: 'theme' as const, label: 'Tema' },
                  { id: 'white' as const, label: 'Blanco' },
                  { id: 'accent' as const, label: 'Acento' }]
                  } />
                
                  </Row>
                  <Row label="Posición">
                    <Segment
                  label="Posición de letras"
                  value={settings.lyricsPosition}
                  onChange={set('lyricsPosition')}
                  options={[
                  { id: 'center' as const, label: 'Centro' },
                  { id: 'bottom' as const, label: 'Inferior' }]
                  } />
                
                  </Row>
                  <Row label="Velocidad de resaltado">
                    <Slider label="Velocidad de resaltado" value={settings.lyricsSpeed} min={0.5} max={1.8} onChange={set('lyricsSpeed')} />
                  </Row>
                </div>
            }

              {tab === 'screen' &&
            <div>
                  <Row label="Pantalla completa">
                    <button
                  type="button"
                  onClick={toggleFullscreen}
                  className="flex items-center gap-3 rounded-2xl bg-white/10 px-5 py-3 text-base font-semibold transition-colors duration-150 ease-out hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-c2">
                  
                      <MaximizeIcon className="h-5 w-5" />
                      Activar / salir
                    </button>
                  </Row>
                  <Row label="Mostrar reloj">
                    <Toggle label="Mostrar reloj" on={settings.showClock} onChange={set('showClock')} />
                  </Row>
                  <Row label="Mostrar información de canción">
                    <Toggle label="Mostrar información de canción" on={settings.showSongInfo} onChange={set('showSongInfo')} />
                  </Row>
                  <Row label="Mostrar playlist">
                    <Toggle label="Mostrar playlist" on={playlistOpen} onChange={setPlaylistOpen} />
                  </Row>
                </div>
            }
            </div>
          </motion.div>
        </motion.div>
      }
    </AnimatePresence>);

}