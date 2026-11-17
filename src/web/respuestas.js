/**
 * Helpers de respuesta HTTP y lectura de cuerpo.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { RUTAS, LIMITES } = require('../config');
const { errores } = require('../utilidades/errores');

const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
               '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

function json(res, codigo, objeto, cabeceras = {}) {
  res.writeHead(codigo, { 'Content-Type': 'application/json; charset=utf-8', ...cabeceras });
  res.end(JSON.stringify(objeto));
}
function redirigir(res, destino) { res.writeHead(302, { Location: destino }); res.end(); }

function archivo(res, nombre) {
  // Evita salir de la carpeta pública (path traversal)
  const destino = path.join(RUTAS.publico, path.normalize(nombre).replace(/^(\.\.[/\\])+/, ''));
  if (!destino.startsWith(RUTAS.publico)) return json(res, 403, { error: 'Ruta no permitida' });
  fs.readFile(destino, (err, datos) => {
    if (err) return json(res, 404, { error: 'No encontrado' });
    res.writeHead(200, {
      'Content-Type': (MIME[path.extname(destino)] || 'application/octet-stream') + '; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(datos);
  });
}

function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    let bruto = '';
    req.on('data', trozo => {
      bruto += trozo;
      if (bruto.length > LIMITES.cuerpoPeticionBytes) { req.destroy(); reject(errores.peticionInvalida('Cuerpo demasiado grande')); }
    });
    req.on('end', () => {
      if (!bruto) return resolve({});
      try { resolve(JSON.parse(bruto)); }
      catch (_) { reject(errores.peticionInvalida('El cuerpo no es JSON válido')); }
    });
    req.on('error', reject);
  });
}
module.exports = { json, redirigir, archivo, leerCuerpo };
