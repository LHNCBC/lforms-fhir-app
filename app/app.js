'use strict';

angular.module('lformsApp', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ngRoute',
  'ngAnimate',
  'ngMaterial',
  'lformsWidget',
  'angularFileUpload'
])
    .config(['$ariaProvider', function ($ariaProvider) {
      $ariaProvider.config({
        tabindex: false,
        bindRoleForClick: false
      });
    }])
    .config(['$routeProvider', '$locationProvider',
      function($routeProvider, $locationProvider) {
        $routeProvider
            .when('/lforms-fhir-app', {
              templateUrl: 'fhir-app/fhir-app.html',
              controller: 'FhirAppCtrl'
            })
            .when('/', {
              templateUrl: 'fhir-app/fhir-app.html',
              controller: 'FhirAppCtrl'
            });


        $locationProvider.html5Mode(true);

      }]);

// Util functions
var LFormsUtil = LFormsUtil || {};

LFormsUtil.copyToClipboard = function(elementId) {
  window.getSelection().selectAllChildren(document.getElementById(elementId));
  /* Copy the text inside the element */
  document.execCommand("Copy");
};


