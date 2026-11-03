/**
 * Middlewares: identificación de sesión, control de roles y límite de peticiones.
 */
'use strict';
const { SESION, RATE_LIMIT } = require('../config');
const auth = require('../servicios/autenticacion');
const { errores } = require('../utilidades/errores');

function leerCookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';')
    .map(c => c.trim().split('=')).filter(p => p.length === 2));
}
function usuarioDe(req) {
  return auth.sesionDe(leerCookies(req)[SESION.nombreCookie]) || null;
}
function exigirSesion(ctx) {
  if (!ctx.usuario) throw errores.noAutenticado();
  return ctx.usuario;
}
function exigirRol(ctx, ...roles) {
  exigirSesion(ctx);
  if (!roles.includes(ctx.usuario.rol)) throw errores.sinPermiso();
  return ctx.usuario;
}

/* --- Límite de peticiones por IP (memoria) --- */
const contadores = new Map();
function limitar(clave, maximo) {
  const ahora = Date.now();
  const registro = contadores.get(clave);
  if (!registro || ahora > registro.hasta) {
    contadores.set(clave, { n: 1, hasta: ahora + RATE_LIMIT.ventanaMs });
    return;
  }
  if (++registro.n > maximo) throw errores.demasiadas();
}
function limpiarContadores() {
  const ahora = Date.now();
  for (const [k, r] of contadores) if (ahora > r.hasta) contadores.delete(k);
}
const ipDe = (req) => (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
                      req.socket.remoteAddress || 'desconocida';

module.exports = { leerCookies, usuarioDe, exigirSesion, exigirRol, limitar, limpiarContadores, ipDe };
