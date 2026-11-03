/**
 * Configuración central del sistema.
 * REGLA: ningún otro archivo define constantes de negocio ni rutas; todo vive aquí.
 */
'use strict';
const path = require('path');

const RAIZ = path.join(__dirname, '..');
// Permite apuntar los datos a otra carpeta (se usa en las pruebas automáticas).
const DIR_DATOS = process.env.QR_DATOS ? path.resolve(process.env.QR_DATOS) : path.join(RAIZ, 'datos');

module.exports = {
  APP: { nombre: 'QR Pedidos PRO', version: '3.0.0' },

  PUERTO: Number(process.env.PORT) || 3000,

  RUTAS: {
    raiz: RAIZ,
    publico: path.join(RAIZ, 'publico'),
    datos: DIR_DATOS,
    baseDatos: path.join(DIR_DATOS, 'restaurante.db'),
    copias: path.join(DIR_DATOS, 'copias'),
    registro: path.join(DIR_DATOS, 'registro.log'),
  },

  SESION: {
    duracionMs: 12 * 60 * 60 * 1000,
    nombreCookie: 'sesion',
  },

  ROLES: ['admin', 'cocina', 'mozo'],

  PEDIDO: {
    estados: ['ordenado', 'cocinado', 'listo', 'entregado'],
    // De qué estado se puede pasar a cuál (evita saltarse fases)
    transiciones: { ordenado: 'cocinado', cocinado: 'listo', listo: 'entregado' },
    // Qué rol puede provocar cada cambio de estado
    rolesPermitidos: {
      cocinado: ['cocina', 'admin'],
      listo: ['cocina', 'admin'],
      entregado: ['mozo', 'admin'],
    },
  },

  LIMITES: {
    itemsPorPedido: 40,
    cantidadPorItem: 20,
    largoNota: 300,
    largoNombre: 80,
    largoDescripcion: 200,
    minClave: 6,
    cuerpoPeticionBytes: 1_000_000,
  },

  // Protección básica contra abuso (peticiones por ventana de tiempo)
  RATE_LIMIT: {
    ventanaMs: 60_000,
    login: 10,        // intentos de login por IP por minuto
    pedidos: 8,       // pedidos por mesa por minuto
    llamadas: 4,      // llamadas al mozo por mesa por minuto
  },

  COPIAS_SEGURIDAD: { cadaHoras: 24, conservar: 7 },

  REGISTRO: { nivel: process.env.LOG_LEVEL || 'info', maxArchivoBytes: 2_000_000 },
};
