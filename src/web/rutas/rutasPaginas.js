/**
 * Páginas HTML y eventos en vivo. Las páginas del personal exigen sesión y rol.
 */
'use strict';
const eventos = require('../eventos');
const { archivo, redirigir } = require('../respuestas');
const { exigirSesion } = require('../middlewares');

const protegida = (vista, ...roles) => (ctx) => {
  if (!ctx.usuario || !roles.includes(ctx.usuario.rol))
    return redirigir(ctx.res, '/login?next=' + encodeURIComponent(ctx.url.pathname));
  archivo(ctx.res, vista);
};

module.exports = [
  { metodo: 'GET', ruta: '/', manejador: (ctx) => archivo(ctx.res, 'cliente.html') },
  { metodo: 'GET', ruta: /^\/mesa(\/.*)?$/, manejador: (ctx) => archivo(ctx.res, 'cliente.html') },
  { metodo: 'GET', ruta: '/login', manejador: (ctx) => archivo(ctx.res, 'login.html') },
  { metodo: 'GET', ruta: '/cocina', manejador: protegida('cocina.html', 'cocina', 'admin') },
  { metodo: 'GET', ruta: '/mozo', manejador: protegida('mozo.html', 'mozo', 'admin') },
  { metodo: 'GET', ruta: '/admin', manejador: protegida('admin.html', 'admin') },
  { metodo: 'GET', ruta: '/qr', manejador: protegida('qr.html', 'admin') },
  { metodo: 'GET', ruta: '/estilos.css', manejador: (ctx) => archivo(ctx.res, 'estilos.css') },

  { metodo: 'GET', ruta: '/api/eventos',
    manejador: (ctx) => eventos.abrir(ctx.req, ctx.res, 'publico', eventos.estadoPublico()) },

  { metodo: 'GET', ruta: '/api/eventos-staff',
    manejador(ctx) {
      exigirSesion(ctx);
      eventos.abrir(ctx.req, ctx.res, 'staff', eventos.estadoStaff());
    } },
];
