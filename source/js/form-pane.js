import {config} from './config.js';
import { announce } from './announcer'; // for a screen reader
import * as util from './util'
import {spinner} from './spinner.js';

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
 * A reference to the save button.
 */
const saveButton_ = document.getElementById('btn-save');

/**
 * A reference to the delete button.
 */
const deleteButton_ = document.getElementById('btn-delete');


/**
 *  Renders the given form definition, replacing any previously shown form.
 * @param formDef either an LForms or FHIR Questionnaire form definition.
 * @param addOptions the options object for LForms.Util.addFormToPage.
 * @param hideSaveDelete hide the save and delete buttons.
 * @return a Promise that resolves when the form is successfully shown.
 */
export function showForm(formDef, addOptions, hideSaveDelete) {
  util.hide(initialMsgElem_);
  removeErrMsg();
  removeForm();
  spinner.show();
  return new Promise((resolve, reject)=> {
    try {
      LForms.Util.addFormToPage(formDef, formContainer_, addOptions).then(() => {
        spinner.hide();
        util.show(formDataControls_);

        if (hideSaveDelete) {
          util.hide(saveButton_);
          util.hide(deleteButton_);
        } else {
          util.show(saveButton_);
          util.show(deleteButton_);
        }
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
