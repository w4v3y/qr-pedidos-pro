/**
 * Rutas de sesión: login, logout y "quién soy".
 */
'use strict';
const { SESION, RATE_LIMIT } = require('../../config');
const auth = require('../../servicios/autenticacion');
const { json } = require('../respuestas');
const { limitar, ipDe, exigirSesion } = require('../middlewares');
const { errores } = require('../../utilidades/errores');
const log = require('../../utilidades/registro');

module.exports = [
  {
    metodo: 'POST', ruta: '/api/login',
    async manejador(ctx) {
      limitar('login:' + ipDe(ctx.req), RATE_LIMIT.login);
      const cuerpo = await ctx.cuerpo();
      const usuario = auth.verificar(String(cuerpo.usuario || '').trim().toLowerCase(), String(cuerpo.clave || ''));
      if (!usuario) {
        log.aviso('Intento de login fallido', { usuario: cuerpo.usuario, ip: ipDe(ctx.req) });
        throw errores.noAutenticado('Usuario o contraseña incorrectos');
      }
      const token = auth.abrirSesion(usuario);
      log.info('Sesión iniciada', { usuario: usuario.usuario, rol: usuario.rol });
      json(ctx.res, 200, usuario, {
        'Set-Cookie': `${SESION.nombreCookie}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESION.duracionMs / 1000}`,
      });
    },
  },
  {
    metodo: 'POST', ruta: '/api/logout',
    manejador(ctx) {
      if (ctx.token) auth.cerrarSesion(ctx.token);
      json(ctx.res, 200, { ok: true }, {
        'Set-Cookie': `${SESION.nombreCookie}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`,
      });
    },
  },
  {
    metodo: 'GET', ruta: '/api/yo',
    manejador(ctx) {
      const u = exigirSesion(ctx);
      json(ctx.res, 200, { usuario: u.usuario, rol: u.rol, nombre: u.nombre });
    },
  },
];
