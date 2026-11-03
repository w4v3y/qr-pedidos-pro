/**
 * Gestión de cuentas del personal.
 */
'use strict';
const { ROLES } = require('../config');
const usuariosRepo = require('../repositorios/usuariosRepo');
const auth = require('./autenticacion');
const { errores } = require('../utilidades/errores');
const v = require('../utilidades/validacion');
const log = require('../utilidades/registro');

module.exports = {
  listar: () => usuariosRepo.listar(),

  crear(datos) {
    const usuario = v.nombreUsuario(datos.usuario);
    const rol = v.opcion(datos.rol, ROLES, 'rol');
    const nombre = v.texto(datos.nombre, { max: 60 });
    if (usuariosRepo.porNombre(usuario)) throw errores.conflicto('Ese usuario ya existe');
    auth.crearUsuario(usuario, datos.clave, rol, nombre);
  },

  cambiarClave(usuario, clave) {
    auth.cambiarClave(v.nombreUsuario(usuario), clave);
  },

  eliminar(objetivo, solicitante) {
    const usuario = v.nombreUsuario(objetivo);
    if (usuario === solicitante.usuario) throw errores.peticionInvalida('No puedes eliminar tu propia cuenta');
    const existente = usuariosRepo.porNombre(usuario);
    if (!existente) throw errores.noEncontrado('Usuario no existe');
    if (existente.rol === 'admin' && usuariosRepo.contarPorRol('admin') <= 1)
      throw errores.peticionInvalida('Debe quedar al menos un administrador');
    usuariosRepo.eliminar(usuario);
    auth.cerrarSesionesDe(usuario);
    log.aviso('Usuario eliminado', { usuario, por: solicitante.usuario });
  },
};
