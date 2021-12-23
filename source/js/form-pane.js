import {config} from './config.js';
import { announce } from './announcer'; // for a screen reader
import * as util from './util'
import {spinner} from './spinner.js';
import 'bootstrap/js/dropdown.js';
import {Dialogs} from './dialogs.js';
import {fhirService} from './fhir.service.js';

/**
 *  A reference to the element into which the form will be placed.
 */
const formContainer_ = document.getElementById(config.formContainer);

/**
 *  A reference to the element for showing error messages.
 */
const errMsgElem_ = document.getElementById('errMsg');

/**
 *  A reference to the element containing the initial instructions which are
 *  removed once a form loads.
 */
const initialMsgElem_ = document.getElementById('initialMsg');

/**
 *  A reference to the buttons and menus available when a form is showing.
 */
const formDataControls_ = document.getElementById('formDataControls');

/**
 *  A reference to the form pane's DOM element.
 */
const formPane_ = document.querySelector('.form-content');

/**
 *  The unmodified Questionnaire definition from the server for the current form (if it
 *  came from the server).
 */
let originalQDef_;


// Set up the "show data" menu items
['showFHIRSDCQuestionnaire', 'showFHIRSDCQuestionnaireResponse',
 'showOrigFHIRQuestionnaire'].forEach((menuID)=>{
   document.getElementById(menuID).addEventListener('click', ()=>{
    if (menuID === 'showOrigFHIRQuestionnaire')
      Dialogs[menuID](originalQDef_);
    else
      Dialogs[menuID]();
  });
});

// Set up the "save as" menu items
document.getElementById('createQRToFhir').addEventListener('click',
  ()=>{createQRToFhir()});
document.getElementById('saveAsQRExtracted').addEventListener('click',
  ()=>{saveAsQRExtracted()});



/**
 *  Renders the given form definition, replacing any previously shown form.
 * @param formDef either an LForms or FHIR Questionnaire form definition.
 * @param addOptions the options object for LForms.Util.addFormToPage.
 * @param originalQ the unmodified Questionnaire definition if it was retrieved
 *  from the server, or undefined.
 * @return a Promise that resolves when the form is successfully shown.
 */
export function showForm(formDef, addOptions, originalQ) {
  util.hide(initialMsgElem_);
  removeErrMsg();
  removeForm();
  spinner.show();
  originalQDef_ = originalQ;
  setFromServerMenuItemVisibility();
  return new Promise((resolve, reject)=> {
    try {
      LForms.Util.addFormToPage(formDef, formContainer_, addOptions).then(() => {
        spinner.hide();
        util.show(formDataControls_);
        announce('A form is now displayed in the main content area, '+
          ' along with a save button and a menu for showing the form data.');
        resolve();
      }, (error)=>{
        console.log(error);
        showError('Could not display the form.', error);
        reject();
      });
    } catch (e) {
      showError('Could not process the file.', e);
      reject();
    };
  });
}


/**
 *  Removes any visible form and shows the given error message.
 * @param msg the error message to show
 * @param error (optional) an Error that was thrown to report the problem.
 */
export function showError(msg, error) {
  removeForm();
  errMsgElem_.textContent = msg;
  announce(msg);
  if (error) {
    console.log(error);
    const details = document.createElement("div");
    const detailMsg = 'Cause: ' + error.toString();
    details.textContent = detailMsg;
    errMsgElem_.appendChild(details);
    announce(detailMsg);
  }
  util.show(errMsgElem_);
  spinner.hide();
}


/**
 *  Registers a listener for notifications when a QuestionnaireResponse is
 *  saved, updated, or deleted.
 * @param callback a function to call when a QuestionnaireResponse is saved
 */
export function listenForQRSaveOrDelete(callback) {
  formPane_.addEventListener('qr-save', callback);
}


/**
 *  Registers a listener for notifications when a Questionnaire is
 *  saved.
 * @param callback a function to call when a QuestionnaireResponse is saved
 */
export function listenForQSave(callback) {
  formPane_.addEventListener('q-save', callback);
}


/**
 *  Notifies listeners registered with listenForQRSaveOrDelete().
 */
function notifyQRSaveOrDelete() {
  formPane_.dispatchEvent(new CustomEvent('qr-save'));
}


/**
 *  Notifies listeners registered with listenForQSave().
 */
