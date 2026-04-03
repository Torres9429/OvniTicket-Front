/**
 * 🔐 Utilidades de Cifrado con Web Crypto API
 * 
 * AES-256-CBC con HMAC-SHA256 (compatible con backend Django)
 * 
 * Uso:
 * const encrypted = await encryptPayload({user: 'john', role: 'admin'});
 * const decrypted = await decryptPayload(encrypted);
 */

/**
 * Convierte string Base64 a ArrayBuffer
 */
function base64ToArrayBuffer(base64) {
  // Convertir de URL-safe a estándar
  base64 = base64.replace(/-/g, '+').replace(/_/g, '/');

  // Agregar padding si falta
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }

  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes.buffer;
}


/**
 * Convierte ArrayBuffer a string Base64
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Carga la clave AES desde Base64 (compatible con Django)
 */
async function importAESKey(keyB64) {
  const keyBytes = base64ToArrayBuffer(keyB64);
  return await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-CBC', length: 256 },
    false, // no exportable
    ['encrypt', 'decrypt']
  );
}

/**
 * Carga la clave HMAC desde Base64
 */
async function importHMACKey(keyB64) {
  const keyBytes = base64ToArrayBuffer(keyB64);
  return await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * CIFRA un objeto con AES-256-CBC + HMAC
 * 
 * Retorna: base64(iv + ciphertext + hmac)
 * 
 * @param {object} data - Objeto a cifrar
 * @param {string} aesKeyB64 - Clave AES en Base64 (desde .env)
 * @param {string} hmacKeyB64 - Clave HMAC en Base64 (desde .env)
 * @returns {Promise<string>} - Ciphertext en Base64
 */
export async function encryptPayload(data, aesKeyB64, hmacKeyB64) {
  try {
    // 1. Serializar objeto a JSON
    const plaintext = JSON.stringify(data);
    const plaintextBytes = new TextEncoder().encode(plaintext);

    // 2. Generar IV aleatorio (16 bytes)
    const iv = crypto.getRandomValues(new Uint8Array(16));

    // 3. Cifrar con AES-256-CBC
    const aesKey = await importAESKey(aesKeyB64);
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-CBC', iv },
      aesKey,
      plaintextBytes
    );
    const ciphertextBytes = new Uint8Array(ciphertext);

    // 4. Calcular HMAC sobre (iv + ciphertext)
    const hmacKey = await importHMACKey(hmacKeyB64);
    const dataToSign = new Uint8Array(iv.length + ciphertextBytes.length);
    dataToSign.set(iv, 0);
    dataToSign.set(ciphertextBytes, iv.length);

    const hmac = await crypto.subtle.sign('HMAC', hmacKey, dataToSign);
    const hmacBytes = new Uint8Array(hmac);

    // 5. Empaquetar: iv + ciphertext + hmac
    const payload = new Uint8Array(
      iv.length + ciphertextBytes.length + hmacBytes.length
    );
    payload.set(iv, 0);
    payload.set(ciphertextBytes, iv.length);
    payload.set(hmacBytes, iv.length + ciphertextBytes.length);

    // 6. Retornar en Base64 (compatible con Django)
    return arrayBufferToBase64(payload);
  } catch (error) {
    console.error('❌ Error cifrando payload:', error);
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * DESCIFRA un payload cifrado con AES-256-CBC + HMAC
 * 
 * @param {string} encryptedB64 - Ciphertext en Base64
 * @param {string} aesKeyB64 - Clave AES en Base64
 * @param {string} hmacKeyB64 - Clave HMAC en Base64
 * @returns {Promise<object>} - Objeto descifrado
 * 
 * @throws {Error} Si el HMAC no coincide (tampering detectado)
 * @throws {Error} Si hay error en descifrado
 */
export async function decryptPayload(encryptedB64, aesKeyB64, hmacKeyB64) {
  try {
    // 1. Decodificar Base64
    const payload = base64ToArrayBuffer(encryptedB64);
    const payloadBytes = new Uint8Array(payload);

    // 2. Extraer componentes: iv (16) + ciphertext (variable) + hmac (32)
    const iv = payloadBytes.slice(0, 16);
    const hmacLength = 32; // HMAC-SHA256 = 32 bytes
    const ciphertextBytes = payloadBytes.slice(
      16,
      payloadBytes.length - hmacLength
    );
    const hmacBytes = payloadBytes.slice(payloadBytes.length - hmacLength);

    // 3. Verificar HMAC (prevenir tampering)
    const hmacKey = await importHMACKey(hmacKeyB64);
    const dataToVerify = new Uint8Array(iv.length + ciphertextBytes.length);
    dataToVerify.set(iv, 0);
    dataToVerify.set(ciphertextBytes, iv.length);

    const isValid = await crypto.subtle.verify('HMAC', hmacKey, hmacBytes, dataToVerify);
    if (!isValid) {
      throw new Error('HMAC verification failed - payload was tampered!');
    }

    // 4. Descifrar con AES-256-CBC
    const aesKey = await importAESKey(aesKeyB64);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv },
      aesKey,
      ciphertextBytes
    );

    // 5. Deserializar JSON
    const plaintextString = new TextDecoder().decode(plaintext);
    return JSON.parse(plaintextString);
  } catch (error) {
    console.error('❌ Error descifrando payload:', error);
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Valida que las claves estén configuradas correctamente
 */
export function validateCryptoKeys(aesKeyB64, hmacKeyB64) {
  const errors = [];

  if (!aesKeyB64) {
    errors.push('AES_SECRET_KEY no configurada en .env');
  }
  if (!hmacKeyB64) {
    errors.push('HMAC_SECRET_KEY no configurada en .env');
  }

  // Verificar que parecen claves Base64 válidas
  try {
    base64ToArrayBuffer(aesKeyB64 || '');
    base64ToArrayBuffer(hmacKeyB64 || '');
  } catch (e) {
    errors.push('Las claves no parecen estar en Base64 válido');
  }

  if (errors.length > 0) {
    throw new Error(`❌ Errores en configuración:\n${errors.join('\n')}`);
  }

  console.log('✅ Claves de cifrado validadas correctamente');
}
