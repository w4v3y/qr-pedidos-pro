/**
 * Datos iniciales: solo se insertan si la base está vacía.
 */
'use strict';
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { RUTAS } = require('../config');
const { db, enTransaccion } = require('./conexion');
const log = require('../utilidades/registro');

const CUENTAS_INICIALES = [
  ['admin', 'admin', 'Administrador'],
  ['cocina', 'cocina', 'Cocina'],
  ['mozo', 'mozo', 'Mozo'],
];

/**
 * Contraseña inicial de cada cuenta: la de la variable de entorno QR_CLAVE_<ROL>
 * si existe (útil para pruebas o despliegues), o una aleatoria distinta en cada instalación.
 * Nunca hay contraseñas fijas en el código.
 */
const claveInicial = (rol) =>
  process.env[`QR_CLAVE_${rol.toUpperCase()}`] || crypto.randomBytes(9).toString('base64url');

const CARTA_INICIAL = [
  ['Entradas', [
    ['Ceviche clásico', 'Pescado fresco, leche de tigre, camote y choclo', 28, '🐟'],
    ['Causa limeña', 'Papa amarilla, pollo deshilachado y palta', 16, '🥔'],
    ['Papa a la huancaína', 'Papas con crema de ají amarillo y queso', 14, '🧀'],
    ['Pulpo al olivo', 'Láminas de pulpo con salsa de aceituna', 26, '🐙'],
  ]],
  ['Platos de fondo', [
    ['Lomo saltado', 'Lomo fino salteado con papas fritas y arroz', 32, '🥩'],
    ['Ají de gallina', 'Gallina en crema de ají amarillo con arroz', 26, '🍗'],
    ['Arroz con mariscos', 'Arroz al ají panca con mariscos frescos', 34, '🍚'],
    ['Tallarín saltado criollo', 'Tallarines salteados con lomo y verduras', 27, '🍜'],
    ['Seco de res con frejoles', 'Guiso de res al cilantro, frejoles y arroz', 29, '🍖'],
  ]],
  ['Bebidas', [
    ['Chicha morada', 'Vaso de chicha morada natural', 6, '🥤'],
    ['Limonada fresca', 'Jarra personal de limonada', 7, '🍋'],
    ['Inca Kola 500ml', 'Bien helada', 5, '🥂'],
    ['Maracuyá frozen', 'Refrescante y natural', 9, '🍹'],
  ]],
  ['Postres', [
    ['Crema volteada', 'Clásica y suave', 9, '🍮'],
    ['Picarones', 'Con miel de chancaca (6 und.)', 11, '🍩'],
    ['Suspiro a la limeña', 'Manjar blanco y merengue al oporto', 10, '🍨'],
  ]],
];

function sembrar(crearUsuario) {
  const hayCarta = db.prepare('SELECT COUNT(*) AS n FROM categorias').get().n > 0;
  if (!hayCarta) {
    enTransaccion(() => {
      const insCat = db.prepare('INSERT INTO categorias (nombre, orden) VALUES (?,?)');
      const insPlato = db.prepare(
        'INSERT INTO platos (categoria_id, nombre, descripcion, precio, emoji) VALUES (?,?,?,?,?)');
      let orden = 1;
      for (const [cat, platos] of CARTA_INICIAL) {
        const id = insCat.run(cat, orden++).lastInsertRowid;
        for (const p of platos) insPlato.run(id, ...p);
      }
    });
    log.info('Carta inicial creada');
  }
  const hayUsuarios = db.prepare('SELECT COUNT(*) AS n FROM usuarios').get().n > 0;
  if (!hayUsuarios) {
    const cuentas = CUENTAS_INICIALES.map(([usuario, rol, nombre]) => ({ usuario, rol, nombre, clave: claveInicial(rol) }));
    for (const c of cuentas) crearUsuario(c.usuario, c.clave, c.rol, c.nombre);

    // Se guardan solo en la carpeta datos/ (fuera de git) y se muestran una vez en la consola.
    // No se escriben en registro.log.
    const archivo = path.join(RUTAS.datos, 'CLAVES-INICIALES.txt');
    const lineas = cuentas.map(c => `  ${c.usuario.padEnd(8)} ${c.clave}`).join('\n');
    fs.writeFileSync(archivo,
      `Contraseñas iniciales de QR Pedidos PRO\n\n${lineas}\n\n` +
      'Cámbialas en /admin -> Usuarios y luego borra este archivo.\n', { mode: 0o600 });
    console.log(`\n  Cuentas creadas. Contraseñas iniciales (también en ${archivo}):\n${lineas}\n`);
    log.aviso('Usuarios iniciales creados con contraseñas aleatorias', { archivo });
  }
}
module.exports = { sembrar };