function notifyQSaveOrDelete() {
  formPane_.dispatchEvent(new CustomEvent('q-save'));
}


/**
 *  Removes the error message displayed (if any).
 */
function removeErrMsg() {
  util.hide(errMsgElem_);
  errMsgElem_.textContent = '';
}


/**
 *  Removes the form displayed (if any)
 */
function removeForm() {
  util.hide(formDataControls_);
  formContainer_.textContent = '';
}


/**
 *  Sets the visibility of the menu item "Show Questionnaire from Server"
 */
function setFromServerMenuItemVisibility() {
  // Show the item only if we have a Questionnaire definition from the server.
  let display = originalQDef_ ? '' : 'none';
  const menuItem = document.getElementById('showFromServerItem');
  menuItem.style.display = display;
  // Also show/hide the separator following the item
  menuItem.nextElementSibling.style.display = display;
};


/*
 * Set the visibility of the save and delete buttons.
 * @param visibility - If true show the save and delete buttons.
 */
export function saveDeleteVisibility(visibility) {
  const saveDeleteGroup = document.getElementById('saveDeleteGroup');
  if (visibility) {
    util.show(saveDeleteGroup);
  } else {
    util.hide(saveDeleteGroup);
  }
}


/**
 *  Save the form data as a QuestionnaireResponse to the selected FHIR server
 */
async function createQRToFhir() {
  spinner.show();

  var qr = LForms.Util.getFormFHIRData('QuestionnaireResponse',
    fhirService.fhirVersion, formContainer_, {
    subject: fhirService.getCurrentPatient()})

  // add an author if in SMART environment
  if (fhirService.getCurrentUser() && !qr.author) {
    qr.author = fhirService.getCurrentUserReference();
  }

  try {
    let saveResults;
    if (originalQDef_) { // Questionnaire is already on server
      saveResults = [await fhirService.createQR(qr, originalQDef_)];
      notifyQRSaveOrDelete();
    }
    else {
      var q = LForms.Util.getFormFHIRData('Questionnaire',
        fhirService.fhirVersion, formContainer_)
      delete q.id;
      saveResults = await fhirService.createQQR(q, qr);
      notifyQRSaveOrDelete();
      notifyQSave();
    }
    Dialogs.showSaveResultsDialog(saveResults);
  }
  catch(error) {
    showError('Unable to complete the save.', error);
  }
};


/**
 *  Saves the data as a new copy of an SDC QuestionnaireResponse and
 *  extracted Observations.
 */
async function saveAsQRExtracted() {
  spinner.show();
  var resArray = LForms.Util.getFormFHIRData('QuestionnaireResponse',
    fhirService.fhirVersion, formContainer_, {extract: true,
    subject: fhirService.getCurrentPatient()});

  var qExists;
  if (originalQDef_) { // Questionnaire is already on server
    var qData = originalQDef_;
    qExists = true; // it is on the server already
  }
  else {
    var qData = LForms.Util.getFormFHIRData('Questionnaire',
      fhirService.fhirVersion, formContainer_)
    qExists = false;
  }
  var qr = resArray.shift();

  // add an author if in SMART environment
  if (fhirService.getCurrentUser() && !qr.author) {
    qr.author = fhirService.getCurrentUserReference();
  }

  try {
    const results = await fhirService.createQQRObs(qData, qr, resArray, qExists);
  }
  catch(error) {
    showError('Unable to complete the save.', error);
  }
  // Notify regarding updates to the QR & Q saved lists, though if there was an
  // error there might not be an update.
  notifyQRSaveOrDelete();
  if (!qExists)
    notifyQSave();
};


/**
 * Save or update the data as a QuestionnaireResponse resource
 */
function saveQRToFhir () {
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
 * Update the form data as a QuestionnaireResponse on the selected FHIR server
 * @param extensionType a flag indicate if it is a SDC type of QuestionnaireResponse
 */
function updateQRToFhir(extensionType) {
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
 * Delete the currently selected FHIR resource
 */
function deleteFromFhir() {
  $('.spinner').show();
  if ($scope.fhirResInfo.resId) {
   // fhirService.deleteFhirResource($scope.fhirResInfo.resType, $scope.fhirResInfo.resId);
    fhirService.deleteQRespAndObs($scope.fhirResInfo.resId);
  }
};



