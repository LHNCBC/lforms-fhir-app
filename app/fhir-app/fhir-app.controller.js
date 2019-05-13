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
      $timeout(function(){ $scope.establishFHIRContext() }, 1000);


      /**
       *  Opens dialogs for selecting first a FHIR server and then a patient.
       */
      function selectServerAndPatient() {
        // For now get the server from an URL parameter:
        var fhirServerURL = $location.search()['server'];
        if (fhirServerURL) {
          setServerAndPickPatient(fhirServerURL);
        }
        else {
          $scope.showFHIRServerPicker();
        }
      }


      /**
       *  Establishes communication with the FHIR server at the given URL, and
       *  calls the given callback with a boolean indicating whether
       *  communication was successfully established.  If it was successful, a
       *  patient selection dialog will be opened.
       * @param serverURL the URL of the FHIR server
       * @param callback the function to call after the communication attempt.
       *  It will be passed a boolean to indicate whether the attempt was
       *  successful.
       */
      function setServerAndPickPatient(serverURL, callback) {
        $scope.showWaitMsg('Contacting FHIR server.  Please wait...');
        fhirService.setNonSmartServer(serverURL, function(success) {
          if (callback)
            callback(success);
          if (success)
            $scope.showPatientPicker();
          else {
            $scope.showErrorMsg('Could not establish communication with the FHIR server at ' +
              serverURL+'.');
          }
        });
      }


      /**
       * Get the connection to FHIR server and the selected patient
       * and retrieve all the DiagosticReport resources for this patient
       * Note: Here it gets all resources in one request without a search,
       * just to make a simple demo.
       */
      $scope.establishFHIRContext = function() {
        var fhirServerURL = $location.search()['server'];
        if (fhirServerURL) {
          setServerAndPickPatient(fhirServerURL);
        }
        else {
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
       *  Shows a window to summarize the results of the attempt to save (and
       *  maybe extract).
       *
       * @param event the click event
       */
      $scope.showSaveResults = function(resultData) {
        $mdDialog.show({
          scope: $scope,
          preserveScope: true,
          templateUrl: 'fhir-app/save-results-dialog.html',
          parent: angular.element(document.body),
          controller: function DialogController($scope, $mdDialog) {
            $scope.dialogTitle = "Save Results";
            $scope.resultData = resultData;
            // For some reason, calling JSON.stringify in the template does not
            // work-- nothing is output-- so pass in a separate variable here.
            $scope.resultDataJSON = JSON.stringify(resultData, null, 2);
            $scope.serverBaseURL = fhirService.getSmartConnection().server.serviceUrl;
            // close the popup without selecting a patient
            $scope.closeDialog = function () {
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
            $scope.fhirServerListOpts = {listItems: [
              // Note:  Options must be https, because the public server is https
              {text: 'https://launch.smarthealthit.org/v/r3/fhir'},
              {text: 'https://lforms-fhir.nlm.nih.gov/baseDstu3'},
              {text: 'https://lforms-fhir.nlm.nih.gov/baseR4'}
              // {text: 'http://test.fhir.org/r4'} // Grahame's https server requires OAuth
            ]}
            // close the popup without selecting a patient
            $scope.closeDialog = function () {
              $scope.selectedServerInDialog = null;
              $mdDialog.hide();
            };

            // close the popup and select a patient
            $scope.confirmAndCloseDialog = function () {
              var serverURL = $scope.selectedServerInDialog && $scope.selectedServerInDialog.text;
              if (serverURL)
                setServerAndPickPatient(serverURL, function() {$mdDialog.hide()});
              $scope.selectedServerInDialog = null;
              $mdDialog.hide();
            };
          }
        });
      };


      /**
       *  Show an error message when an interaction with the FHIR server fails.
       */
      $scope.$on('OP_FAILED', function(event, failData) {
        $('.spinner').hide();
        var errInfo = failData.errInfo
        if (errInfo && errInfo.error && errInfo.error.responseJSON && errInfo.error.responseJSON.issue) {
          var issues = errInfo.error.responseJSON.issue;
          // Find the first error
          var errorMsg = 'Unable to "'+failData.operation+'" '+failData.resType+'.';
          var foundError = false;
          for (var i=0, len=issues.length; i<len && !foundError; ++i) {
            var issue = issues[i];
            if ((issue.severity == 'error' || issue.severity == 'fatal') &&
                 issue.details && issue.details.text) {
              errorMsg = errorMsg+"\n"+issue.details.text;
              foundError = true;
            }
          }
          console.log(errorMsg);
          $scope.showErrorMsg(errorMsg);
        }
      });


      /**
       *  Reports the results of a transaction.
       */
      $scope.$on('OP_RESULTS', function(event, resultData) {
        $('.spinner').hide();
        $scope.showSaveResults(resultData);
      });


      /**
       *  Shows a error message.
       * @param msg The message to show.
       */
      $scope.showErrorMsg = function(msg) {
        this.showMsg('Error', msg);
      };


      /**
       *  Shows a message (text only).
       * @param title The heading for the message.
       * @param msg The message to show.
       */
      $scope.showMsg = function(title, msg) {
        $mdDialog.show(
          $mdDialog.alert()
            .parent(angular.element(document.body))
            .clickOutsideToClose(true)
            .title(title)
            .textContent(msg)
            .ariaLabel(title+' Dialog')
            .ok('OK')
        );
      };


      /**
       *  Shows a "Please Wait" message.
       * @param msg The message to show.
       */
      $scope.showWaitMsg = function(msg) {
        this.showMsg('Please Wait', msg);
      };


      /**
       *  Search for patients by name.  (Based on version in lforms-app).
       * @param searchText
       */
      $scope.searchPatientByName = function(searchText) {
        return fhirService.searchPatientByName(searchText);
      };

    }]);
