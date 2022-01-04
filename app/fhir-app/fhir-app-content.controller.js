angular.module('lformsApp')
    .controller('FhirAppContentCtrl', [
      '$scope',
      '$window',
      '$http',
      '$timeout',
      '$routeParams',
      'selectedFormData',
      '$mdDialog',
      'fhirService',
      'userMessages',
      function ($scope, $window, $http, $timeout, $routeParams, selectedFormData, $mdDialog, fhirService, userMessages) {

        //$scope.debug  = true;
        var FHIR_VERSION = 'R4'; // version supported by this app

        $scope.initialLoad = true;
        $scope.previewOptions = {hideCheckBoxes: true};
        $scope.lfOptions = {
          showQuestionCode: true,
          showCodingInstruction: false,
          tabOnInputFieldsOnly: false,
          showFormHeader: false
        };

        // info of the selected FHIR resource
        $scope.fhirResInfo = {
          resId : null,
          resType : null,
          resTypeDisplay : null,
          extensionType : null,
          questionnaireResId : null,
          questionnaireName : null
        };

        $scope.userMessages = userMessages;

        /**
         * Clean up value field in form data object
         * @param formData a LHC-Forms form data object
         * @returns {*} a LHC-Forms form data object without item.value
         */
        $scope.valueCleanUp = function(formData) {
          var copyOfFormData = angular.copy(formData);
          for(var i=0,iLen=copyOfFormData.itemList.length; i<iLen; i++) {
            delete copyOfFormData.itemList[i].value;
          }
          return copyOfFormData;
        };


        /**
         * Save the form data as a DiagnosticReport on the FHIR server.
         * Not used.
         */
        $scope.saveDRToFhir = function() {
          var dr = LForms.FHIR.createDiagnosticReport($scope.formData,
            fhirService.getCurrentPatient().resource, true, "transaction");
          if (dr) {
            fhirService.handleTransactionBundle(dr)
          }
          else {
            console.log("Failed to create a DiagnosticReport. " + JSON.stringify($scope.formData));
          }
        };


        /**
         * Show HL7 messages in a dialog
         * @param event
         */
        $scope.showHL7Segments = function (event) {
          if ($scope.formData) {
            $scope.hl7String = LForms.HL7.toHL7Segments($scope.formData);
            $mdDialog.show({
              scope: $scope,
              preserveScope: true,
              templateUrl: 'fhir-app/hl7-dialog.html',
              parent: angular.element(document.body),
              targetEvent: event
            });
          }
        };


        /**
         * Show FHIR DiagnosticReport data in a dialog
         * @param event
         */
        $scope.showFHIRDiagnosticReport = function (event) {
          if ($scope.formData) {
            var dr = LForms.Util.getFormFHIRData('DiagnosticReport',
              FHIR_VERSION, $scope.formData, {bundleType: "collection"})
            var dr = LForms.FHIR.createDiagnosticReport($scope.formData,
              fhirService.getCurrentPatient().resource, true, "collection");
            var fhirString = JSON.stringify(dr, null, 2);
            $scope.fhirResourceString = fhirString;
            $scope.fhirResourceTitle = "FHIR DiagnosticReport Resource";

            $mdDialog.show({
              scope: $scope,
              preserveScope: true,
              templateUrl: 'fhir-app/fhir-resource-dialog.html',
              parent: angular.element(document.body),
              targetEvent: event
            });
          }
        };


        /**
         * Show FHIR Questionnaire data (without any extensions) in a dialog
         * @param event
         */
        $scope.showFHIRQuestionnaire = function (event) {
          if ($scope.formData) {
            var copyOfFormData = $scope.valueCleanUp($scope.formData);
            var q = LForms.Util.getFormFHIRData('Questionnaire',
              FHIR_VERSION, copyOfFormData, {noExtensions: true});
            var fhirString = JSON.stringify(q, null, 2);
            fhirString = fhirString.replace(/"id": "(\d+)"/, '"id": "<a href="'+
              $scope.serverBaseURL+'/Questionnaire/$1">Questionnaire/$1</a>');
            $scope.fhirResourceString = fhirString;
            $scope.fhirResourceTitle = "FHIR Questionnaire Resource";

            $mdDialog.show({
              scope: $scope,
              preserveScope: true,
              templateUrl: 'fhir-app/fhir-resource-dialog.html',
              parent: angular.element(document.body),
              targetEvent: event
            });
          }
        };


        /**
         * Show FHIR SDC Questionnaire data in a dialog
         * @param event
         */
        $scope.showFHIRSDCQuestionnaire = function (event) {
          if ($scope.formData) {
            var copyOfFormData = $scope.valueCleanUp($scope.formData);
            var sdc = LForms.Util.getFormFHIRData('Questionnaire',
              FHIR_VERSION, copyOfFormData);
            var fhirString = JSON.stringify(sdc, null, 2);
            $scope.fhirResourceString = fhirString;
            $scope.fhirResourceTitle = "FHIR SDC Questionnaire Resource";

            $mdDialog.show({
              scope: $scope,
              preserveScope: true,
              templateUrl: 'fhir-app/fhir-resource-dialog.html',
              parent: angular.element(document.body),
              targetEvent: event
            });
          }
        };


        /**
         * Show FHIR QuestionnaireResponse data in a dialog
         * @param event
         */
        $scope.showFHIRQuestionnaireResponse = function (event) {
          if ($scope.formData) {
            var sdc = LForms.Util.getFormFHIRData('QuestionnaireResponse',
              FHIR_VERSION, $scope.formData, {noExtensions: true,
              subject: fhirService.getCurrentPatient()});
            var fhirString = JSON.stringify(sdc, null, 2);
            $scope.fhirResourceString = fhirString;
            $scope.fhirResourceTitle = "FHIR QuestionnaireResponse Resource";

            $mdDialog.show({
              scope: $scope,
              preserveScope: true,
              templateUrl: 'fhir-app/fhir-resource-dialog.html',
              parent: angular.element(document.body),
              targetEvent: event
            });
          }
        };


        /**
         * Show FHIR SDC QuestionnaireResponse data in a dialog
         * @param event
         */
        $scope.showFHIRSDCQuestionnaireResponse = function (event) {
          if ($scope.formData) {
            var sdc = LForms.Util.getFormFHIRData('QuestionnaireResponse',
              FHIR_VERSION, $scope.formData, {subject: fhirService.getCurrentPatient()});
            var fhirString = JSON.stringify(sdc, null, 2);
            $scope.fhirResourceString = fhirString;
            $scope.fhirResourceTitle = "FHIR SDC QuestionnaireResponse Resource";

            $mdDialog.show({
              scope: $scope,
              preserveScope: true,
              templateUrl: 'fhir-app/fhir-resource-dialog.html',
              parent: angular.element(document.body),
              targetEvent: event
            });
          }
        };


        /**
         * Close the message dialog
         */
        $scope.closeDialog = function () {
          $mdDialog.hide();
        };


        /**
         * Copy text content inside an element to clipboard
         * @param elementId an id of a html element
         */
        $scope.copyToClipboard = function (elementId) {
          LFormsUtil.copyToClipboard(elementId);
        };


        /**
         * Update current resource info when a new QuestionnaireResponse is created on the FHIR server
         */
        $scope.$on('LF_FHIR_QR_CREATED', function(event, arg) {
          $scope.fhirResInfo.resId = arg.resId;
          $scope.fhirResInfo.resType = arg.resType;
          if (arg.qResId) {
            $scope.fhirResInfo.questionnaireResId = arg.qResId;
            $scope.fhirResInfo.questionnaireName = arg.qName;
          }
          $scope.fhirResInfo.extensionType = arg.extensionType;
          if (arg.resType === "QuestionnaireResponse" && arg.extensionType) {
            $scope.fhirResInfo.resTypeDisplay = arg.resType + " (" + arg.extensionType + ")";
          }
          else {
            $scope.fhirResInfo.resTypeDisplay = arg.resType;
          }
          $('.spinner').hide();
        });


        /**
         * Remove the displayed form when a Questionnaire or QuestionnaireResponse (hence the form data) is deleted
         */
        $scope.$on('LF_FHIR_RESOURCE_DELETED', function(event, arg) {
          // clean up the form
          selectedFormData.setFormData(null);
          $scope.fhirResInfo = {};
          $scope.initialLoad = true;
          $scope.$apply();
          $('.spinner').hide();
        });


        /**
         * Reset the lfData
         * by listening on a broadcast event
         */
        $scope.$on('LF_NEW_DATA', function () {

          var formData = selectedFormData.getFormData();
          // no form header
          if (formData) {
            formData.templateOptions.showFormHeader = false;
          }

          $scope.fhirResInfo = selectedFormData.getFhirResInfo();
          $scope.formData = formData;

          // clean up the initial message
          if ($scope.initialLoad && formData)
            $scope.initialLoad = false;
          $('.spinner').hide();
        });


        /**
         * Display a Questionnaire
         * by listening on a broadcast event
         */
        $scope.$on('LF_FHIR_RESOURCE', function (event, arg) {
          if (arg.resType === 'Questionnaire') {
            var q = arg.resource;
            // merge the QuestionnaireResponse into the form
            var fhirVersion = fhirService.fhirVersion;
            var formData;
            try {
              q = lformsUpdater.update(q); // call before converting to LForms
              formData = LForms.Util.convertFHIRQuestionnaireToLForms(
                  q, fhirVersion);
              formData = (new LForms.LFormsData(formData));
            }
            catch (e) {
              console.error(e);
              userMessages.error = 'Sorry.  Could not process that '+
                  'Questionnaire.  See the console for details.'
            }
            if (formData) {
              var fhirResInfo = {
                resId : null,
                resType : 'QuestionnaireResponse',
                resTypeDisplay : 'QuestionnaireResponse (SDC)',
                extensionType : 'SDC',
                questionnaireResId : q.id,
                questionnaireName : q.name
              };
              $('.spinner').show();
              formData.loadFHIRResources(true).then(function() {
                $('.spinner').hide();
                $scope.$apply(function() {
                  // set the form data to be displayed
                  selectedFormData.setFormData(formData, fhirResInfo);
                  fhirService.setCurrentQuestionnaire(q);
                });
              });
              // no form header
              formData.templateOptions.showFormHeader = false;
            }
          }
          $scope.fhirResInfo = selectedFormData.getFhirResInfo();
          $scope.formData = formData;

          // clean up the initial message
          if ($scope.initialLoad && formData)
            $scope.initialLoad = false;
          $('.spinner').hide();
        });

      }
]);
