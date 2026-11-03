/**
 * Servidor HTTP: arma el contexto de cada petición, delega en el enrutador
 * y centraliza el manejo de errores.
 */
'use strict';
const http = require('http');
const { PUERTO, SESION } = require('../config');
const enrutador = require('./enrutador');
const { json, leerCuerpo } = require('./respuestas');
const { usuarioDe, leerCookies, ipDe } = require('./middlewares');
const { ErrorApp } = require('../utilidades/errores');
const log = require('../utilidades/registro');

const despachar = enrutador.crear([
  require('./rutas/rutasAuth'),
  require('./rutas/rutasPedidos'),
  require('./rutas/rutasAdmin'),
  require('./rutas/rutasPaginas'),
]);

function crear() {
  const servidor = http.createServer(async (req, res) => {
    const inicio = Date.now();
    let ctx;
    try {
      ctx = {
        req, res,
        url: new URL(req.url, `http://${req.headers.host || 'localhost'}`),
        usuario: usuarioDe(req),
        token: leerCookies(req)[SESION.nombreCookie],
        ip: ipDe(req),
        params: {},
        _cuerpo: null,
        cuerpo() { return this._cuerpo ??= leerCuerpo(this.req); },
      };
      await despachar(ctx);
    } catch (e) {
      manejarError(e, req, res);
    } finally {
      const ms = Date.now() - inicio;
      if (ms > 500) log.aviso('Petición lenta', { ruta: req.url, ms });
    }
  });

  servidor.headersTimeout = 30_000;
  servidor.requestTimeout = 60_000;
  servidor.on('clientError', (err, socket) => {
    if (!socket.destroyed) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  });
  return servidor;
}

function manejarError(e, req, res) {
  if (res.headersSent) return;
  if (e instanceof ErrorApp) {
    if (e.codigo >= 500) log.error('Error de aplicación', e);
    return json(res, e.codigo, { error: e.message });
  }
  log.error(`Error no controlado en ${req.method} ${req.url}`, e);
  json(res, 500, { error: 'Error interno del servidor' });
}

module.exports = { crear, PUERTO };
