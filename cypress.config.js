const { defineConfig } = require("cypress");
const fs = require('fs');
const tmp = require('tmp');

/**
 *  Temporary files removed by cleanUpTmpFiles.  These should be objects
 *  return by the "tmp" package.
 */
const _tmpFiles = [];

module.exports = defineConfig({
    e2e: {
        setupNodeEvents(on, config) {
            // implement node event listeners here
            on('task', {
                /**
                 * Creates a temp file in the system temp folder.
                 * @param data content of the new file
                 * @returns {string} the full name of the temp file created
                 */
                createTmpFile(data) {
                    let tmpObj = tmp.fileSync();
                    _tmpFiles.push(tmpObj);
                    fs.writeFileSync(tmpObj.name, data);
                    return tmpObj.name;
                },

                /**
                 * Deletes temp files created in createTmpFile().
                 */
                cleanUpTmpFiles() {
                    for (var i=0, len=_tmpFiles.length; i<len; ++i) {
                        _tmpFiles[i].removeCallback();
                    }
                    return null;
                }
            })
        },
        baseUrl: 'http://localhost:8000/',
        specPattern: 'cypress/e2e/**/*.spec.{js,jsx,ts,tsx}',
        chromeWebSecurity: false,
        testIsolation: false
    },
});
