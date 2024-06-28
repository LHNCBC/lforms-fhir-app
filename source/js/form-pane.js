import {config} from './config.js';
import { announce } from './announcer'; // for a screen reader
import * as util from './util'
import {spinner} from './spinner.js';
import 'bootstrap/js/dropdown.js';
import {Dialogs} from './dialogs.js';
import {fhirService} from './fhir.service.js';
import lformsUpdater from 'lforms-updater';

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

/**
 *  The QuestionnaireResponse last saved for the current form in originalQDef_,
 *  or null/undefined.  This should always point to originalQDef_ via its
 *  questionnaire propety.
 */
let lastSavedQR_;


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
  ()=>createQRToFhir());
document.getElementById('saveAsQRExtracted').addEventListener('click',
  ()=>saveAsQRExtracted());

// "Save" button
document.getElementById('btn-save').addEventListener('click',
  ()=>updateQRToFhir());

// "Delete" button
document.getElementById('btn-delete').addEventListener('click',
  ()=>deleteQRObs());


/**
 *  Renders the given form definition, replacing any previously shown form.
 * @param formDef either an LForms or FHIR Questionnaire form definition.  If
 *  onServer is true, this should be the copy from the server.
 * @param addOptions the options object for LForms.Util.addFormToPage.
 * @param onServer true if the Questionnaire definition is on the current FHIR
 *  server. (Default: false)
 * @return a Promise that resolves when the form is successfully shown.
 */
export function showForm(formDef, addOptions, onServer) {
  util.hide(initialMsgElem_);
  removeErrMsg();
  removeForm();
  originalQDef_ = null;
  lastSavedQR_ = null;
  spinner.show();
  const formDefParam = formDef;
  formDef = lformsUpdater.update(formDef);

  let rtn;

  if (formDef) {
    if (onServer) {
      originalQDef_ = formDefParam;
      lastSavedQR_ = addOptions?.questionnaireResponse;
    }
    saveDeleteVisibility(!!addOptions?.questionnaireResponse);
    setFromServerMenuItemVisibility();
    rtn = new Promise((resolve, reject)=> {
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
          reject(error);
        });
      } catch (e) {
        showError('Could not display the form.', e);
        reject(e);
      };
    });
  }
  return rtn;
}


/**
 *  Removes any visible form and shows the given error message.
 * @param msg the error message to show
 * @param error (optional) an Error that was thrown to report the problem.
 */
export function showError(msg, error) {
  removeForm();
  originalQDef_ = null;
  lastSavedQR_ = null;
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
      saveDeleteVisibility(true);
    }
    else {
      var q = LForms.Util.getFormFHIRData('Questionnaire',
        fhirService.fhirVersion, formContainer_)
      delete q.id;
      try {
        saveResults = await fhirService.createQQR(q, qr);
        if (saveResults[0].resourceType === 'Questionnaire')
          originalQDef_ = saveResults[0];
        saveDeleteVisibility(true);
      }
      catch(qqrError) {
        console.log(qqrError);
        saveResults = [qqrError];
      }
      notifyQRSaveOrDelete();
      notifyQSaveOrDelete();
    }
    updateCurrentQQRRefs(saveResults);
    Dialogs.showSaveResultsDialog(saveResults);
  }
  catch(error) {
    console.log(error);
    Dialogs.showSaveResultsDialog([error]);
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

  let saveResults;
  try {
    saveResults = await fhirService.createQQRObs(qData, qr, resArray, qExists);
    updateCurrentQQRRefs(saveResults);
    saveDeleteVisibility(true);
  }
  catch(error) {
    console.log(error);
    saveResults = [error];
  }
  // Notify regarding updates to the QR & Q saved lists, though if there was an
  // error there might not be an update.
  notifyQRSaveOrDelete();
  if (!qExists)
    notifyQSaveOrDelete();

  Dialogs.showSaveResultsDialog(saveResults);
}


/**
 *  Updates the references to the current Questionnaire and
 *  QuestionnaireReferences.
 * @param saveResults An array of save results, which might contain the saved
 *  Questionnaire and/or saved QuestionnaireResponse.
 */
function updateCurrentQQRRefs(saveResults) {
  const resType0 = saveResults[0].resourceType;
  if (resType0 === 'Questionnaire') {
    originalQDef_ = saveResults[0];
    if (saveResults[1].resourceType === 'QuestionnaireResponse') {
      lastSavedQR_ = saveResults[1];
    }
  }
  else if (resType0 === 'QuestionnaireResponse') {
    lastSavedQR_ = saveResults[0];
  }
}


/**
 * Update the form data as a QuestionnaireResponse on the selected FHIR server
 */
function updateQRToFhir() {
  if (lastSavedQR_) { // The questionnaire should be already saved
    spinner.show();
    var qr = LForms.Util.getFormFHIRData('QuestionnaireResponse',
      fhirService.fhirVersion, formContainer_, {subject: fhirService.getCurrentPatient()});
    fhirService.setQRRefToQ(qr, originalQDef_);
    qr.id = lastSavedQR_.id; // id must stay the same
    fhirService.fhir.update(qr).then((saveResults)=>{
      updateCurrentQQRRefs([saveResults]);
      notifyQRSaveOrDelete();
      Dialogs.showSaveResultsDialog([saveResults]);
    }, (error)=>Dialogs.showSaveResultsDialog([error]));
  }
};


/**
 * Delete the currently selected QuestionnaireResponse and any extracted
 * Observations.
 */
function deleteQRObs() {
  if (lastSavedQR_) { // The questionnaire should be already saved
    let confirmMsg = "Are you sure you want to delete the currently displayed QuestionnaireResponse, and "+
      "any Observations that were extracted from it?";
    if (window.confirm(confirmMsg)) {
      spinner.show();
      removeForm();
      fhirService.deleteQRespAndObs(lastSavedQR_.id).then(()=>{
        announce('Deletion succeeded');
        spinner.hide();
        util.show(initialMsgElem_);
      }, (error)=>showError('Some or all of the resources to delete could not be deleted.', error));
      originalQDef_ = null;
      lastSavedQR_ = null;
      notifyQRSaveOrDelete();
    }
  }
};
