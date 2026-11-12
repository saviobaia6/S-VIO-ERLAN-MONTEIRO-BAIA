import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  const DB_DIR = path.join(__dirname, 'data_storage');
  const DB_FILE = path.join(DB_DIR, 'challenge_database.json');

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  // GET /api/deposits - Retrieve stored challenge items
  app.get('/api/deposits', (_req, res) => {
    try {
      if (fs.existsSync(DB_FILE)) {
        const content = fs.readFileSync(DB_FILE, 'utf-8');
        const data = JSON.parse(content);
        return res.json(data);
      }
      return res.json({ items: null, lastUpdated: null });
    } catch (e) {
      console.error('Error reading database file:', e);
      return res.status(500).json({ error: 'Failed to read database' });
    }
  });

  // POST /api/deposits - Save challenge items to persistent storage
  app.post('/api/deposits', (req, res) => {
    try {
      const { items, lastUpdated } = req.body;
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Invalid items array' });
      }

      const payload = {
        items,
        lastUpdated: lastUpdated || new Date().toISOString(),
        totalDeposits: items.length,
        savedDepositsCount: items.filter((i: any) => i.status === 'Concluído').length,
      };

      fs.writeFileSync(DB_FILE, JSON.stringify(payload, null, 2), 'utf-8');
      return res.json({
        success: true,
        savedAt: payload.lastUpdated,
        count: items.length,
      });
    } catch (e) {
      console.error('Error writing to database file:', e);
      return res.status(500).json({ error: 'Failed to save database' });
    }
  });

  // Mount Vite middleware in development
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`> Server running persistently at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
