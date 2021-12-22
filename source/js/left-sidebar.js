'use strict';
// Functions and initialization for the left navigation bar.

import 'bootstrap/js/collapse.js';
import * as util from './util';
import { announce } from './announcer'; // for a screen reader
import * as formPane from './form-pane';
import {fhirService} from './fhir.service.js';
import lformsUpdater from 'lforms-updater';
import {spinner} from './spinner.js';
import {Dialogs} from './dialogs.js';

/**
 *  An element that is the template for the saved QuestionnaireResponse list
 *  items.
 */
let savedQRItemTemplate_;

/**
 *  An element that is the template for the saved Questionnaire list
 *  items.
 */
let savedQItemTemplate_;

/**
 *  The currently selected item in the side bar.
 */
let selectedItem_;

/**
 *  Previous page button for the QuestionnaireResponse list
 */
const qrPrevPage_ = document.getElementById('qrPrevPage');

/**
 *  Next page button for the QuestionnaireResponse list
 */
const qrNextPage_ = document.getElementById('qrNextPage');

/**
 *  Previous page button for the Questionnaire list
 */
const qPrevPage_ = document.getElementById('qPrevPage');

/**
 *  Next page button for the Questionnaire list
 */
const qNextPage_ = document.getElementById('qNextPage');

/**
 *  A list of featured Questionnaire data for the current FHIR server (pulled
 *  from fhir-server-config.js).
 */
let listFeaturedQ_;

/**
 *  A structure that keeps track of the links for retrieving the next or
 *  previous page of results for the next or previous page of results.
 */
let pagingLinks_ = {
  Questionnaire: {previous: null, next: null},
  QuestionnaireResponse: {previous: null, next: null}
};

// Set up listeners for the next/prev page buttons
qrPrevPage_.addEventListener('click', ()=>getPage('QuestionnaireResponse', 'previous'));
qrNextPage_.addEventListener('click', ()=>getPage('QuestionnaireResponse', 'next'));
qPrevPage_.addEventListener('click', ()=>getPage('Questionnaire', 'previous'));
qNextPage_.addEventListener('click', ()=>getPage('Questionnaire', 'next'));

// Search button
document.getElementById('search').addEventListener('click', ()=>{
  Dialogs.showQuestionnairePicker().then((questionnaire)=> {
    if (questionnaire)
      formPane.showForm(questionnaire);
  });
});

// File Upload button
const loadFileInput = document.getElementById('loadFileInput');
document.getElementById('upload').addEventListener('click', ()=>{
  loadFileInput.click();
});
loadFileInput.addEventListener('change', ()=>{
  const files = loadFileInput.files;
  if (files.length > 0) {
    var reader = new FileReader(); // Read from local file system.
    reader.onload = function(event) {
      try {
        var importedData = JSON.parse(event.target.result);
        // Update it to the current version of LForms
        importedData = lformsUpdater.update(importedData);
        // Unset (any) selected item after showForm attempt
        formPane.saveDeleteVisibility(false);
        selectItemAfterPromise(null, ()=>formPane.showForm(importedData));
      }
      catch (e) {
        formPane.showError('Could not process the file.', e);
      }
    };
    reader.readAsText(files[0]);
  }
  loadFileInput.value = ''; // so the same file can be selected again
});


// Show Date checkbox
const showDate = document.getElementById('showDate');
showDate.addEventListener('change', ()=>{
  const listItemDiv = document.getElementById('qListItems');
  const itemDates = listItemDiv.querySelectorAll('p.last-updated');
  const checked = showDate.checked;
  Array.prototype.forEach.call(itemDates, function (dateNode) {
    if (checked)
      dateNode.style.display = 'block';
    else
      dateNode.style.display = 'none';
  });
});


/**
 *  Initializes the lists of resources in the nav bar after the server
 *  connection has been established and the patient has been selected.
 *  (It assumes those two things have happened.)
 */
export function initSideBarLists() {
  const numFeaturedQs = initFeaturedList();
  loadSavedQRList().then((qrCount) => {
    loadSavedQList().then((qCount) => {
      if (numFeaturedQs)
        document.getElementById('toggleFeaturedList').click();
      else if (qrCount)
        document.getElementById('toggleQRList').click();
      else if (qCount)
        document.getElementById('toggleQList').click();
    });
  });
  // TBD fhirService.getAllQ();
}


