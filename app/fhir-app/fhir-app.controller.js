'use strict';
/**
 * A controller for the SMART on FHIR demo app
 */
angular.module('lformsApp')
    .controller('FhirAppCtrl', [
        '$scope', '$timeout', '$http', 'fhirService',
        function ($scope, $timeout, $http, fhirService) {


      /**
       * Get the name of the selected patient
       * @returns {*|string}
       */
      $scope.getPatientName = function() {
        return fhirService.getPatientName();
      };


      /**
       * Get the gender of the selected patient
       * @returns {*|string}
       */
      $scope.getPatientGender = function() {
        return fhirService.getCurrentPatient().gender;
      };


      /**
       * Get the birthday of the selected patient
       * @returns {*|string}
       */
      $scope.getPatientDob = function() {
        return fhirService.getCurrentPatient().birthDate;
      };


      /**
       * Get the phone number of the selected patient
       * @returns {*|string}
       */
      $scope.getPatientPhone = function() {
        return fhirService.getPatientPhoneNumber();
      };


      /**
       * SMART on FHIR specific settings
       */
      // trying to get a connection to a FHIR server
      $timeout(function(){ $scope.getSmartReady() }, 1000);


      /**
       * Get the connection to FHIR server and the selected patient
       * and retrieve all the DiagosticReport resources for this patient
       * Note: Here it gets all resources in one request without a search,
       * just to make a simple demo.
       */
      $scope.getSmartReady = function() {
        if (!fhirService.getSmartConnection() && !fhirService.smartConnectionInProgress()) {
          fhirService.requestSmartConnection(function() {
            var smart = fhirService.getSmartConnection();
            smart.patient.read().then(function (pt) {
              fhirService.setCurrentPatient(pt);
              fhirService.getAllQRByPatientId(pt.id);
              fhirService.getAllQ();
              $scope.$apply();
            });
          });
        }
      };

    }]);


