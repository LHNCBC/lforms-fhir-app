//jshint strict: false
exports.config = {

  allScriptsTimeout: 11000,

  specs: [
    '*.spec.js'
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
