require('dotenv').config();

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const accounts = [
  { username: 'Juan suarez', passwordEnv: 'ADMIN_JUAN_SUAREZ_PASSWORD' },
  { username: 'Juan puentes', passwordEnv: 'ADMIN_JUAN_PUENTES_PASSWORD' },
];
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'menumi';

if (!uri) throw new Error('Configura MONGODB_URI antes de crear las cuentas.');
for (const account of accounts) {
  if (!process.env[account.passwordEnv]) {
    throw new Error(`Falta el secreto de entorno ${account.passwordEnv}.`);
  }
}

const normalizeUsername = (value) => value.trim().toLocaleLowerCase('es-CO');

async function seed() {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10000 });
  try {
    await client.connect();
    const admins = client.db(dbName).collection('admins');
    await admins.createIndex({ usernameNormalized: 1 }, { unique: true });

    for (const account of accounts) {
      const usernameNormalized = normalizeUsername(account.username);
      const existing = await admins.findOne({ usernameNormalized }, { projection: { _id: 1 } });
      if (existing) {
        console.log(`Cuenta existente; se conserva sin cambios: ${account.username}`);
        continue;
      }

      const passwordHash = await bcrypt.hash(process.env[account.passwordEnv], 12);
      await admins.insertOne({
        username: account.username,
        usernameNormalized,
        passwordHash,
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
        lastLoginAt: null,
      });
      console.log(`Cuenta de administración creada: ${account.username}`);
    }
  } finally {
    await client.close();
  }
}

seed().catch((error) => {
  console.error('No fue posible crear las cuentas de administración:', error.message);
  process.exit(1);
});
