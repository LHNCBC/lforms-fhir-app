'use strict';
/**
 * A controller for the SMART on FHIR demo app
 */
angular.module('lformsApp')
    .controller('FhirAppCtrl', [
        '$scope', '$timeout', '$http', '$location', '$mdDialog', 'fhirService',
        function ($scope, $timeout, $http, $location, $mdDialog, fhirService) {

      /**
       *  Returns the current patient resource.
       */
      $scope.getCurrentPatient = function() {
        return fhirService.getCurrentPatient();
      };


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


      function selectServerAndPatient() {
        // For now get the server from an URL parameter:
        var fhirServerURL = $location.search()['server'];
        if (fhirServerURL) {
          fhirService.setNonSmartServer(fhirServerURL);
          $scope.showPatientPicker();
        }
        else {
          $scope.showFHIRServerPicker();
        }
      }


      /**
       * Get the connection to FHIR server and the selected patient
       * and retrieve all the DiagosticReport resources for this patient
       * Note: Here it gets all resources in one request without a search,
       * just to make a simple demo.
       */
      $scope.getSmartReady = function() {
        if (!fhirService.getSmartConnection() && !fhirService.smartConnectionInProgress()) {
          fhirService.requestSmartConnection(function(success) {
            if (success) {
              var smart = fhirService.getSmartConnection();
              smart.patient.read().then(function (pt) {
                fhirService.setCurrentPatient(pt);
                fhirService.getAllQRByPatientId(pt.id);
                fhirService.getAllQ();
                $scope.$apply();
              });
            }
            else {
              console.log("Could not establish a SMART connection.");
              selectServerAndPatient();
            }
          });
        }
      };


      /**
       *  Shows a popup window to let user use a search field to choose a
       *  patient from HAPI FHIR server.  (Based on version in lforms-app).
       *
       * @param event the click event
       */
      $scope.showPatientPicker = function (event) {
        $scope.selectedPatientInDialog = null;
        $mdDialog.show({
          scope: $scope,
          preserveScope: true,
          templateUrl: 'fhir-app/patient-select-dialog.html',
          parent: angular.element(document.body),
          targetEvent: event,
          controller: function DialogController($scope, $mdDialog) {
            $scope.dialogTitle = "Patient Picker";
            $scope.dialogLabel = "Choose a Patient";
            $scope.dialogHint = "Search for patients by name";
            // close the popup without selecting a patient
            var scope = $scope
            $scope.closeDialog = function () {
              $scope.selectedPatientInDialog = null;
              $mdDialog.hide();
            };

            // close the popup and select a patient
            $scope.confirmAndCloseDialog = function () {
              var pt = $scope.selectedPatientInDialog.resource;
              if (pt) {
                fhirService.setCurrentPatient(pt);
                fhirService.getAllQRByPatientId(pt.id);
                fhirService.getAllQ();
              }
              $scope.selectedPatientInDialog = null;
              $mdDialog.hide();
            };
          }
        });
      };


      /**
       *  Shows a popup window to let user use a select or enter a FHIR server
       *  to use.
       *
       * @param event the click event
       */
      $scope.showFHIRServerPicker = function (event) {
        $scope.selectedServerInDialog = null;
        $mdDialog.show({
          scope: $scope,
          preserveScope: true,
          templateUrl: 'fhir-app/fhir-server-select-dialog.html',
          parent: angular.element(document.body),
          targetEvent: event,
          controller: function DialogController($scope, $mdDialog) {
            $scope.dialogTitle = "FHIR Server Needed";
            $scope.dialogLabel = "Select or Enter the base URL of a FHIR Server";
            $scope.fhirServerListOpts = {listItems: [
              {text: 'https://launch.smarthealthit.org/v/r3/fhir'},
              {text: 'http://test.fhir.org/r4'}
            ]}
            // close the popup without selecting a patient
            $scope.closeDialog = function () {
              $scope.selectedServerInDialog = null;
              $mdDialog.hide();
            };

            // close the popup and select a patient
            $scope.confirmAndCloseDialog = function () {
              var serverURL = $scope.selectedServerInDialog && $scope.selectedServerInDialog.text;
              if (serverURL) {
                fhirService.setNonSmartServer(serverURL, function(success) {
                  if (success)
                    $scope.showPatientPicker();
                  else {
                    $scope.showErrorMsg('Could not establish communication with the FHIR server at ' +
                      $scope.selectedServerInDialog.text);
                  }
                });
              }
              $scope.selectedServerInDialog = null;
              $mdDialog.hide();
            };
          }
        });
      };


      /**
       *  Shows a error message.
       * @param msg The message to show.
       */
      $scope.showErrorMsg = function(msg) {
        $mdDialog.show({
          scope: $scope,
          preserveScope: true,
          templateUrl: 'fhir-app/error-dialog.html',
          parent: angular.element(document.body),
          targetEvent: event,
          controller: function DialogController($scope, $mdDialog) {
            $scope.dialogTitle = "Error";
            $scope.dialogLabel = msg;
            // close the popup without selecting a patient
            $scope.closeDialog = function () {
              $mdDialog.hide();
            };
          }
        });
      };


      /**
       *  Search for patients by name.  (Based on version in lforms-app).
       * @param searchText
       */
      $scope.searchPatientByName = function(searchText) {
        return fhirService.searchPatientByName(searchText);
      };


    }]);