/**
 *  Loads (or reloads) the saved QuestionnaireResponse list.
 * @return a Promise that resolves to the number of QuestionnaireResponses in
 *  the list if the attempt to load has completed successfully.
 */
function loadSavedQRList() {
  const pt = fhirService.getCurrentPatient();
  const savedQRListMsg = document.getElementById('savedQRListMsg');
  let rtn;
  try {
    util.show(savedQRListMsg);
    savedQRListMsg.innerText = 'Loading QuestionnaireResponses from server...';
    rtn = fhirService.getAllQRByPatientId(pt.id).then((resp) => {
      let count = 0;
      if (!resp.entry?.length) {
        savedQRListMsg.innerText =
          'No saved QuestionnaireResponse resources were found for this patient.';
      }
      else {
        count = setSavedQRList(resp);
      }
      util.hide(savedQRListMsg);
      return count;
    });
  }
  catch(e) {
    savedQRListMsg.innerText = 'Unable to retrieve saved QuestionnaireResponses.';
    rtn = Promise.reject(e);
  }
  return rtn;
}


/**
 *  Sets the list of saved QuestionnaireResponses to contain the given
 *  QuestionnaireResponses, but does not change the state of the side bar
 *  visibility.
 * @param bundle a bundle of QuestionnaireResponses and their Questionnaires.
 * @return the number of QuestionnaireResponses added to the list (which could
 *  be less than the number in the bundle)
 */
