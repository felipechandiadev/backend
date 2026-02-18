import * as crypto from 'crypto';

// Asegura que globalThis.crypto sea compatible con la Web Crypto API
if (typeof globalThis.crypto === 'undefined') {
  (globalThis as any).crypto = crypto.webcrypto;
}

// Añade randomUUID si no está disponible en la implementación actual
if (typeof (globalThis.crypto as any).randomUUID !== 'function') {
  (globalThis.crypto as any).randomUUID = () => crypto.randomUUID();
}
