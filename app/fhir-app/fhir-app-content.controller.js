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
         * Save or update the data as a QuestionnaireResponse resource
         */
        $scope.saveQRToFhir = function() {
          $('.spinner').show();
          // QuestionnaireResponse
          if ($scope.fhirResInfo.resType === "QuestionnaireResponse") {
            // existing resource
            if ($scope.fhirResInfo.resId) {
              $scope.updateQRToFhir($scope.fhirResInfo.extensionType);
            }
            // new resource
            else {
              $scope.createQRToFhir($scope.fhirResInfo.extensionType);
            }
          }
        };


        /**
         * Delete the currently selected FHIR resource
         */
        $scope.deleteFromFhir = function() {
          $('.spinner').show();
          if ($scope.fhirResInfo.resId) {
            fhirService.deleteFhirResource($scope.fhirResInfo.resType, $scope.fhirResInfo.resId);
          }
        };


        /**
         * Save the data as a new copy of the specified type of QuestionnaireResponse resource
         * @param resType resource type, standard QuestionnaireResponse ("QR") or SDC QuestionnaireResponse ("SDC-QR").
         */
        $scope.saveAsToFhir = function(resType) {
          $('.spinner').show();
          // QuestionnaireResponse
          if (resType === "QR") {
            $scope.createQRToFhir();
          }
          // QuestionnaireResponse (SDC)
          else if (resType === "SDC-QR") {
            $scope.createQRToFhir("SDC");
          }
          // // DiagnosticReport
          // else if (resType === "DR") {
          //   $scope.saveDRToFhir();
          // }
        };


        /**
         *  Saves the data as a new copy of an SDC QuestionnaireResponse and
         *  extracted Observations.
         */
        $scope.saveAsQRExtracted = function() {
          $('.spinner').show();
          var resArray = LForms.Util.getFormFHIRData('QuestionnaireResponse',
            fhirService.fhirVersion, $scope.formData, {extract: true,
            subject: fhirService.getCurrentPatient()});

          var qExists;
          if ($scope.fhirResInfo.questionnaireResId) {
            var qData = {id: $scope.fhirResInfo.questionnaireResId,
              name: $scope.fhirResInfo.questionnaireName};
            qExists = true; // it is on the server already
          }
          else {
            var copyOfFormData = $scope.valueCleanUp($scope.formData);
            var qData = LForms.Util.getFormFHIRData('Questionnaire',
              fhirService.fhirVersion, copyOfFormData)
            qExists = false;
          }
          var qr = resArray.shift();
          fhirService.createQQRObs(qData, qr, resArray, qExists);
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
         * Save the form data as a QuestionnaireResponse to the selected FHIR server
         * @param extensionType a flag indicate if it is a SDC type of QuestionnaireResponse
         */
        $scope.createQRToFhir = function(extensionType) {
          $('.spinner').show();

          var noExtensions = extensionType === "SDC" ? false : true;
          var qr = LForms.Util.getFormFHIRData('QuestionnaireResponse',
            fhirService.fhirVersion, $scope.formData, {noExtensions: noExtensions,
            subject: fhirService.getCurrentPatient()})
          if (qr) {
            // patient data should already be filled in above
            delete qr.id;

            if ($scope.fhirResInfo.questionnaireResId) {
              var qData = {id: $scope.fhirResInfo.questionnaireResId,
                name: $scope.fhirResInfo.questionnaireName};
              fhirService.createQR(qr, qData, extensionType);
            }

            else {
              var copyOfFormData = $scope.valueCleanUp($scope.formData);
              // always get the SDC Questionnaire, with extensions
              var q = LForms.Util.getFormFHIRData('Questionnaire',
                fhirService.fhirVersion, copyOfFormData)
              if (q) {
                delete q.id;
                fhirService.createQQR(q, qr, extensionType);
              }
              else {
                console.log("Failed to create a Questionnaire. " + JSON.stringify($scope.formData));
              }
            }
          }
          else {
            console.log("Failed to create a QuestionnaireResponse. " + JSON.stringify($scope.formData));
          }
        };


        /**
         * Update the form data as a QuestionnaireResponse on the selected FHIR server
         * @param extensionType a flag indicate if it is a SDC type of QuestionnaireResponse
         */
        $scope.updateQRToFhir = function(extensionType) {
          $('.spinner').show();
          var noExtensions = extensionType === "SDC" ? false : true;
          if ($scope.fhirResInfo.resId && $scope.fhirResInfo.questionnaireResId) {
            var qr = LForms.Util.getFormFHIRData('QuestionnaireResponse',
              fhirService.fhirVersion, $scope.formData, {noExtensions: noExtensions})
            if (qr) {
              // patient data
              var patient = fhirService.getCurrentPatient();
              if (patient) {
                qr["subject"] = {
                  "reference": "Patient/" + patient.id,
                  "display": patient.name
                }
              }
              fhirService.setQRRefToQ(qr, {id: $scope.fhirResInfo.questionnaireResId});
              qr.id = $scope.fhirResInfo.resId; // id must be same
              fhirService.updateFhirResource("QuestionnaireResponse", qr);
            }
            else {
              console.log("Failed to update a QuestionnaireResponse. " + JSON.stringify($scope.formData));
            }
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
         * Show the original FHIR Questionnaire data from FHIR server in a dialog
         * @param event
         */
        $scope.showOrigFHIRQuestionnaire = function (event) {
          var q = fhirService.getCurrentQuestionnaire();
          if (q) {
            var fhirString = JSON.stringify(q, null, 2);
            $scope.fhirResourceString = fhirString;
            $scope.fhirResourceTitle = "Questionnaire Resource from FHIR Server";

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
         * Remove the displayed form when a QuestionnaireResponse (hence the form data) is deleted
         */
        $scope.$on('LF_FHIR_RESOURCE_DELETED', function(event, arg) {
          // clean up the form
          selectedFormData.setFormData(null);
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
          if ($scope.initialLoad)
            $scope.initialLoad = false;
          $('.spinner').hide();
        });

      }
]);
