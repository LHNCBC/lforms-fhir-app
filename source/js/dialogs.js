// Exports a module containing functions for dialogs, but also handles the set
// up of the dialogs for the "show data as" menu.

import { announce } from './announcer'; // for a screen reader
import { config } from './config.js';
import {fhirService} from './fhir.service.js';
import * as util from './util.js';
import 'bootstrap/js/modal.js';
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
   */
  init: function() {
    // Handle the copy button on the dialog
    document.getElementById('copyToClipboardBtn').addEventListener('click', ()=>{
      util.copyToClipboard('messageBody');
      announce('The data from the dialog has been copied to the clipboard.');
    });
  },


  /**
   *  Shows a dialog for the "show data as" menu items.
   * @param title the dialog title
   * @param data the data to show
   * @param note (optional) a note to show over the data
   */
  showDataDialog: function (title, data, note) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('messageNote').textContent = note || '';
    document.getElementById('messageBody').textContent = data;
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
   *  resource of a given type from HAPI FHIR server.
   * @param resType the name of the FHIR Resource type
   * @param autocompOpts options to pass to the autocompleter for the field.
   *  These should be configured so that "resource" is an extra data field
   *  returned by the the autocompleter's getSelectedItemData() function.
   * @return a Promise that resolves when the user has dismissed the dialog.  If
   *  the user selects a Questionnaire, the Promise will resolve to the
   *  Questionnaire resource; otherwise it will resolved to undefined.
   */
  showResourcePicker: function (resType, autocompOpts) {
    const selectionFieldID = 'resSelection';
    const selectionField = document.getElementById(selectionFieldID);
    selectionField.value = '';
    if (selectionField.autocomp)
      selectionField.autocomp.destroy();
    new LForms.Def.Autocompleter.Search(selectionFieldID, null, autocompOpts);

    document.getElementById('resModalTitle').textContent = resType + ' Picker';
    resType = resType.toLowerCase();
    document.getElementById('resSelLabel').textContent = 'Choose a '+resType+ ':';
    document.getElementById('resSelection').placeholder = 'Search for '+resType+'s by name';

    // Set up event listeners for the buttons
    const dialog = $('#resSelectDialog');
    this.selectButtonClicked = false;
    if (!this.resPickerResolve_) { // if we haven't opened this before
      const selectButton = document.getElementById('resSelectBtn');
      let selectButtonClicked = false; // whether it was the most recent button clicked
      selectButton.addEventListener('click', ()=>{selectButtonClicked = true});
      dialog.on('hide.bs.modal', (e) => {
        // Only take special action if the "select" button was the cause of the close
        if (selectButtonClicked) {
          selectButtonClicked = false; // reset the flag
          const selectedData = selectionField.autocomp.getSelectedItemData();
          // Make sure the user has not changed the field to an non-list value
          if (selectedData?.length && (selectedData[0].text === selectionField.value))
            this.resPickerResolve_(selectedData[0].data?.resource);
          else
            e.preventDefault();
        }
      });
      const closeBtn = document.getElementById('resCloseBtn');
      closeBtn.addEventListener('click', ()=>this.resPickerResolve_());
    }

    // The search results list needs to be higher than the modals, so the autocompleter can be
    // used there.
    document.getElementById('searchResults').style.zIndex = "1100";

    this.hideMsgDialog();
    dialog.modal('show');
    announce('A dialog for selecting a '+resType+' is being opened');

    return new Promise((resolve, reject) => {
      this.resPickerResolve_ = resolve;
    });
  },


  /**
   *  Shows a popup window to let user use a search field to choose a
   *  patient from HAPI FHIR server.
   * @return a Promise that resolves when the user has dismissed the dialog.  If
   *  the user selects a Questionnaire, the Promise will resolve to the
   *  Questionnaire resource; otherwise it will resolved to undefined.
   */
  showPatientPicker: function () {
    return this.showResourcePicker('Patient', {
      tableFormat: true,
      matchListValue: true,
      colHeaders: ['Name', 'Gender', 'Birth Date'],
      valueCols: [0],
      search: (fieldVal, resultCount) => {
        return fhirService.searchPatientByName(fieldVal, resultCount);
      }
    });
  },


  /**
   * Show a popup window to let user use a search field to choose a Questionnaire from HAPI FHIR server
   * @return a Promise that resolves when the user has dismissed the dialog.  If
   *  the user selects a Questionnaire, the Promise will resolve to the
   *  Questionnaire resource; otherwise it will resolved to undefined.
   */
  showQuestionnairePicker: function () {
    return this.showResourcePicker('Questionnaire', {
      matchListValue: true,
      search: (fieldVal, resultCount) => {
        return fhirService.searchQuestionnaire(fieldVal, resultCount);
      }
    });
  },


  /**
   * Show the original FHIR Questionnaire data from FHIR server in a dialog
   * @param qFromServer the unmodified Questionnaire definition from the server for the current form
   */
  showOrigFHIRQuestionnaire: function (qFromServer) {
    var fhirString = JSON.stringify(qFromServer, null, 2);
    const dialogTitle = "Questionnaire Resource from FHIR Server";

    // Insert a link (safely) to the server URL for the resource
    var serverBaseURL = fhirService.getServerServiceURL();
    const fhirParts = fhirString.split(/^(  "id": ")([^"+])(")/);
    if (fhirParts.length === 1) {
      // In this case we couldn't find the ID line.  Give up on the link.
      this.showDataDialog(dialogTitle, fhirString);
    }
    else {
      this.showDataDialog(dialogTitle, '');
      const fhirResElem = document.getElementById('message-body')
      fhirResElem.innerHTML='<span></span><span></span><span></span>';
      const spans = fhirResElem.children;
      spans[0].textContent = fhirParts[0] + fhirParts[1];
      const resID=fhirParts[2];
      spans[1].innerHTML = '<a href="'+serverBaseURL+'/Questionnaire/'+
        encodeURIComponent(resID)+'" target=_blank rel="noopener noreferrer">'+
        escapeHtml(resID)+'</a>';
      spans[2].textContent=fhirParts[3] + fhirParts[4];
    }
  }

};

Dialogs.init();

