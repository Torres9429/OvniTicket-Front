/**
 * ðŸ” Utilidades de Cifrado con Web Crypto API
 *
 * AES-256-CBC con HMAC-SHA256 (compatible con backend Django)
 *
 * Uso:
 * import { cifrarPayload, descifrarPayload } from './crypto';
 * const cifrado = await cifrarPayload({ usuario: 'juan' }, claveAes, claveHmac);
 * const descifrado = await descifrarPayload(cifrado, claveAes, claveHmac);
 */

/**
 * Convierte string Base64 a ArrayBuffer
 */
function base64AArrayBuffer(base64) {
  base64 = base64.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }

  const cadenaBinaria = atob(base64);
  const longitud = cadenaBinaria.length;
  const bytes = new Uint8Array(longitud);

  for (let i = 0; i < longitud; i++) {
    bytes[i] = cadenaBinaria.charCodeAt(i);
  }

  return bytes.buffer;
}

/**
 * Convierte ArrayBuffer a string Base64
 */
function arrayBufferABase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binario = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binario += String.fromCharCode(bytes[i]);
  }
  return btoa(binario);
}

/**
 * Carga la clave AES desde Base64
 */
async function importarLlaveAES(llaveB64) {
  const bytesLlave = base64AArrayBuffer(llaveB64);
  return await crypto.subtle.importKey(
    'raw',
    bytesLlave,
    { name: 'AES-CBC', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Carga la clave HMAC desde Base64
 */
async function importarLlaveHMAC(llaveB64) {
  const bytesLlave = base64AArrayBuffer(llaveB64);
  return await crypto.subtle.importKey(
    'raw',
    bytesLlave,
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
 * @param {object} datos - Objeto a cifrar
 * @param {string} claveAesB64 - Clave AES en Base64
 * @param {string} claveHmacB64 - Clave HMAC en Base64
 * @returns {Promise<string>} - Ciphertext en Base64
 */
export async function cifrarPayload(datos, claveAesB64, claveHmacB64) {
  try {
    const textoPlano = JSON.stringify(datos);
    const bytesTextoPlano = new TextEncoder().encode(textoPlano);

    const iv = crypto.getRandomValues(new Uint8Array(16));

    const llaveAES = await importarLlaveAES(claveAesB64);
    const textoCifrado = await crypto.subtle.encrypt(
      { name: 'AES-CBC', iv },
      llaveAES,
      bytesTextoPlano
    );
    const bytesTextoCifrado = new Uint8Array(textoCifrado);

    const llaveHMAC = await importarLlaveHMAC(claveHmacB64);
    const datosAFirmar = new Uint8Array(iv.length + bytesTextoCifrado.length);
    datosAFirmar.set(iv, 0);
    datosAFirmar.set(bytesTextoCifrado, iv.length);

    const firmaHmac = await crypto.subtle.sign('HMAC', llaveHMAC, datosAFirmar);
    const bytesHmac = new Uint8Array(firmaHmac);

    const cargaUtil = new Uint8Array(
      iv.length + bytesTextoCifrado.length + bytesHmac.length
    );
    cargaUtil.set(iv, 0);
    cargaUtil.set(bytesTextoCifrado, iv.length);
    cargaUtil.set(bytesHmac, iv.length + bytesTextoCifrado.length);

    return arrayBufferABase64(cargaUtil);
  } catch (error) {
    console.error('âŒ Error cifrando carga útil:', error);
    throw new Error(`Fallo el cifrado: ${error.message}`);
  }
}

/**
 * DESCIFRA un payload cifrado con AES-256-CBC + HMAC
 *
 * @param {string} cifradoB64 - Ciphertext en Base64
 * @param {string} claveAesB64 - Clave AES en Base64
 * @param {string} claveHmacB64 - Clave HMAC en Base64
 * @returns {Promise<object>} - Objeto descifrado
 */
export async function descifrarPayload(cifradoB64, claveAesB64, claveHmacB64) {
  try {
    const cargaUtil = base64AArrayBuffer(cifradoB64);
    const bytesCargaUtil = new Uint8Array(cargaUtil);

    const iv = bytesCargaUtil.slice(0, 16);
    const longitudHmac = 32;
    const bytesTextoCifrado = bytesCargaUtil.slice(16, bytesCargaUtil.length - longitudHmac);
    const bytesHmac = bytesCargaUtil.slice(bytesCargaUtil.length - longitudHmac);

    const llaveHmac = await importarLlaveHMAC(claveHmacB64);
    const datosAVerificar = new Uint8Array(iv.length + bytesTextoCifrado.length);
    datosAVerificar.set(iv, 0);
    datosAVerificar.set(bytesTextoCifrado, iv.length);

    const esValido = await crypto.subtle.verify('HMAC', llaveHmac, bytesHmac, datosAVerificar);
    if (!esValido) {
      throw new Error('Verificación HMAC falló - ¡la carga útil fue alterada!');
    }

    const llaveAes = await importarLlaveAES(claveAesB64);
    const textoPlano = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv },
      llaveAes,
      bytesTextoCifrado
    );

    const cadenaTextoPlano = new TextDecoder().decode(textoPlano);
    return JSON.parse(cadenaTextoPlano);
  } catch (error) {
    console.error('âŒ Error descifrando carga útil:', error);
    throw new Error(`Fallo el descifrado: ${error.message}`);
  }
}

/**
 * Valida que las claves estén configuradas correctamente
 */
export function validarLlavesCripto(claveAesB64, claveHmacB64) {
  const errores = [];

  if (!claveAesB64) errores.push('VITE_AES_SECRET_KEY no configurada en .env');
  if (!claveHmacB64) errores.push('VITE_HMAC_SECRET_KEY no configurada en .env');

  try {
    if (claveAesB64) base64AArrayBuffer(claveAesB64);
    if (claveHmacB64) base64AArrayBuffer(claveHmacB64);
  } catch {
    errores.push('Las claves no parecen estar en Base64 válido');
  }

  if (errores.length > 0) {
    throw new Error(`âŒ Errores en configuración:\n${errores.join('\n')}`);
  }

}