function setSavedQRList(bundle) {
  // Create some lookup maps for the included Questionnaires.
  const urlToQ = {}, qIdToQ = {};
  bundle.entry.forEach((entry) => {
    const res = entry.resource;
    if (res.resourceType === 'Questionnaire') {
      if (res.url)
        urlToQ[url] = res;
      qIdToQ[res.id] = res;
    }
  });

  const listItemDiv = document.getElementById('qrListItems');
  if (!savedQRItemTemplate_) {
    // Then the template is still sitting in the DOM.
    savedQRItemTemplate_ = listItemDiv.firstElementChild;
    savedQRItemTemplate_.style.display = '';
    listItemDiv.removeChild(savedQRItemTemplate_);
  }
  let listCount = 0;
  listItemDiv.innerText  = ''; // erase current list
  bundle.entry.forEach((entry) => {
    const res = entry.resource;
    if (res.resourceType === 'QuestionnaireResponse') {
      // Find the Questionnaire
      let q = urlToQ[res.questionnaire];
      if (!q) {
        // Hope .questionnaire ends with the Questionnaire ID
        const qRefURL =  (res.questionnaire && res.questionnaire.reference) ?
          res.questionnaire.reference : // STU3
          res.questionnaire; // R4+
        if (qRefURL) {
          const qId = qRefURL.split(/\//).pop();
          if (qId)
            q = qIdToQ[qId];
        }
      }
      if (q) { // We can't display a response without the Questionnaire
        const qrItemElem = savedQRItemTemplate_.cloneNode(true);
        const itemChildren = qrItemElem.children;
        const qrName = itemChildren.item(0);
        qrName.innerText = getQName(q);
        const qrUpdated = itemChildren.item(1);
        var updated;
        if (res.meta && res.meta.lastUpdated) {
          updated = new Date(res.meta.lastUpdated).toString();
        }
        else if (res.authored) {
          updated = new Date(res.authored).toString();
        }
        if (updated)
          qrUpdated.innerText = updated;
        listItemDiv.appendChild(qrItemElem);
        ++listCount;
        qrItemElem.addEventListener('click', () => {
          selectItemAfterPromise(qrItemElem, ()=>showSavedQQR(q, res));
        });
      }
    }
  });

  // Set the state of the next/prev page buttons
  processPagingLinks("QuestionnaireResponse", bundle.link);
  setEnabled(qrPrevPage_, !!pagingLinks_.QuestionnaireResponse.previous);
  setEnabled(qrNextPage_, !!pagingLinks_.QuestionnaireResponse.next);

  return listCount;
}


/**
 *  Loads (or reloads) the saved Questionnaire list.
 * @return a Promise that resolves to the number of Questionnaires in
 *  the list if the attempt to load has completed successfully.
 */
function loadSavedQList() {
  const savedQListMsg = document.getElementById('savedQListMsg');
  let rtn;
  try {
    util.show(savedQListMsg);
    savedQListMsg.innerText = 'Loading Questionnaires from server...';
    rtn = fhirService.getAllQ().then((resp) => {
      let count = 0;
      if (!resp.entry?.length) {
        savedQListMsg.innerText =
          'No saved Questionnaire resources were found.  Try uploading one.';
      }
      else {
        count = setSavedQList(resp);
      }
      util.hide(savedQListMsg);
      return count;
    });
  }
  catch(e) {
    savedQListMsg.innerText = 'Unable to retrieve saved Questionnaires.';
    rtn = Promise.reject(e);
  }
  return rtn;

}


/**
 *  Sets the list of saved Questionnaires to contain the given
 *  Questionnaires, but does not change the state of the side bar visibility.
 * @param bundle a bundle of Questionnaires.
 * @return the number of Questionnaires added to the list.
 */
function setSavedQList(bundle) {
  const listItemDiv = document.getElementById('qListItems');
  if (!savedQItemTemplate_) {
    // Then the template is still sitting in the DOM.
    savedQItemTemplate_ = listItemDiv.firstElementChild;
    savedQItemTemplate_.style.display = '';
    listItemDiv.removeChild(savedQItemTemplate_);
  }
  let listCount = 0;
  listItemDiv.innerText  = ''; // erase current list
  bundle.entry.forEach((entry) => {
    const res = entry.resource;
    if (res.resourceType === 'Questionnaire') {
      const qItemElem = savedQItemTemplate_.cloneNode(true);
      const itemChildren = qItemElem.children;
      const qName = itemChildren.item(0);
      qName.innerText = getQName(res);
      const qUpdated = itemChildren.item(1);
      var updated;
      if (res.meta && res.meta.lastUpdated) {
        updated = new Date(res.meta.lastUpdated).toString();
      }
      else if (res.authored) {
        updated = new Date(res.authored).toString();
      }
      if (updated)
        qUpdated.innerText = updated;
      listItemDiv.appendChild(qItemElem);
      ++listCount;
      qItemElem.addEventListener('click', () => {
        selectItemAfterPromise(qItemElem, ()=>showSavedQuestionnaire(res));
      });
    }
  });

  // Set the state of the next/prev page buttons
  processPagingLinks("Questionnaire", bundle.link);
  setEnabled(qPrevPage_, !!pagingLinks_.Questionnaire.previous);
  setEnabled(qNextPage_, !!pagingLinks_.Questionnaire.next);

  return listCount;
}


/**
 *  Constructs the featured questionnaire list for the current server.
 * @return the number of features questionnaires
 */
function initFeaturedList() {
  const listFeaturedQ = fhirService.getFeaturedQs();
  let count = 0;
  if (listFeaturedQ?.length) {
    count = listFeaturedQ.length;
    const listItemDiv = document.getElementById('fqList');
    let featuredItemTemplate = listItemDiv.firstElementChild;
    featuredItemTemplate.style.display = '';
    listItemDiv.removeChild(featuredItemTemplate);
    listFeaturedQ.forEach((fqData)=>{
      const featuredItemElem = featuredItemTemplate.cloneNode(true);
      const itemChildren = featuredItemElem.children;
      const qName = itemChildren.item(0);
      let name = fqData.name;
      if (fqData.code)
        name += '['+fqData.code+']';
      qName.innerText = name;
      listItemDiv.appendChild(featuredItemElem);
      featuredItemElem.addEventListener('click', () => {
        selectItemAfterPromise(featuredItemElem, ()=>showFeaturedQ(fqData.id));
      });
    });
    util.show(document.getElementById('featuredQs'));
  }
  return count;
}


/**
 *  Sets the enabled state of a button or form control.
 * @param btn the button to enable/disable
 * @param enabled true if the button should be enabled.
 */
function setEnabled(btn, enabled) {
  if (enabled)
    btn.removeAttribute('disabled');
  else
    btn.setAttribute('disabled', true);
}


/**
 *  Unselects the current sidebar item, and selects the given item if the given promise
 *  returns successfully.
 * @param newItem the item to be selected
 * @param p (optional) a function returning a promise on which to wait for successful resolution.
 */
function selectItemAfterPromise(newItem, p) {
  if (selectedItem_)
    selectedItem_.classList.remove("active");
  if (p) {
    p().then(()=>{
      selectedItem_ = newItem;
      if (selectedItem_)
        selectedItem_.classList.add("active");
    });
  }
}


/**
 *  Returns a display name for a Questionnaire resource.
 * @param q the Questionnaire resource
 */
function getQName(q) {
  var title = q.title || q.name || (q.code && q.code.length && q.code[0].display);
  // For LOINC only, add the code to title
  if (q.code && q.code.length) {
    var firstCode = q.code[0];
    if (firstCode.system == "http://loinc.org" && firstCode.code) {
      if (!title)
        title = '';
      title += ' ['+firstCode.code+']';
    }
  }
  if (!title)
    title = 'Untitled, #'+q.id;
  return title;
}


/**
 * Show a saved QuestionnaireResponse
 * @param q the Questionnaire for the response
 * @param qr the QuestionnaireResponse
 * @return a Promise that resolves if the form is successfully shown.
 */
function showSavedQQR(q, qr) {
  // merge the QuestionnaireResponse into the form
  var fhirVersion = fhirService.fhirVersion;
  var mergedFormData;
  let rtn;
  try {
    // In case the Questionnaire came from LForms, run the updater.
    let updatedQ = lformsUpdater.update(q);
    var formData = LForms.Util.convertFHIRQuestionnaireToLForms(
       updatedQ, fhirVersion);
    var newFormData = (new LForms.LFormsData(formData));
    mergedFormData = LForms.Util.mergeFHIRDataIntoLForms(
      'QuestionnaireResponse', qr, newFormData,
      fhirVersion);
  }
  catch (e) {
    formPane.showError('Sorry.  Could not process that '+
      'QuestionnaireResponse.  See the console for details.', e);
  }
  if (mergedFormData) {
    formPane.saveDeleteVisibility(true);
    // Load FHIR resources, but don't prepopulate
    rtn = formPane.showForm(mergedFormData, {prepopulate: false}, q);
  }
  else
    rtn = Promise.reject();
  return rtn;
}


/**
 *  Show a Questionnaire retrieved from the server.
 * @param q the Questionnaire to show
 * @return a Promise that resolves if the form is successfully shown.
 */
function showSavedQuestionnaire(q) {
  let formData, rtn;
  try {
    // In case the Questionnaire came from LForms, run the updater.
    let updatedQ = lformsUpdater.update(q);
    formData = LForms.Util.convertFHIRQuestionnaireToLForms(
      updatedQ, fhirService.fhirVersion);
  }
  catch(e) {
    formPane.showError('Sorry.  Could not process that '+
      'Questionnaire.  See the console for details.', e);
  }
  if (formData) {
    formPane.saveDeleteVisibility(false);
    rtn = formPane.showForm(formData, null, q);
  }
  else
    rtn = Promise.reject();
  return rtn;
};



/**
 * Get next or previous page of the search result
 * @param resType FHIR resource type
 * @param relation 'next' or 'previous' page
 */
function getPage(resType, relation) {
  var link = pagingLinks_[resType][relation];
  if (link) {
    fhirService.getPage(link).then((bundle) => {
      if (resType === "QuestionnaireResponse")
        setSavedQRList(bundle);
      else
        setSavedQList(bundle);
      announce('Updated list of '+resType+'s');
    });
  }
};


/**
 * Set the links for next/previous pages if there is one.
 * @param resType FHIR resoruce type
 * @param links the link field in a searchset bundle
 */
function processPagingLinks(resType, links) {

  var pagingLinks = {previous: null, next: null};

  for(var i=0,iLen=links.length; i<iLen; i++) {
    var link = links[i];
    if (link.relation === 'previous' || link.relation === 'next') {
      pagingLinks[link.relation] = link.url;
    }
  }
  pagingLinks_[resType] = pagingLinks;
};


/**
 *  Show a featured Questionnaire
 * @param qId The ID of the Questionnaire
 * @return a promise that resolves when the form is show.
 */
function showFeaturedQ(qId) {
  spinner.show();
  return fhirService.getFhirResourceById('Questionnaire', qId).then((q)=>{
    return showSavedQuestionnaire(q);
  }, (error) => {
    formPane.showError('Unable to show the selected Questionnaire', error);
    return Promise.reject(error);
  });
};



// TBD - below this line code should be removed or updated

/*
angular.module('lformsApp')
  .controller('NavBarCtrl', [
      '$scope', '$http', '$mdDialog', 'selectedFormData', 'fhirService',
      'FileUploader', 'userMessages', '$timeout', 'fhirServerConfig',
      function ($scope, $http, $mdDialog, selectedFormData, fhirService,
                FileUploader, userMessages, $timeout, fhirServerConfig) {

        $scope.search = {};

        // See https://github.com/nervgh/angular-file-upload/wiki/Introduction on
        // usage of angular-file-upload.
        $scope.uploader = new FileUploader({removeAfterUpload: true});

        // Featured Questionnaire (for demo)
        $scope.listFeaturedQ = fhirService.getFeaturedQs();

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
         * Callback after the item is selected in the file dialog.
         *
         * @param {Object} item - Refer to angular-file-upload for object definition.
         *   Apart from others, it has selected file reference.
         */
/*
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
              importedData = lformsUpdater.update(importedData); // call before constructing LFormsData
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
                      'Example 2:  http://hl7.org/fhir/3.0/StructureDefinition/Questionnaire'+
                      ' (for Questionnaire version 3.0).<br>'+
                      'Example 3:  http://hl7.org/fhir/uv/sdc/StructureDefinition/sdc-questionnaire|2.7.0 '+
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


        /**
         * Determines the selection-state CSS class for a form in a list
         * @param listIndex list index
         * @param formIndex form index in the list
         * @returns {string}
         */
/*
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
         * Get the initial CSS class for the section panel Check based on the data retrieved
         * from the selected FHIR server.
         * 'in' means the section panel is expanded.
         * @param listIndex list/section index
         * @returns {string} a CSS class for the section body element
         */
/*
        $scope.getSectionPanelClass = function(listIndex) {
          // if there is a list of featured questionnaires
          if ($scope.listFeaturedQ) {
            return listIndex === 0 ? 'in' : '';
          }
          // if there is a list of save questionnaire responses
          else if ($scope.listSavedQR && $scope.listSavedQR.length > 0 ) {
            return listIndex === 1 ? 'in' : '';
          }
          // if there is a list of available questionnaires
          else if ($scope.listSavedQ && $scope.listSavedQ.length > 0) {
            return listIndex === 2 ? 'in' : '';
          }
          else {
            return '';
          }
        };


        /**
         * Get the CSS class for the section title depending on whether the section is initially collapsed
         * @param listIndex list/section index
         * @returns {string} a CSS class for the section title element
         */
/*
        $scope.getSectionTitleClass = function(listIndex) {
          return $scope.getSectionPanelClass(listIndex) === 'in' ? '' : 'collapsed';
        };



        /**
         * Update the Questionnaire list when the data is returned
         */
/*
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
/*
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
/*
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
/*
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
/*
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


        /**
         * Update the Featured Questionnaires list when a new Non-SMART FHIR server is selected
         */
/*
        $scope.$on('LF_FHIR_SERVER_SELECTED', function(event) {
          $scope.listFeaturedQ = fhirService.getFeaturedQs();
          $('.spinner').hide();
        });


        // Questionnaire selected from the questionnaire dialog
        $scope.selectedQuestionnaire = null;

        /**
         * Check if the newly selected Questionnaire is different that the current Questionnaire
         * @param current the current Questionnaire
         * @param newlySelected the newly selected Questionnaire
         * @returns {*|boolean}
         */
/*
        $scope.differentQuestionnaire = function(current, newlySelected) {
          return (current && newlySelected && current.id !== newlySelected.id)
        };

      }
  ]);
*/
