// Replaces the version placeholder in the built index.html file.
// This script is created so that the work can be done cross-platform,
// since there isn't a good equivalent of the 'sed' command on Windows.

const fs = require('fs');

const targetFile = 'dist/lforms-fhir-app/index.html';
const VERSION = process.env.npm_package_version;

const data = fs.readFileSync(targetFile).toString();
const result = data.replace('VERSION_PLACEHOLDER', VERSION);
fs.writeFileSync(targetFile, result);
