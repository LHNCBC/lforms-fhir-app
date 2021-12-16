import {config} from './config.js';
import { announce } from './announcer'; // for a screen reader


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
 *  A reference to the spinner element.
 */
const spinner_ = document.getElementById('spinner');

/**
 *  A reference to the buttons and menus avialbale when a form is showing.
 */
const formDataControls_ = document.getElementById('formDataControls');



/**
 *  Renders the given form definition, replacing any previously shown form.
 * @param formDef either an LForms or FHIR Questionnaire form definition.
 */
export function showForm(formDef) {
  hide(initialMsgElem_);
  removeErrMsg();
  removeForm();
  show(spinner_);
  try {
    LForms.Util.addFormToPage(formDef, formContainer_).then(() => {
      hide(spinner_);
      show(formDataControls_);
      announce('A form is now displayed in the main content area, '+
        ' along with a save button and a menu for showing the form data.');
    }, (error)=>{
      console.log(error);
      showError('Could not display the form.', error);
    });
  } catch (e) {
    showError('Could not process the file.', e);
  };
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
  show(errMsgElem_);
  hide(spinner_);
}


/**
 *  Removes the error message displayed (if any).
 */
function removeErrMsg() {
  hide(errMsgElem_);
  errMsgElem_.textContent = '';
}


/**
 *  Removes the form displayed (if any)
 */
function removeForm() {
  hide(formDataControls_);
  formContainer_.textContent = '';
}



/**
 *  Hides an element.
 * @param elem the element to hide.
 */
function hide(elem) {
  elem.style.display = 'none';
}


/**
 *  Shows a element (by setting display to block, unless the second parameter is
 *  provided.
 * @param elem the element to show.
 * @param displaySetting (optional, default 'block') the setting for 'display'
 */
function show(elem, displaySetting) {
  displaySetting ||= 'block';
  elem.style.display = displaySetting;
}


