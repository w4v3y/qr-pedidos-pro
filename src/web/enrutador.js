/**
 * Enrutador mínimo: tabla de rutas declarativa con parámetros por expresión regular.
 * Agregar un endpoint = agregar una entrada en un archivo de src/web/rutas/.
 */
'use strict';
const { errores } = require('../utilidades/errores');

function compilar(patron) {
  if (patron instanceof RegExp) return patron;
  // '/api/pedidos/:id' -> /^\/api\/pedidos\/([^/]+)$/
  const fuente = patron
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')   // escapa caracteres especiales
    .replace(/\/:(\w+)/g, '/(?<$1>[^/]+)');    // convierte :parametro en grupo con nombre
  return new RegExp(`^${fuente}$`);
}

function crear(modulosDeRutas) {
  const tabla = modulosDeRutas.flat().map(r => ({ ...r, expresion: compilar(r.ruta) }));

  return async function despachar(ctx) {
    for (const r of tabla) {
      if (r.metodo !== ctx.req.method) continue;
      const coincide = r.expresion.exec(ctx.url.pathname);
      if (!coincide) continue;
      ctx.params = coincide.groups || {};
      return r.manejador(ctx);
    }
    throw errores.noEncontrado('Ruta no encontrada');
  };
}
module.exports = { crear };
