/**
 * Validación y saneamiento de entradas. Toda entrada del exterior pasa por aquí.
 */
'use strict';
const { errores } = require('./errores');

const texto = (valor, { max = 100, minimo = 0, campo = 'campo' } = {}) => {
  const v = String(valor ?? '').trim().slice(0, max);
  if (v.length < minimo) throw errores.peticionInvalida(`El ${campo} es obligatorio`);
  return v;
};
const entero = (valor, { min = 0, max = Number.MAX_SAFE_INTEGER, campo = 'número' } = {}) => {
  const n = Math.floor(Number(valor));
  if (!Number.isFinite(n) || n < min || n > max) throw errores.peticionInvalida(`${campo} inválido`);
  return n;
};
const decimal = (valor, { min = 0, max = 100000, campo = 'precio' } = {}) => {
  const n = Number(valor);
  if (!Number.isFinite(n) || n < min || n > max) throw errores.peticionInvalida(`${campo} inválido`);
  return Math.round(n * 100) / 100;
};
const opcion = (valor, permitidas, campo = 'valor') => {
  if (!permitidas.includes(valor)) throw errores.peticionInvalida(`${campo} inválido`);
  return valor;
};
const nombreUsuario = (valor) => {
  const v = String(valor ?? '').trim().toLowerCase().replace(/[^a-z0-9._-]/g, '').slice(0, 30);
  if (v.length < 3) throw errores.peticionInvalida('El usuario debe tener al menos 3 caracteres (letras, números, . _ -)');
  return v;
};
const urlPublica = (valor) => {
  const v = String(valor ?? '').trim().replace(/\/+$/, '');
  if (v && !/^https?:\/\/[\w.-]+(:\d+)?$/.test(v))
    throw errores.peticionInvalida('URL inválida. Ejemplo: https://mi-restaurante.trycloudflare.com');
  return v;
};
module.exports = { texto, entero, decimal, opcion, nombreUsuario, urlPublica };
