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
    realtimeFailure: true,
    defaultTimeoutInterval: 10000
  },

  onPrepare: function() {
    // Disabling animations, per https://stackoverflow.com/a/32611061/360782
    var disableNgAnimate = function() {
        angular
            .module('disableNgAnimate', [])
            .run(['$animate', function($animate) {
                $animate.enabled(false);
            }]);
    };

    var disableCssAnimate = function() {
        angular
            .module('disableCssAnimate', [])
            .run(function() {
                var style = document.createElement('style');
                style.type = 'text/css';
                style.innerHTML = '* {' +
                    '-webkit-transition: none !important;' +
                    '-moz-transition: none !important' +
                    '-o-transition: none !important' +
                    '-ms-transition: none !important' +
                    'transition: none !important' +
                    '}';
                document.getElementsByTagName('head')[0].appendChild(style);
            });
    };

    browser.addMockModule('disableNgAnimate', disableNgAnimate);
    browser.addMockModule('disableCssAnimate', disableCssAnimate);
  }
};
