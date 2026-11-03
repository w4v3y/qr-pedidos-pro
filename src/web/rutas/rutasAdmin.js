/**
 * Rutas del panel de administración (solo rol admin).
 */
'use strict';
const os = require('os');
const { PUERTO } = require('../../config');
const carta = require('../../servicios/cartaServicio');
const reportes = require('../../servicios/reportesServicio');
const usuarios = require('../../servicios/usuariosServicio');
const configRepo = require('../../repositorios/configRepo');
const eventos = require('../eventos');
const { json } = require('../respuestas');
const { exigirRol } = require('../middlewares');
const v = require('../../utilidades/validacion');

const soloAdmin = (fn) => (ctx) => { const u = exigirRol(ctx, 'admin'); return fn(ctx, u); };

function direccionLocal() {
  const ips = Object.values(os.networkInterfaces()).flat()
    .filter(i => i && i.family === 'IPv4' && !i.internal).map(i => i.address);
  return ips.length ? `http://${ips[0]}:${PUERTO}` : `http://localhost:${PUERTO}`;
}

module.exports = [
  { metodo: 'GET', ruta: '/api/admin/carta',
    manejador: soloAdmin((ctx) => json(ctx.res, 200, carta.completa())) },

  { metodo: 'POST', ruta: '/api/admin/platos',
    manejador: soloAdmin(async (ctx) => {
      const id = carta.crearPlato(await ctx.cuerpo());
      eventos.difundir();
      json(ctx.res, 201, { id });
    }) },

  { metodo: 'PUT', ruta: '/api/admin/platos/:id',
    manejador: soloAdmin(async (ctx) => {
      carta.actualizarPlato(ctx.params.id, await ctx.cuerpo());
      json(ctx.res, 200, { ok: true });
    }) },

  { metodo: 'POST', ruta: '/api/admin/categorias',
    manejador: soloAdmin(async (ctx) => {
      const cuerpo = await ctx.cuerpo();
      json(ctx.res, 201, { id: carta.crearCategoria(cuerpo.nombre) });
    }) },

  { metodo: 'GET', ruta: '/api/admin/reportes',
    manejador: soloAdmin((ctx) => json(ctx.res, 200, reportes.panelAdmin(ctx.url.searchParams.get('rango') || 'hoy'))) },

  { metodo: 'GET', ruta: '/api/admin/usuarios',
    manejador: soloAdmin((ctx) => json(ctx.res, 200, { usuarios: usuarios.listar() })) },

  { metodo: 'POST', ruta: '/api/admin/usuarios',
    manejador: soloAdmin(async (ctx) => {
      usuarios.crear(await ctx.cuerpo());
      json(ctx.res, 201, { ok: true });
    }) },

  { metodo: 'POST', ruta: '/api/admin/usuarios/clave',
    manejador: soloAdmin(async (ctx) => {
      const cuerpo = await ctx.cuerpo();
      usuarios.cambiarClave(cuerpo.usuario, cuerpo.clave);
      json(ctx.res, 200, { ok: true });
    }) },

  { metodo: 'DELETE', ruta: '/api/admin/usuarios/:usuario',
    manejador: soloAdmin((ctx, u) => {
      usuarios.eliminar(ctx.params.usuario, u);
      json(ctx.res, 200, { ok: true });
    }) },

  { metodo: 'GET', ruta: '/api/admin/config',
    manejador: soloAdmin((ctx) => json(ctx.res, 200, { url_publica: configRepo.obtener('url_publica') })) },

  { metodo: 'POST', ruta: '/api/admin/config',
    manejador: soloAdmin(async (ctx) => {
      const cuerpo = await ctx.cuerpo();
      const url = v.urlPublica(cuerpo.url_publica);
      configRepo.guardar('url_publica', url);
      json(ctx.res, 200, { ok: true, url_publica: url });
    }) },

  // Dirección que deben usar los QRs: pública si está configurada, si no la del WiFi.
  { metodo: 'GET', ruta: '/api/info',
    manejador(ctx) {
      const publica = configRepo.obtener('url_publica');
      json(ctx.res, 200, publica ? { base: publica, tipo: 'internet' } : { base: direccionLocal(), tipo: 'wifi' });
    } },

  // Chequeo de salud para monitoreo.
  { metodo: 'GET', ruta: '/api/salud',
    manejador(ctx) {
      json(ctx.res, 200, {
        estado: 'ok',
        tiempoActivoSeg: Math.round(process.uptime()),
        memoriaMB: Math.round(process.memoryUsage().rss / 1e6),
        conectados: eventos.conectados(),
      });
    } },
];
