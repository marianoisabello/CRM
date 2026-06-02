'use strict';

const webForm = require('./webForm');
const manychat = require('./manychat');
const whatsapp = require('./whatsapp');
const instagram = require('./instagram');
const linkedin = require('./linkedin');
const email = require('./email');
const databaseImport = require('./databaseImport');

const normalizers = {
  web_form: webForm,
  manychat: manychat,
  whatsapp: whatsapp,
  instagram: instagram,
  linkedin: linkedin,
  email: email,
  database_import: databaseImport,
};

const VALID_SOURCES = Object.keys(normalizers);

function getNormalizer(source) {
  const normalizer = normalizers[source];
  if (!normalizer) {
    throw new Error(
      `Fuente desconocida: "${source}". Fuentes válidas: ${VALID_SOURCES.join(', ')}`
    );
  }
  return normalizer;
}

module.exports = { getNormalizer, VALID_SOURCES };
