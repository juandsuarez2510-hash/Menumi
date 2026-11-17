require('dotenv').config();

const path = require('node:path');
const express = require('express');
const session = require('express-session');
const { MongoClient } = require('mongodb');
const { MongoStore } = require('connect-mongo');
const bcrypt = require('bcryptjs');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

const PORT = Number(process.env.PORT || 3000);
const DB_NAME = process.env.MONGODB_DB || 'menumi';
const SESSION_SECRET = process.env.SESSION_SECRET;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI || !SESSION_SECRET) {
  throw new Error('Configura MONGODB_URI y SESSION_SECRET en el entorno del servidor.');
}

const app = express();
const client = new MongoClient(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(express.json({ limit: '12kb' }));

const requireSameOrigin = (req, res, next) => {
  const origin = req.get('origin');
  if (origin && origin !== `${req.protocol}://${req.get('host')}`) {
    return res.status(403).json({ error: 'Origen no permitido.' });
  }
  next();
};

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera unos minutos y vuelve a intentar.' },
});

const normalizeUsername = (value) => String(value || '').trim().toLocaleLowerCase('es-CO');
const publicUser = (user) => ({ id: user._id.toString(), username: user.username, role: user.role, active: user.isActive !== false });

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => error ? reject(error) : resolve());
  });
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((error) => error ? reject(error) : resolve());
  });
}

function destroySession(req) {
  return new Promise((resolve) => {
    if (!req.session) return resolve();
    req.session.destroy(() => resolve());
  });
}

function requireAdmin(req, res, next) {
  if (!req.session?.admin) return res.status(401).json({ error: 'Inicia sesión para continuar.' });
  next();
}

async function start() {
  await client.connect();
  const db = client.db(DB_NAME);
  const admins = db.collection('admins');
  await admins.createIndex({ usernameNormalized: 1 }, { unique: true });

  app.use(session({
    name: 'menumi.sid',
    secret: SESSION_SECRET,
    store: MongoStore.create({ client, dbName: DB_NAME, collectionName: 'admin_sessions', ttl: 8 * 60 * 60 }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 * 1000,
    },
  }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok', database: DB_NAME }));

  app.post('/api/auth/login', requireSameOrigin, loginLimiter, async (req, res, next) => {
    try {
      const usernameNormalized = normalizeUsername(req.body?.username);
      const password = typeof req.body?.password === 'string' ? req.body.password : '';
      if (!usernameNormalized || !password || password.length > 256) {
        return res.status(400).json({ error: 'Escribe tu usuario y contraseña.' });
      }

      const account = await admins.findOne({ usernameNormalized, isActive: { $ne: false } });
      const passwordMatches = account && await bcrypt.compare(password, account.passwordHash);
      if (!passwordMatches) return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });

      await regenerateSession(req);
      req.session.admin = { id: account._id.toString(), username: account.username, role: account.role };
      await saveSession(req);
      await admins.updateOne({ _id: account._id }, { $set: { lastLoginAt: new Date() } });
      return res.json({ user: req.session.admin });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/auth/me', (req, res) => {
    if (!req.session?.admin) return res.status(401).json({ error: 'Sesión no iniciada.' });
    res.json({ user: req.session.admin });
  });

  app.post('/api/auth/logout', requireSameOrigin, async (req, res, next) => {
    try {
      await destroySession(req);
      res.clearCookie('menumi.sid', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
      res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/admin/users', requireAdmin, async (_req, res, next) => {
    try {
      const accounts = await admins.find({}, { projection: { username: 1, role: 1, isActive: 1, createdAt: 1, lastLoginAt: 1 } }).sort({ createdAt: 1 }).toArray();
      res.json({ users: accounts.map(publicUser) });
    } catch (error) {
      next(error);
    }
  });

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));

  app.use((req, res, next) => {
    const requested = path.normalize(decodeURIComponent(req.path)).replace(/^([/\\])+/, '');
    const blocked = /(^|[/\\])(?:\.git|node_modules|work)(?:[/\\]|$)/i.test(requested)
      || /^(?:\.env(?:\..*)?|server\.js|seed-admins\.js|package(?:-lock)?\.json)$/i.test(requested);
    if (blocked) return res.sendStatus(404);
    next();
  });
  app.use(express.static(path.resolve(__dirname), { dotfiles: 'deny', extensions: ['html'] }));

  app.use((error, _req, res, _next) => {
    console.error('Menumi request failed:', error.message);
    res.status(500).json({ error: 'Ocurrió un error. Intenta de nuevo.' });
  });

  app.listen(PORT, () => console.log(`Menumi escuchando en el puerto ${PORT}`));
}

start().catch((error) => {
  console.error('No fue posible iniciar Menumi:', error.message);
  process.exit(1);
});
