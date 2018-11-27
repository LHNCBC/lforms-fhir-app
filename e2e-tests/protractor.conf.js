//jshint strict: false
exports.config = {

  allScriptsTimeout: 11000,

  specs: [
    '*.spec.js',
    'R4/*.spec.js',
    'STU3/*.spec.js'
  ],

  capabilities: {
    //'browserName': 'firefox'
    'browserName': 'chrome',
    'chromeOptions': {
      args: ['disable-infobars', 'allow-insecure-localhost']
    }
  },

  baseUrl: 'http://localhost:8000/',

  framework: 'jasmine',

  jasmineNodeOpts: {
    defaultTimeoutInterval: 10000
  }

};
