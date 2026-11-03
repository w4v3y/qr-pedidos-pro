/**
 * Autenticación: hash de contraseñas (scrypt + sal) y sesiones en memoria.
 */
'use strict';
const crypto = require('crypto');
const { SESION, LIMITES } = require('../config');
const usuariosRepo = require('../repositorios/usuariosRepo');
const { errores } = require('../utilidades/errores');
const log = require('../utilidades/registro');

const sesiones = new Map(); // token -> { usuario, rol, nombre, expira }

const hashear = (clave, sal) => crypto.scryptSync(String(clave), sal, 64).toString('hex');

function crearUsuario(usuario, clave, rol, nombre = '') {
  if (String(clave).length < LIMITES.minClave)
    throw errores.peticionInvalida(`La contraseña debe tener al menos ${LIMITES.minClave} caracteres`);
  const sal = crypto.randomBytes(16).toString('hex');
  usuariosRepo.crear({ usuario, hash: hashear(clave, sal), sal, rol, nombre });
  log.info('Usuario creado', { usuario, rol });
}

function verificar(usuario, clave) {
  const u = usuariosRepo.porNombre(usuario);
  if (!u || !u.activo) return null;
  const calculado = Buffer.from(hashear(clave, u.sal), 'hex');
  const guardado = Buffer.from(u.hash, 'hex');
  if (calculado.length !== guardado.length) return null;
  if (!crypto.timingSafeEqual(calculado, guardado)) return null;   // comparación en tiempo constante
  return { usuario: u.usuario, rol: u.rol, nombre: u.nombre };
}

function cambiarClave(usuario, nuevaClave) {
  if (String(nuevaClave).length < LIMITES.minClave)
    throw errores.peticionInvalida(`La contraseña debe tener al menos ${LIMITES.minClave} caracteres`);
  const sal = crypto.randomBytes(16).toString('hex');
  const cambios = usuariosRepo.actualizarClave(usuario, hashear(nuevaClave, sal), sal);
  if (!cambios) throw errores.noEncontrado('Usuario no existe');
  cerrarSesionesDe(usuario);
  log.info('Contraseña actualizada', { usuario });
}

function abrirSesion(datosUsuario) {
  const token = crypto.randomBytes(24).toString('hex');
  sesiones.set(token, { ...datosUsuario, expira: Date.now() + SESION.duracionMs });
  return token;
}
function sesionDe(token) {
  const s = sesiones.get(token);
  if (!s) return null;
  if (s.expira < Date.now()) { sesiones.delete(token); return null; }
  return s;
}
const cerrarSesion = (token) => sesiones.delete(token);
function cerrarSesionesDe(usuario) {
  for (const [t, s] of sesiones) if (s.usuario === usuario) sesiones.delete(t);
}
function limpiarExpiradas() {
  const ahora = Date.now();
  for (const [t, s] of sesiones) if (s.expira < ahora) sesiones.delete(t);
}

module.exports = { crearUsuario, verificar, cambiarClave, abrirSesion, sesionDe, cerrarSesion, cerrarSesionesDe, limpiarExpiradas };
