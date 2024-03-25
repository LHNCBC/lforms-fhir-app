// Replaces the version placeholder in the built index.html file.
// Used on Windows.

const fs = require('fs');

const targetFile = 'dist/lforms-fhir-app/index.html';
const VERSION = process.env.npm_package_version;

const data = fs.readFileSync(targetFile).toString();
const result = data.replace('VERSION_PLACEHOLDER', VERSION);
fs.writeFileSync(targetFile, result);
