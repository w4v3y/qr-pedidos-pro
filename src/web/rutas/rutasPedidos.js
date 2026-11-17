/**
 * Rutas de pedidos y llamadas de mesa (las usa el cliente sin cuenta).
 */
'use strict';
const pedidos = require('../../servicios/pedidosServicio');
const llamadas = require('../../servicios/llamadasServicio');
const carta = require('../../servicios/cartaServicio');
const eventos = require('../eventos');
const { json } = require('../respuestas');
const { exigirSesion } = require('../middlewares');
const { errores } = require('../../utilidades/errores');

module.exports = [
  { metodo: 'GET', ruta: '/api/menu',
    manejador: (ctx) => json(ctx.res, 200, { menu: carta.publica() }) },

  { metodo: 'POST', ruta: '/api/pedidos',
    async manejador(ctx) {
      const pedido = pedidos.crear(await ctx.cuerpo());
      eventos.difundir();
      json(ctx.res, 201, { pedido });
    } },

  { metodo: 'GET', ruta: '/api/pedidos/:id',
    manejador(ctx) {
      const pedido = pedidos.obtener(Number(ctx.params.id));
      if (!pedido) throw errores.noEncontrado('El pedido no existe');
      json(ctx.res, 200, { pedido });
    } },

  { metodo: 'POST', ruta: '/api/pedidos/:id/estado',
    async manejador(ctx) {
      const usuario = exigirSesion(ctx);
      const cuerpo = await ctx.cuerpo();
      const pedido = pedidos.cambiarEstado(Number(ctx.params.id), cuerpo.estado, usuario);
      eventos.difundir();
      json(ctx.res, 200, { pedido });
    } },

  { metodo: 'POST', ruta: '/api/llamadas',
    async manejador(ctx) {
      const resultado = llamadas.crear(await ctx.cuerpo());
      eventos.difundir();
      json(ctx.res, resultado.repetida ? 200 : 201, { ok: true, ...resultado });
    } },

  { metodo: 'POST', ruta: '/api/llamadas/:id/atender',
    manejador(ctx) {
      llamadas.atender(Number(ctx.params.id), exigirSesion(ctx));
      eventos.difundir();
      json(ctx.res, 200, { ok: true });
    } },

  { metodo: 'GET', ruta: '/api/mis-stats',
    manejador(ctx) {
      const reportes = require('../../servicios/reportesServicio');
      json(ctx.res, 200, reportes.personales(exigirSesion(ctx)));
    } },
];
