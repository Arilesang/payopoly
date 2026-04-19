import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LangProvider } from './context/LangContext';
import { GameProvider } from './context/GameContext';
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
            <Route path="/lobby/:gameId" element={<Lobby />} />
            <Route path="/game/:gameId" element={<Game />} />
            <Route path="/game/:gameId/minigame" element={<MinigamePlaceholder />} />
          </Routes>
        </BrowserRouter>
      </GameProvider>
    </LangProvider>
  );
}
