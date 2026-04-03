import { useMemo, useState } from 'react';
import { apiClient } from '../services/api-client';
import { decryptPayload, encryptPayload } from '../services/crypto';

/**
 * PayloadCryptoLab.jsx
 * Laboratorio rápido de cifrado/descifrado de payloads
 * Permite probar tus claves AES/HMAC y validar respuestas del backend.
 * 
 * Requiere configurar VITE_AES_SECRET_KEY y VITE_HMAC_SECRET_KEY en tu .env local.
 * Únicamente de prueba
 */


const env = import.meta.env;
const AES_SECRET_KEY = env.VITE_AES_SECRET_KEY || env.REACT_APP_AES_SECRET_KEY || '';
const HMAC_SECRET_KEY = env.VITE_HMAC_SECRET_KEY || env.REACT_APP_HMAC_SECRET_KEY || '';

const defaultPayload = {
  nombre: 'Usuario Demo',
  email: 'demo@ovniticket.com',
  role_id: 2,
};

function formatOutput(value) {
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value, null, 2);
}

function PayloadCryptoLab() {
  const [method, setMethod] = useState('POST');
  const [endpoint, setEndpoint] = useState('/usuarios/');
  const [payloadText, setPayloadText] = useState(JSON.stringify(defaultPayload, null, 2));
  const [ciphertext, setCiphertext] = useState('');
  const [output, setOutput] = useState('Aqui veras resultado de cifrado/descifrado y respuestas API.');
  const [loading, setLoading] = useState(false);

  const keysReady = useMemo(() => Boolean(AES_SECRET_KEY && HMAC_SECRET_KEY), []);

  const parsePayload = () => {
    if (!payloadText.trim()) {
      return {};
    }
    return JSON.parse(payloadText);
  };

  const runLocalEncrypt = async () => {
    try {
      if (!keysReady) {
        throw new Error('Faltan claves VITE_AES_SECRET_KEY o VITE_HMAC_SECRET_KEY en .env');
      }
      const payload = parsePayload();
      const encrypted = await encryptPayload(payload, AES_SECRET_KEY, HMAC_SECRET_KEY);
      setCiphertext(encrypted);
      setOutput(formatOutput({ action: 'encrypt', ciphertext: encrypted }));
    } catch (error) {
      setOutput(`Error en cifrado local: ${error.message}`);
    }
  };

  const runLocalDecrypt = async () => {
    try {
      if (!keysReady) {
        throw new Error('Faltan claves VITE_AES_SECRET_KEY o VITE_HMAC_SECRET_KEY en .env');
      }
      if (!ciphertext.trim()) {
        throw new Error('Pega un ciphertext para descifrar');
      }
      const decrypted = await decryptPayload(ciphertext.trim(), AES_SECRET_KEY, HMAC_SECRET_KEY);
      setOutput(formatOutput({ action: 'decrypt', data: decrypted }));
    } catch (error) {
      setOutput(`Error en descifrado local: ${error.message}`);
    }
  };

  const runApiTest = async () => {
    setLoading(true);
    try {
      let response;
      if (method === 'GET') {
        response = await apiClient.get(endpoint);
      } else {
        const payload = parsePayload();
        if (method === 'POST') {
          response = await apiClient.post(endpoint, payload);
        }
        if (method === 'PUT') {
          response = await apiClient.put(endpoint, payload);
        }
        if (method === 'PATCH') {
          response = await apiClient.patch(endpoint, payload);
        }
      }

      setOutput(
        formatOutput({
          action: `api-${method.toLowerCase()}`,
          endpoint,
          response,
        })
      );
    } catch (error) {
      const message = error.response?.data || error.message;
      setOutput(formatOutput({ action: `api-${method.toLowerCase()}`, endpoint, error: message }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="crypto-lab app-card" aria-label="Laboratorio rapido de cifrado">
      <header className="crypto-lab-header">
        <h2>Laboratorio rapido de cifrado</h2>
        <p>Prueba payloads cifrados con tus claves y valida respuestas del backend.</p>
      </header>

      {!keysReady ? (
        <p className="crypto-lab-warning">
          Configura VITE_AES_SECRET_KEY y VITE_HMAC_SECRET_KEY en tu archivo .env para pruebas locales.
        </p>
      ) : null}

      <div className="crypto-lab-grid">
        <label className="app-form-field">
          <span>Metodo HTTP</span>
          <select value={method} onChange={(event) => setMethod(event.target.value)}>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="PATCH">PATCH</option>
          </select>
        </label>

        <label className="app-form-field">
          <span>Endpoint</span>
          <input
            type="text"
            value={endpoint}
            onChange={(event) => setEndpoint(event.target.value)}
            placeholder="/usuarios/"
          />
        </label>
      </div>

      <label className="app-form-field">
        <span>Payload JSON</span>
        <textarea
          value={payloadText}
          onChange={(event) => setPayloadText(event.target.value)}
          rows={8}
          placeholder='{"nombre":"Usuario Demo"}'
        />
      </label>

      <label className="app-form-field">
        <span>Ciphertext (Base64)</span>
        <textarea
          value={ciphertext}
          onChange={(event) => setCiphertext(event.target.value)}
          rows={6}
          placeholder="Se llena al cifrar o puedes pegar uno para descifrar"
        />
      </label>

      <div className="crypto-lab-actions">
        <button className="btn btn-outline-secondary" type="button" onClick={runLocalEncrypt}>
          Cifrar local
        </button>
        <button className="btn btn-outline-secondary" type="button" onClick={runLocalDecrypt}>
          Descifrar local
        </button>
        <button className="btn btn-primary" type="button" onClick={runApiTest} disabled={loading}>
          {loading ? 'Probando...' : 'Probar API cifrada'}
        </button>
      </div>

      <section className="crypto-lab-output" aria-label="Resultado">
        <h3>Resultado</h3>
        <pre>{output}</pre>
      </section>
    </section>
  );
}

export default PayloadCryptoLab;
