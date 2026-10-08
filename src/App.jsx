import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LangProvider } from './context/LangContext';
import { GameProvider } from './context/GameContext';
import RoomBoundary from './components/RoomBoundary';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import MinigamePlaceholder from './pages/MinigamePlaceholder';

export default function App() {
  return (
    <LangProvider>
      <GameProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/lobby/:gameId" element={<RoomBoundary><Lobby /></RoomBoundary>} />
            <Route path="/game/:gameId" element={<RoomBoundary><Game /></RoomBoundary>} />
            <Route path="/game/:gameId/minigame" element={<RoomBoundary><MinigamePlaceholder /></RoomBoundary>} />
          </Routes>
        </BrowserRouter>
      </GameProvider>
    </LangProvider>
  );
}
