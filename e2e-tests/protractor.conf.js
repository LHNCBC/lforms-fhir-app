//jshint strict: false
exports.config = {

  allScriptsTimeout: 11000,

  specs: [
    '*.js'
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
    defaultTimeoutInterval: 30000
  }

};
