const crypto = require('crypto');
const fs = require('fs');

function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  // Multiline → single line
  // Return keys directly with original newlines
  const priv = privateKey;
  const pub = publicKey;

  return { priv, pub };
}

const access = generateKeyPair();
const refresh = generateKeyPair();

const envContent = `NODE_ENV=development
PORT=3001

DATABASE_URL=postgres://postgres:postgres@localhost:5432/auth_db

# JWT RS256
JWT_ACCESS_EXPIRES_IN=10m
JWT_REFRESH_EXPIRES_IN=30d

# PEM en una sola linea con \\n escapados
JWT_ACCESS_PRIVATE_KEY="${access.priv}"
JWT_ACCESS_PUBLIC_KEY="${access.pub}"

JWT_REFRESH_PRIVATE_KEY="${refresh.priv}"
JWT_REFRESH_PUBLIC_KEY="${refresh.pub}"

COOKIE_SECURE=false
COOKIE_SAMESITE=lax
COOKIE_DOMAIN=

AZURE_SERVICEBUS_CONNECTION_STRING=
AZURE_SERVICEBUS_TOPIC=spd.events
AZURE_SERVICEBUS_SUBJECT_PREFIX=Auth.
`;

fs.writeFileSync('.env', envContent);
console.log('.env created successfully');