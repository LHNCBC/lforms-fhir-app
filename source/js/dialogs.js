// Exports a module containing functions for dialogs, but also handles the set
// up of the dialogs for the "show data as" menu.

import { announce } from './announcer'; // for a screen reader
import { config } from './config.js';
import {fhirService} from './fhir.service.js';
import * as util from './util.js';
import 'bootstrap/js/modal.js';
import 'bootstrap/js/dropdown.js';
import { fhirServerConfig } from './fhir-server-config';

/**
 *  The version of FHIR output by this app (in the "show" dialogs).
 */
const outputFHIRVersion_ = 'R4';

/**
 *  A reference to the element into which the form will be placed.
 */
const formContainer_ = document.getElementById(config.formContainer);



export const Dialogs = {
  /**
   *  Initialization, to set up event handlers for showing dialogs.
   * @param formContainer a reference to the element containing the form.
   */
  init: function(formContainer) {
    this.formContainer_ = formContainer;

    // Handle the copy button on the dialog
    document.getElementById('copyToClipboardBtn').addEventListener('click', ()=>{
      util.copyToClipboard('message-body');
      announce('The data from the dialog has been copied to the clipboard.');
    });

    // Set up the "show data" menu items
    ['showFHIRSDCQuestionnaire', 'showFHIRSDCQuestionnaireResponse',
     'showFHIRDiagnosticReport', 'showHL7Segments'].forEach((menuID)=>{
      document.getElementById(menuID).addEventListener('click', ()=>{
        Dialogs[menuID]();
      });
    });
  },


  /**
   *  Shows a dialog for the "show data as" menu items.
   * @param title the dialog title
   * @param data the data to show
   * @param note (optional) a note to show over the data
   */
  showDataDialog: function (title, data, note) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('message-note').textContent = note || '';
    document.getElementById('message-body').textContent = data;
    // $: Bootstrap's plugins are based on jQuery
    $('#dataDialog').modal('show');
  },


  /**
   *  Shows a dialog for the message (either an error or information)
   * @param title the dialog title
   * @param msg the message to show
   */
  showMsgDialog: function (title, msg) {
    document.getElementById('msgModalTitle').textContent = title;
    document.getElementById('msgMessageBody').textContent = msg;
    announce('Showing dialog with title: ' +title);
    $('#msgDialog').modal('show');
  },

  /**
   *  Hides the general message dialog.
   */
  hideMsgDialog: function() {
    announce('Hiding dialog with title: ' +
      document.getElementById('msgModalTitle').textContent);
    $('#msgDialog').modal('hide');
  },


  /**
   *  Shows the  FHIR SDC Questionnaire data in a dialog
   * @param event
   */
  showFHIRSDCQuestionnaire: function (event) {
    var sdc = LForms.Util.getFormFHIRData('Questionnaire',
      outputFHIRVersion_, formContainer_);
    var fhirString = JSON.stringify(sdc, null, 2);
    this.showDataDialog("FHIR SDC Questionnaire Content", fhirString);
  },


  /**
   * Show FHIR SDC QuestionnaireResponse data in a dialog
   * @param event
   */
  showFHIRSDCQuestionnaireResponse: function (event) {
    var sdc = LForms.Util.getFormFHIRData('QuestionnaireResponse',
      outputFHIRVersion_, formContainer_);
    var fhirString = JSON.stringify(sdc, null, 2);
    this.showDataDialog("FHIR SDC QuestionnaireResponse Content", fhirString);
  },


  /**
   *  Shows a popup window to let user use a select or enter a FHIR server
   *  to use.
   *  Page location will be updated with query param of the selected server
   *  url, after user picks one.
   */
  showFHIRServerPicker: function () {
    const selectionFieldID = 'serverSelection';
    const selectionField = document.getElementById(selectionFieldID);
    selectionField.value = '';
    if (!selectionField.autocomp) {
      const urlOptions = fhirServerConfig.listFhirServers.map(s => s.url || s.smartServiceUrl);
      new LForms.Def.Autocompleter.Prefetch(selectionFieldID, urlOptions, {});

      // The search results list needs to be higher than the modals, so the autocompleter can be
      // used there.
      document.getElementById('searchResults').style.zIndex = "1100";

      // Set up event listeners
      document.getElementById('serverSelectBtn').addEventListener('click', ()=> {
        const selectedData = selectionField.autocomp.getSelectedItemData();
        if (selectedData?.length) {
          const urlParams = new URLSearchParams(window.location.search);
          urlParams.set('server', selectedData[0].text);
          window.location.search = urlParams;
        }
      });
    }
    $('#serverSelectDialog').modal('show');
    announce('A dialog for selecting a server is being opened');
  },


  /**
   *  Shows a popup window to let user use a search field to choose a
   *  patient from HAPI FHIR server.
   * @param callback Called when the user has dismissed the dialog.  If the user
   *  has selected a patient, the callback will be passed the patient resource.
   */
  showPatientPicker: function (callback) {
    this.patientPickerCallback = callback; // the dialog is modal
    const selectionFieldID = 'patientSelection';
    const selectionField = document.getElementById(selectionFieldID);
    selectionField.value = '';
    if (!selectionField.autocomp) {
      new LForms.Def.Autocompleter.Search(selectionFieldID, null, {
        tableFormat: true,
        colHeaders: ['Name', 'Gender', 'Birth Date'],
        valueCols: [0],
        search: (fieldVal, resultCount) => {
          return fhirService.searchPatientByName(fieldVal, resultCount);
        }
      });

      // The search results list needs to be higher than the modals, so the autocompleter can be
      // used there.
      document.getElementById('searchResults').style.zIndex = "1100";

      // Set up event listener for the select button
      document.getElementById('psSelectBtn').addEventListener('click', ()=> {
        const selectedData = selectionField.autocomp.getSelectedItemData();
        if (selectedData?.length) {
          this.patientPickerCallback(selectedData[0].data?.resource);
        }
      });

    }
    this.hideMsgDialog();
    $('#patientSelectDialog').modal('show');
    announce('A dialog for selecting a patient is being opened');
  }


}

