'use strict';

angular.module('lformsApp')
  .controller('NavBarCtrl', [
      '$scope', '$http', '$mdDialog', 'selectedFormData', 'fhirService',
      'FileUploader', 'userMessages', '$timeout',
      function ($scope, $http, $mdDialog, selectedFormData, fhirService,
                FileUploader, userMessages, $timeout) {

        $scope.search = {};

        // See https://github.com/nervgh/angular-file-upload/wiki/Introduction on
        // usage of angular-file-upload.
        $scope.uploader = new FileUploader({removeAfterUpload: true});

        // Saved QuestionnaireResponse of a patient
        $scope.listSavedQR = null;

        // Questionnaire created by all users using the LHC form builder
        $scope.listSavedQ = null;

        // the current form displayed
        $scope.formSelected = {};

        // Customized OBR fields for DiagnosticReport forms
        $scope.obrItems = [
          {
            "question": "Effective Date", "questionCode": "date_done", "dataType": "DT", "answers": "", "_answerRequired": true,"answerCardinality":{"min":"1", "max":"1"},
            "displayControl": {
              "colCSS": [{"name": "width", "value": "100%"}, {"name": "min-width", "value": "4em"}]
            }
          }
        ];

        /**
         *  Deletes all messages from userMessages.
         */
        function removeMessages() {
          var keys = Object.keys(userMessages);
          for (var i=0, len=keys.length; i<len; ++i)
            delete userMessages[keys[i]];
        }

        /**
         * Open the file dialog and load a file
         */
        $scope.loadFromFile = function() {
          document.querySelector('#inputAnchor').click();
        };


        /**
         * Callback after the item is selected in the file dialog.
         *
         * @param {Object} item - Refer to angular-file-upload for object definition.
         *   Apart from others, it has selected file reference.
         */
        $scope.uploader.onAfterAddingFile = function(item) {
          // clean up the form before assigning a new one for performance reasons related to AngularJS watches
          selectedFormData.setFormData(null);
          $timeout(function() {removeMessages()});

          var reader = new FileReader(); // Read from local file system.
          reader.onload = function(event) {
            try {
              var importedData = JSON.parse(event.target.result);
            }
            catch(e) {
              // We're using $timeout in this function rather than
              // $scope.$apply, because in Edge (but not Firefox or Chrome) an
              // error was raised about $apply already being in
              // progress.  $timeout will wait until the current digest cycle is
              // over, and then will call $apply.
              $timeout(function() {userMessages.error = e});
            }
            if (importedData) {
              // if the imported data is in FHIR Questionnaire format
              if (importedData.resourceType && importedData.resourceType === "Questionnaire") {
                var questionnaire;
                try {
                  var fhirVersion = LForms.Util.detectFHIRVersion(importedData);

                  if (!fhirVersion) {
                    fhirVersion = LForms.Util.guessFHIRVersion(importedData);
                    var metaProfMsg =
                      'specified via meta.profile (see documentation for versioning '+
                      '<a href="http://build.fhir.org/versioning.html#mp-version">resources</a> and '+
                      '<a href="https://www.hl7.org/fhir/references.html#canonical">canonical URLs</a>).</p>'+
                      '<p>Example 1:  http://hl7.org/fhir/4.0/StructureDefinition/Questionnaire'+
                      ' (for Questionnaire version 4.0).<br>'+
                      'Example 2:  http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire|2.7.0 '+
                      ' (for SDC Questionnaire version 2.7).</p>';
                    if (!fhirVersion) {
                      $timeout(function() {
                        userMessages.htmlError = '<p>Could not determine the '+
                        'FHIR version for this resource.  Please make sure it is '+
                        metaProfMsg;
                      });
                    }
                    else {
                      $timeout(function() {
                        userMessages.htmlWarning = '<p>Warning:  Assuming this '+
                        'resource is for FHIR version ' +fhirVersion+'.'+
                        'To avoid this warning, please make sure the FHIR version is '+
                        metaProfMsg;
                      });
                    }
                  }
                  console.log("fhirVersion for uploaded Questionnaire = "+fhirVersion);
                  fhirVersion = LForms.Util.validateFHIRVersion(fhirVersion); // might throw
                  questionnaire = LForms.Util.convertFHIRQuestionnaireToLForms(importedData, fhirVersion);
                }
                catch (e) {
                  $timeout(function() {userMessages.error = e});
                }
                if (questionnaire) {
                  $timeout(function() {
                    $('.spinner').show();
                    var lfData = new LForms.LFormsData(questionnaire);
                    if (LForms.fhirContext) {
                      lfData.loadFHIRResources(true).then(function() {
                        $('.spinner').hide();
                        $scope.$apply(function() {
                          selectedFormData.setFormData(lfData);
                          fhirService.setCurrentQuestionnaire(null);
                          $scope.formSelected = null;
                        });
                      });
                    }
                    else
                      selectedFormData.setFormData(lfData);
                  });
                }
              }
              // in the internal LForms format
              else {
                $timeout(function() {selectedFormData.setFormData(new LForms.LFormsData(importedData))});
              }
            }
          };
          reader.readAsText(item._file);
          $('#inputAnchor')[0].value = ''; // or we can't re-upload the same file twice in a row
        };


        // Pagination links
        $scope.pagingLinks = {
          Questionnaire: {previous: null, next: null},
          QuestionnaireResponse: {previous: null, next: null}
        };


        /**
         * Check if there is a link for next or previous page
         * @param resType FHIR resource type
         * @param relation 'next' or 'previous' page
         * @returns {*}
         */
        $scope.hasPagingLink = function(resType, relation) {
          return $scope.pagingLinks[resType][relation];
        };


        /**
         * Get next or previous page of the search result
         * @param resType FHIR resource type
         * @param relation 'next' or 'previous' page
         */
        $scope.getPage = function(resType, relation) {
          var link = $scope.pagingLinks[resType][relation];
          if (link) {
            fhirService.getPage(resType, relation, link);
          }
        };


        /**
         * Set the links for next/previous pages if there is one.
         * @param resType FHIR resoruce type
         * @param links the link field in a searchset bundle
         */
        $scope.processPagingLinks = function(resType, links) {

          var pagingLinks = {previous: null, next: null};

          for(var i=0,iLen=links.length; i<iLen; i++) {
            var link = links[i];
            if (link.relation === 'previous' || link.relation === 'next') {
              pagingLinks[link.relation] = link.url;
            }
          }
          $scope.pagingLinks[resType] = pagingLinks;
        };


        /**
         * Show a saved QuestionnaireResponse
         * @param formIndex form index in the list
         * @param qrInfo info of a QuestionnaireResponse
         */
        $scope.showSavedQQR = function(formIndex, qrInfo) {
          // ResId, ResType, ResName
          if (qrInfo && qrInfo.resType === "QuestionnaireResponse") {
            $('.spinner').show();
            removeMessages();
            selectedFormData.setFormData(null);

            $scope.formSelected = {
              groupIndex: 1,
              formIndex: formIndex
            };
            // merge the QuestionnaireResponse into the form
            var fhirVersion = fhirService.fhirVersion;
            var mergedFormData;
            try {
              var formData = LForms.Util.convertFHIRQuestionnaireToLForms(
                 qrInfo.questionnaire, fhirVersion);
              //var newFormData = (new LForms.LFormsData(formData)).getFormData();
              // TBD -- getFormData() results in _ variables (including FHIR
              // extensions) being thrown away.  Not sure yet if it is needed
              // for something else.
              var newFormData = (new LForms.LFormsData(formData));
              mergedFormData = LForms.Util.mergeFHIRDataIntoLForms(
                'QuestionnaireResponse', qrInfo.questionnaireresponse, newFormData,
                fhirVersion);
            }
            catch (e) {
              console.error(e);
              userMessages.error = 'Sorry.  Could not process that '+
                'QuestionnaireResponse.  See the console for details.'
            }
            if (mergedFormData) {
              var fhirResInfo = {
                resId : qrInfo.resId,
                resType : qrInfo.resType,
                resTypeDisplay : qrInfo.resTypeDisplay,
                extensionType : qrInfo.extensionType,
                questionnaireResId : qrInfo.questionnaire.id,
                questionnaireName : qrInfo.questionnaire.name
              };
              // Load FHIR resources, but don't prepoluate
              mergedFormData = new LForms.LFormsData(mergedFormData);
              $('.spinner').show();
              mergedFormData.loadFHIRResources(false).then(function() {
                $('.spinner').hide();
                $scope.$apply(function() {
                  // set the form data to be displayed
                  selectedFormData.setFormData(mergedFormData, fhirResInfo);
                  fhirService.setCurrentQuestionnaire(qrInfo.questionnaire);
                });
              });
            }
          }
        };


        /**
         * Show a Questionnaire
         * @param formIndex form index in the list
         * @param qInfo info of a Questionnaire
         */
        $scope.showSavedQuestionnaire = function(formIndex, qInfo) {

          // ResId, ResType, ResName
          if (qInfo && qInfo.resType === "Questionnaire") {
            $('.spinner').show();
            removeMessages();
            selectedFormData.setFormData(null);

            // Allow the page to update
            $timeout(function() {
              $scope.formSelected = {
                groupIndex: 2,
                formIndex: formIndex
              };
              // merge the QuestionnaireResponse into the form
              try {
                var formData = LForms.Util.convertFHIRQuestionnaireToLForms(
                  qInfo.questionnaire, fhirService.fhirVersion);
              }
              catch(e) {
                userMessages.error = e;
              }
              if (!userMessages.error) {
                //var newFormData = (new LForms.LFormsData(formData)).getFormData();
                var fhirResInfo = {
                  resId: null,
                  resType: null,
                  resTypeDisplay: null,
                  extensionType: null,
                  questionnaireResId: qInfo.resId,
                  questionnaireName: qInfo.questionnaire.name
                };
                // set the form data to be displayed
                var newFormData = new LForms.LFormsData(formData);
                $('.spinner').show();
                newFormData.loadFHIRResources(true).then(function() {
                  $('.spinner').hide();
                  $scope.$apply(function() {
                    selectedFormData.setFormData(newFormData, fhirResInfo);
                    fhirService.setCurrentQuestionnaire(qInfo.questionnaire);
                  });
                });
              }
            }, 10);
          }
        };

        /**
         * Determines the selection-state CSS class for a form in a list
         * @param listIndex list index
         * @param formIndex form index in the list
         * @returns {string}
         */
        $scope.isSelected = function (listIndex, formIndex) {
          var ret = "";
          if ($scope.formSelected &&
              $scope.formSelected.groupIndex === listIndex &&
              $scope.formSelected.formIndex === formIndex ) {
            //ret = "panel-selected"
            ret = "active"
          }
          return ret;
        };

        /**
         *  Returns a display name for a Questionnaire resource.
         * @param q the Questionnaire resource
         */
        function getQName(q) {
          var title = q.title || q.name || (q.code && q.code.length && q.code[0].display);
          // For LOINC only, add the code to title
          if (q.code && q.code.length) {
            var firstCode = q.code[0];
            if (firstCode.system == "http://loinc.org")
              title += ' ['+firstCode.code+']';
          }
          return title;
        }

        // The format for showing the update date/time strings.
        var dateTimeFormat = "MM/dd/yyyy HH:mm:ss";

        /**
         * Update the saved QuestionnaireResponse list when the data is returned
         */
        $scope.$on('LF_FHIR_QUESTIONNAIRERESPONSE_LIST', function(event, arg, error) {
          $scope.listSavedQR = [];
          $scope.listSavedQRError = error;
          if (arg && arg.resourceType=="Bundle" && arg.type=="searchset" &&
              arg.entry) {  // searchset bundle
            for (var i=0, iLen=arg.entry.length; i< iLen; i++) {
              var qr = arg.entry[i].resource;
              if (qr.resourceType === "QuestionnaireResponse") {
                var updated;
                if (qr.meta && qr.meta.lastUpdated) {
                  updated = new Date(qr.meta.lastUpdated).toString(dateTimeFormat);
                }
                else if (qr.authored) {
                  updated = new Date(qr.authored).toString(dateTimeFormat);
                }
                var q = null, qName = null;
                var qRefURL =  (qr.questionnaire && qr.questionnaire.reference) ?
                  qr.questionnaire.reference : // STU3
                  qr.questionnaire; // R4+
                if (qRefURL) {
                  var qId = qRefURL.slice("Questionnaire".length+1);
                  var q = fhirService.findQuestionnaire(arg, qId);
                }

                // if the questionnaire resource is included/found in the searchset
                if (q) {
                  qName = getQName(q);
                  var sdcPattern =
                    new RegExp('http://hl7.org/fhir/u./sdc/StructureDefinition/sdc-questionnaire\\|(\\d+\.?\\d+)');
                  var extension = null;
                  if (qr.meta && qr.meta.profile) {
                    for (var j=0, jLen=qr.meta.profile.length; j<jLen; j++) {
                      if (qr.meta.profile[j].match(sdcPattern)) {
                        extension = "SDC"
                      }
                    }
                  }

                  $scope.listSavedQR.push({
                    resId: qr.id,
                    resName: qName,
                    updatedAt: updated,
                    resType: "QuestionnaireResponse",
                    questionnaire: q,
                    questionnaireresponse: qr,
                    extensionType: extension,
                    resTypeDisplay: extension ? "QuestionnaireResponse (SDC)" : "QuestionnaireResponse"
                  });
                }
              }

            }
            $scope.processPagingLinks("QuestionnaireResponse", arg.link);
            $('.spinner').hide();
          }
          $scope.$apply();
        });


        /**
         * Update the Questionnaire list when the data is returned
         */
        $scope.$on('LF_FHIR_QUESTIONNAIRE_LIST', function(event, arg, error) {
          $scope.listSavedQ = [];
          $scope.listSavedQError = error;
          if (arg && arg.resourceType=="Bundle" && arg.type=="searchset" &&
              arg.entry) {  // searchset bundle
            for (var i=0, iLen=arg.entry.length; i< iLen; i++) {
              var q = arg.entry[i].resource;
              var updated;
              if (q.meta && q.meta.lastUpdated) {
                updated = new Date(q.meta.lastUpdated).toString(dateTimeFormat);
              }
              else if (q.date) {
                updated = new Date(q.date).toString(dateTimeFormat);
              }
              $scope.listSavedQ.push({
                resId: q.id,
                resName: getQName(q),
                updatedAt: updated,
                resType: "Questionnaire",
                questionnaire: q,
                resTypeDisplay: "Questionnaire"
              });
            }
            $scope.processPagingLinks("Questionnaire", arg.link);
          }
          $scope.$apply();
          $('.spinner').hide();
        });


        /**
         * Update the QuestionnaireResponse list when a QuestionnaireResponse has been deleted on an FHIR server
         */
        $scope.$on('LF_FHIR_RESOURCE_DELETED', function(event, arg) {
          var patient = fhirService.getCurrentPatient();
          fhirService.getAllQRByPatientId(patient.id);
          fhirService.getAllQ();
          $scope.formSelected = {};
          $('.spinner').hide();
        });


        /**
         *  Update the Questionnnaire list when a Questionnaire has been created
         *  on an FHIR server
         */
        $scope.$on('LF_FHIR_Q_CREATED', function(event, arg) {
          fhirService.getAllQ();
          $scope.formSelected = {
            groupIndex: 2,
            formIndex: 0
          };
          $('.spinner').hide();
        });


        /**
         *  Update the QuestionnaireResponse and Questionnnaire lists when a
         *  QuestionnaireResponse has been created on an FHIR server
         */
        $scope.$on('OP_RESULTS', function(event, arg) {
          if (arg && arg.successfulResults) {
            var patient = fhirService.getCurrentPatient();
            fhirService.getAllQRByPatientId(patient.id);
            fhirService.getAllQ();
            $scope.formSelected = {
              groupIndex: 1,
              formIndex: 0
            };
          }
          $('.spinner').hide();
        });


        /**
         * Update the QuestionnaireResponse list when a QuestionnaireResponse has been updated on an FHIR server
         */
        $scope.$on('LF_FHIR_RESOURCE_UPDATED', function(event, arg) {
          // also update the list to get the updated timestamp and fhir resources.
          var patient = fhirService.getCurrentPatient();
          fhirService.getAllQRByPatientId(patient.id);
          // fhirService.getAllQ(); // should not be necessary
          $scope.formSelected = {
            groupIndex: 1,
            formIndex: 0
          };
          $('.spinner').hide();
        });


        // Questionnaire selected from the questionnaire dialog
        $scope.selectedQuestionnaire = null;

        /**
         * Show a popup window to let user use a search field to choose a Questionnaire from HAPI FHIR server
         * @param event the click event
         */
        $scope.showQuestionnairePicker = function(event) {
          $scope.selectedQuestionnaireInDialog = null;
          $mdDialog.show({
            scope: $scope,
            preserveScope: true,
            templateUrl: 'fhir-app/questionnaire-select-dialog.html',
            parent: angular.element(document.body),
            targetEvent: event,
            controller: function DialogController($scope, $mdDialog) {
              $scope.dialogTitle = "Questionnaire Picker";
              $scope.dialogLabel = "Choose a Questionnaire";
              $scope.dialogHint = "Search for Questionnaires by name";
              // close the popup without selecting a questionnaire
              $scope.closeDialog = function () {
                $scope.selectedQuestionnaireInDialog = null;
                $mdDialog.hide();
              };

              // close the popup and select a questionnaire
              $scope.confirmAndCloseDialog = function () {
                $scope.selectedQuestionnaire = angular.copy($scope.selectedQuestionnaireInDialog.resource);
                var formData = LForms.Util.convertFHIRQuestionnaireToLForms($scope.selectedQuestionnaire);
                // set the form data to be displayed
                selectedFormData.setFormData(new LForms.LFormsData(formData));
                fhirService.setCurrentQuestionnaire($scope.selectedQuestionnaire);
                $scope.selectedQuestionnaireInDialog = null;
                $mdDialog.hide();
              };
            }
          });
        };


        /**
         *  Shows a confirmation dialog before deleting the current
         *  Questionnaire and its associated responses and observations.
         *  (Perhaps this should not be a part of the user interface normally,
         *  but it is useful for testing.)
         */
        $scope.deleteQuestionnaire = function(event) {
          var confirmDialog = $mdDialog.confirm().title('Warning').
            textContent('This will delete the selected Questionnaire, all ' +
             'its saved QuestionnaireResponses, '+
             'and all Observations extracted from those QuestionnaireResponses.').
            ok('Delete').cancel('Cancel').theme('warn');
          $mdDialog.show(confirmDialog).then(function() {
            fhirService.deleteQAndQRespAndObs(fhirService.currentQuestionnaire.id).then(function() {
              var resultDialog = $mdDialog.alert().title('Deletion Completed').
                textContent('The questionnaire and its assosiated resources were deleted successfully.').
                ok('OK');
              $mdDialog.show(resultDialog);
            });
          });
        }

        /**
         * Check if the newly selected Questionnaire is different that the current Questionnaire
         * @param current the current Questionnaire
         * @param newlySelected the newly selected Questionnaire
         * @returns {*|boolean}
         */
        $scope.differentQuestionnaire = function(current, newlySelected) {
          return (current && newlySelected && current.id !== newlySelected.id)
        };

        /**
         * Search Questionnaire by name
         * @param searchText
         * @returns {*}
         */
        $scope.searchQuestionnaireByName = function(searchText) {
          return fhirService.searchQuestionnaireByName(searchText);
        };
      }
  ]);
