require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { OpenGameClient } = require('@playdotfun/server-sdk');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Play.fun Server SDK client
const client = new OpenGameClient({
  apiKey: process.env.PDF_API_KEY,
  secretKey: process.env.PDF_API_SECRET_KEY,
});

// Auto-discover games from public directory
const publicDir = path.join(__dirname, 'public');
const games = fs.readdirSync(publicDir).filter(dir => {
  if (dir === 'shared') return false;
  const gamePath = path.join(publicDir, dir, 'index.html');
  return fs.existsSync(gamePath);
});

// Build GAME_IDS from environment variables
const GAME_IDS = {};
games.forEach(game => {
  const envKey = 'GAME_ID_' + game.toUpperCase().replace(/-/g, '_');
  GAME_IDS[game] = process.env[envKey];
});

// Default max score for all games
const DEFAULT_MAX_SCORE = 100000;

// Submit score endpoint — all games use this
app.post('/api/submit-score', async (req, res) => {
  try {
    const { game, playerId, score } = req.body;

    if (!game || !playerId || score === undefined) {
      return res.status(400).json({ error: 'Missing game, playerId, or score' });
    }

    const gameId = GAME_IDS[game];
    if (!gameId) {
      return res.status(400).json({ error: `Unknown game: ${game}` });
    }

    // Server-side validation
    if (score < 0 || score > DEFAULT_MAX_SCORE) {
      return res.status(400).json({ error: 'Score out of valid range' });
    }

    const validatedScore = Math.floor(Math.abs(score));

    await client.play.savePoints({
      gameId,
      playerId,
      points: validatedScore,
    });

    res.json({ success: true, points: validatedScore });
  } catch (err) {
    console.error('Score submit error:', err.message);
    res.status(500).json({ error: 'Failed to save score' });
  }
});

// Leaderboard endpoint
app.get('/api/leaderboard/:game', async (req, res) => {
  try {
    const gameId = GAME_IDS[req.params.game];
    if (!gameId) {
      return res.status(400).json({ error: 'Unknown game' });
    }
    const leaderboard = await client.play.getLeaderboard({ gameId });
    res.json(leaderboard);
  } catch (err) {
    console.error('Leaderboard error:', err.message);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// Serve each game
games.forEach(game => {
  app.get(`/${game}`, (req, res) => {
    res.sendFile(path.join(publicDir, game, 'index.html'));
  });
});

// Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Game server running on http://localhost:${PORT}`);
  console.log(`${games.length} games available:`);
  games.forEach(g => console.log(`  http://localhost:${PORT}/${g}`));
});
