/**
 * Ejecuta un array de funciones async con un límite de concurrencia
 * @param {Function[]} tasks - Array de funciones que retornan promesas
 * @param {number} limit - Número máximo de promesas concurrentes (default: 5)
 * @returns {Promise<any[]>} Array de resultados en el mismo orden
 */
export async function executeWithConcurrencyLimit(tasks, limit = 5) {
  const results = [];
  const executing = [];

  for (const [index, task] of tasks.entries()) {
    const promise = Promise.resolve()
      .then(() => task())
      .then(
        (result) => {
          results[index] = result;
          executing.splice(executing.indexOf(promise), 1);
          return result;
        },
        (error) => {
          results[index] = Promise.reject(error);
          executing.splice(executing.indexOf(promise), 1);
          throw error;
        },
      );

    executing.push(promise);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
  return results;
}

/**
 * Ejecuta un array de promesas con un límite de concurrencia (versión más simple)
 * @param {Promise[]} promises - Array de promesas
 * @param {number} limit - Número máximo de promesas concurrentes (default: 5)
 * @returns {Promise<any[]>} Array de resultados en el mismo orden
 */
export async function executePromisesWithLimit(promises, limit = 5) {
  const results = new Array(promises.length);
  const executing = [];

  for (let i = 0; i < promises.length; i++) {
    const promise = promises[i];

    const wrappedPromise = promise.then(
      (result) => {
        results[i] = result;
        executing.splice(executing.indexOf(wrappedPromise), 1);
        return result;
      },
      (error) => {
        executing.splice(executing.indexOf(wrappedPromise), 1);
        throw error;
      },
    );

    executing.push(wrappedPromise);

    if (executing.length >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing).catch(() => {});
  return results;
}

/**
 * Ejecuta tareas en chunks (lotes) secuenciales
 * @param {Function[]} tasks - Array de funciones que retornan promesas
 * @param {number} chunkSize - Tamaño de cada chunk (default: 5)
 * @returns {Promise<any[]>} Array de resultados en el mismo orden
 */
export async function executeInChunks(tasks, chunkSize = 5) {
  const results = [];

  for (let i = 0; i < tasks.length; i += chunkSize) {
    const chunk = tasks.slice(i, i + chunkSize);
    const chunkResults = await Promise.allSettled(chunk.map((task) => task()));

    for (const result of chunkResults) {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        results.push(result.reason);
      }
    }
  }

  return results;
}
