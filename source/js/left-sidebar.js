'use strict';
// Functions and initialization for the left navigation bar.

import 'bootstrap/js/collapse.js';
import * as util from './util';
import { announce } from './announcer'; // for a screen reader
import * as formPane from './form-pane';
import {fhirService} from './fhir.service.js';
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

// Set up listeners for updates to the list of saved QuestionnaireResponses and
// Questionnaires.
formPane.listenForQRSaveOrDelete(()=>loadSavedQRList());
formPane.listenForQSave(()=>loadSavedQList());

// Search button
document.getElementById('search').addEventListener('click', ()=>{
  Dialogs.showQuestionnairePicker().then((questionnaire)=> {
    if (questionnaire)
      formPane.showForm(questionnaire, {prepopulate: true}, true);
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
        // Unset (any) selected item after showForm attempt
        selectItemAfterPromise(null,
          ()=>formPane.showForm(importedData, {prepopulate: true}));
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
  spinner.show();
  const numFeaturedQs = initFeaturedList();
  loadSavedQRList().then((qrCount) => {
    loadSavedQList().then((qCount) => {
      if (numFeaturedQs)
        document.getElementById('toggleFeaturedList').click();
      else if (qrCount)
        document.getElementById('toggleQRList').click();
      else if (qCount)
        document.getElementById('toggleQList').click();
    }).finally(()=>spinner.hide());
  }).catch(()=>spinner.hide());
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
        urlToQ[res.url] = res;
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
        name += ' ['+fqData.code+']';
      qName.innerText = name;
      qName.id = fqData.id;
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
  return formPane.showForm(q, {questionnaireResponse: qr}, true);
}


/**
 *  Show a Questionnaire retrieved from the server.
 * @param q the Questionnaire to show
 * @return a Promise that resolves if the form is successfully shown.
 */
function showSavedQuestionnaire(q) {
  return formPane.showForm(q, {prepopulate: true}, true);
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

