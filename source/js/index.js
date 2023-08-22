import {getLFormsLoadStatus} from './initLForms.js'; // first, because it takes a while
import {fhirService} from './fhir.service.js';
import './jquery-import.js'; // Needed by Bootstrap dialogs
import {Dialogs} from './dialogs.js';
import * as leftSideBar from './left-sidebar.js';
import {spinner} from './spinner.js';

// Now that enough things have loaded to show an error message, check on the
// status of loading LHC-Forms.

getLFormsLoadStatus().then(()=>establishFHIRContext(), e=>{
  spinner.hide();
  showErrorMsg('Unable to load LHC-Forms.  See the console for details.');
});


/**
 * Get the connection to FHIR server and the selected patient
 * and retrieve all the DiagosticReport resources for this patient
 * Note: Here it gets all resources in one request without a search,
 * just to make a simple demo.
 */
function establishFHIRContext() {
  const params = (new URL(document.location)).searchParams;
  const fhirServerURL = params.get('server');
  if (fhirServerURL) {
    spinner.hide();
    setServerAndPickPatient({url:fhirServerURL});
  }
  else {
    if (!fhirService.getSmartConnection() && !fhirService.smartConnectionInProgress()) {
      fhirService.requestSmartConnection(function(success) {
        if (success) {
          var smart = fhirService.getSmartConnection();
          const patientPromise = smart.patient.read().then(function (pt) {
            fhirService.setCurrentPatient(pt);
            leftSideBar.initSideBarLists();
          }).catch(e=>spinner.hide());
          const userPromise = smart.user.read().then(function(user) {
            fhirService.setCurrentUser(user);
          });
          Promise.all([patientPromise, userPromise]).then(function() {
            updateUserAndPatientBanner();
          }, function failed (msg) {
            spinner.hide();
            console.log('Unable to read the patient and user resources.');
            console.log(msg);
            console.trace();
            showErrorMsg(msg);
          });
        }
        else {
          console.log("Could not establish a SMART connection.");
          spinner.hide();
          selectServerAndPatient();
        }
      });
    }
  }
}

/**
 *  Updates the User and Patient info banner.
 */
function updateUserAndPatientBanner() {
  const patient = fhirService.getCurrentPatient();
  document.getElementById('ptName').innerText =
    'Patient: ' + fhirService.getPatientName();
  document.getElementById('ptGender').innerText =
    'Gender: ' + (patient.gender || '');
  document.getElementById('ptDoB').innerText =
    'DoB: ' + (patient.birthDate || '');
  document.getElementById('userName').innerText =
    'User: ' + fhirService.getUserName();
  document.querySelector('.lf-patient table').style.visibility = 'visible';
}


/**
 *  Opens dialogs for selecting first a FHIR server and then a patient.
 */
function selectServerAndPatient() {
  // For now get the server from an URL parameter:
  let fhirServerURL;
  if (window.location.search && URLSearchParams) {
    // IE 11 does not support URLSearchParams.  Within a year, LForms won't
    // support IE 11 because of its dependency on Angular, so there I think
    // there is no need to support this feature here for IE 11.
    fhirServerURL = (new URLSearchParams(window.location.search)).get('server');
  }
  if (fhirServerURL) {
    setServerAndPickPatient({url: fhirServerURL});
  }
  else {
    Dialogs.showFHIRServerPicker();
  }
}


/**
 *  Establishes communication with the FHIR server at the given URL, and
 *  calls the given callback with a boolean indicating whether
 *  communication was successfully established.  If it was successful, a
 *  patient selection dialog will be opened.
 * @param fhirServer configuration of the FHIR server
 * @param callback the function to call after the communication attempt.
 *  It will be passed a boolean to indicate whether the attempt was
 *  successful.
 */
function setServerAndPickPatient(fhirServer, callback) {
  showWaitMsg('Contacting FHIR server.  Please wait...');
  fhirService.setNonSmartServer(fhirServer, function(success) {
    if (callback)
      callback(success); // "success" is a boolean
    if (success) {
      Dialogs.showPatientPicker().then((patientResource) => {
        if (patientResource) {
          fhirService.setCurrentPatient(patientResource);
          fhirService.setNonSmartServerPatient(patientResource.id);
          leftSideBar.initSideBarLists();
          updateUserAndPatientBanner();
        }
      });
    }
    else {
      showErrorMsg('Could not establish communication with the FHIR server at ' +
          fhirServer.url+'.');
    }
  });
}


/**
 *  Shows a "Please Wait" message.
 * @param msg The message to show.
 */
function showWaitMsg(msg) {
  showMsg('Please Wait', msg);
};

/**
 *  Shows a error message.
 * @param msg The message to show.
 */
function showErrorMsg(msg) {
  showMsg('Error', msg);
};


/**
 *  Shows a message (text only).
 * @param title The heading for the message.
 * @param msg The message to show.
 */
function showMsg(title, msg) {
  Dialogs.showMsgDialog(title, msg);
};



