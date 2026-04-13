function base64UrlToBytes(base64Url) {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function importarLlaveAes(claveAesB64) {
  const keyBytes = base64UrlToBytes(claveAesB64);
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

async function importarLlaveHmac(claveHmacB64) {
  const keyBytes = base64UrlToBytes(claveHmacB64);
  return crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function concatUint8Arrays(arrays) {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const merged = new Uint8Array(totalLength);
  let offset = 0;
  arrays.forEach((arr) => {
    merged.set(arr, offset);
    offset += arr.length;
  });
  return merged;
}

export async function cifrarPayload(datos, claveAesB64, claveHmacB64) {
  const plaintext = new TextEncoder().encode(JSON.stringify(datos));
  const nonce = crypto.getRandomValues(new Uint8Array(16));

  const aesKey = await importarLlaveAes(claveAesB64);
  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, aesKey, plaintext)
  );

  const gcmTag = encrypted.slice(encrypted.length - 16);
  const ciphertext = encrypted.slice(0, encrypted.length - 16);

  const hmacKey = await importarLlaveHmac(claveHmacB64);
  const signedData = concatUint8Arrays([nonce, ciphertext, gcmTag]);
  const hmac = new Uint8Array(await crypto.subtle.sign('HMAC', hmacKey, signedData));

  const finalPayload = concatUint8Arrays([nonce, ciphertext, gcmTag, hmac]);
  return bytesToBase64Url(finalPayload);
}

export async function descifrarPayload(cifradoB64, claveAesB64, claveHmacB64) {
  const payload = base64UrlToBytes(cifradoB64);

  if (payload.length < 64) {
    throw new Error('Payload cifrado incompleto.');
  }

  const nonce = payload.slice(0, 16);
  const hmac = payload.slice(payload.length - 32);
  const gcmTag = payload.slice(payload.length - 48, payload.length - 32);
  const ciphertext = payload.slice(16, payload.length - 48);

  const hmacKey = await importarLlaveHmac(claveHmacB64);
  const signedData = concatUint8Arrays([nonce, ciphertext, gcmTag]);
  const isValid = await crypto.subtle.verify('HMAC', hmacKey, hmac, signedData);

  if (!isValid) {
    throw new Error('HMAC invalido. El payload pudo ser alterado.');
  }

  const aesKey = await importarLlaveAes(claveAesB64);
  const encrypted = concatUint8Arrays([ciphertext, gcmTag]);
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: nonce, tagLength: 128 },
    aesKey,
    encrypted
  );

  return JSON.parse(new TextDecoder().decode(decrypted));
}

export function validarLlavesCripto(claveAesB64, claveHmacB64) {
  const errores = [];

  if (!claveAesB64) {
    errores.push('Falta VITE_AES_SECRET_KEY');
  }
  if (!claveHmacB64) {
    errores.push('Falta VITE_HMAC_SECRET_KEY');
  }

  try {
    if (claveAesB64) {
      base64UrlToBytes(claveAesB64);
    }
    if (claveHmacB64) {
      base64UrlToBytes(claveHmacB64);
    }
  } catch (_error) {
    errores.push('Las llaves no estan en Base64 URL-safe valido.');
  }

  if (errores.length > 0) {
    throw new Error(errores.join(' | '));
  }
}
