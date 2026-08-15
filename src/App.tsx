import React from 'react';
import { PlayerProvider } from './contexts/PlayerContext';
import { PlayerStage } from './components/PlayerStage';

export function App() {
  return (
    <PlayerProvider>
      <PlayerStage />
    </PlayerProvider>);

}