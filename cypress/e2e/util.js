const sAgent = require('superagent');

// Tag created resources with a unique tag.
const tagCode = 'LHC-Forms-Test'
const tagUnique = tagCode+'-'+Math.floor(Math.random() * 1000000);
const tagSystem = 'https://lhcforms.nlm.nih.gov';

export const util = {
  /**
   *  The main page of the app.
   */
  mainPageURL: '/lforms-fhir-app/',

  /**
   *  The tests here do not interact with a FHIR server, so we need to dismiss that selection box.
   */
  dismissFHIRServerDialog: function () {
    cy.get('#serverCloseBtn')
        .should('be.visible')
        .click()
        .should('not.be.visible');
  },

  /**
   *  Uploads the requested form from the e2e-tests/data directory.
   *  Note: Consider using uploadFormWithTitleChange instead, which both
   *  modifies the title and tags the Questionnaire resource for easier cleanup.
   * @param formFileName the pathname to the form, relative to the test/data
   *  directory, or an absolute path.
   * @param isFixture whether formFileName is a Cypress fixture, or a full path
   * of a file on disk.
   */
  uploadForm: function(formFileName, isFixture = true) {
    cy.get('#upload')
        .should('be.visible');
    cy.get('input[type=file]')
        .invoke('attr', 'class', '');
    if (isFixture) {
      cy.fixture(formFileName)
          .as('myFixture');
      cy.get('input[type=file]')
          .selectFile('@myFixture');
    } else {
      cy.get('input[type=file]')
          .selectFile(formFileName);
    }
    cy.get('input[type=file]')
        .invoke('attr', 'class', 'hide');
    cy.get('.error', { timeout: 15000 })
        .should('exist');
  },

  /**
   *  Sets the field's value to the given text string, and picks the nth
   *  autocompletion result.
   * @param field the css selector of the autocompleting field
   * @param text the text with which to autocomplete.  This can be null or the
   *  empty string for prefetch lists.
   * @param n the number of the list item to pick (starting at 1).
   */
  autocompPickNth: function(field, text, n) {
    cy.get(field)
        .clear()
        .should('have.value', '')
        .click();
    if (text) {
      cy.get(field)
          .type(text);
    }
    cy.get('#searchResults')
        .should('be.visible');
    cy.get('#searchResults li:nth-child('+n+'), '+
        '#searchResults tr:nth-child('+n+')')
        .click();
  },

  /**
   *  Selects the server using the server dialog
   * @param serverURL the base URL of the FHIR server
   */
  selectServerUsingDialog: function(serverURL) {
    const urlField = '#serverSelection';
    cy.get(urlField)
        .should('be.visible')
        .type(serverURL)
        .blur();
    cy.get('#serverSelectBtn')
        .click();
    // Wait for dialog to close
    cy.get('#serverSelectBtn')
        .should('not.be.visible');
  },

  /**
   *  Uploads a modified form with the given prefix prepended to the form's title, so that
   *  the instance of the form can be found and selected.  This will also modify
   *  the form's first identifier, to make it unique.
   *  Also, the form will be tagged for easier cleanup of saved resources.
   * @param formFilePath the pathname to the form, relative to the test/data
   *  directory.
   * @param prefix the text to prepend to the actual form title and to the
   *  form's first identifier (so it cannot contain characters that identifer does
   *  not permit).  If not provided, a default will be used.
   */
  uploadFormWithTitleChange: function(formFilePath, prefix) {
    if (!prefix)
      prefix = tagUnique + '-';  // unique within one run of the tests
    cy.fixture(formFilePath).then((qData) => {
      qData.title = prefix + qData.title;
      qData.name = prefix + qData.name;
      qData.identifier[0].value = prefix + qData.identifier[0].value;
      qData.code[0].display = prefix + qData.code[0].display;
      qData.code[0].code = prefix + qData.code[0].code;
      this.tagResource(qData);
      cy.task('createTmpFile', JSON.stringify(qData, null, 2))
          .then((tempFilePath) => {
            this.uploadForm(tempFilePath, false);
          });
    });
  },

  /**
   *  Adds tags to a resource for later cleanup.
   * @param resource the resource object to which to add tags.
   */
  tagResource: function(resource) {
    // We use two tags.  One is a nearly unique tag which we can use for
    // automated cleanup and which should not collide with another run's tag
    // so if two test runs are being run simultaneously, one test run will not delete
    // another test run's data.
    // The second tag is always the same, so we can find any test data that gets
    // left behind such as if the tests error out without cleaning up properly.
    // (That was the plan, but currently the possibility of a test run not
    // cleaning up seems much more likely than two users running the tests
    // simultaneously, so we are really just using the first tag for cleanup for now.)
    let meta = resource.meta || (resource.meta = {});
    let tag = meta.tag || (meta.tag = []);
    tag.push({code: tagCode, system: tagSystem});
    tag.push({code: tagUnique, system: tagSystem});
  },

  /**
   *  Saves the current form as a questionnaire response.
   */
  saveAsQR: function() {
    cy.get('#btn-save-as')
        .should('be.visible')
        .click();
    cy.get('#createQRToFhir')
        .click();
  },

  /**
   *  Saves the current form as a questionnaire response.
   */
  saveAsQRAndObs: function() {
    cy.get('#btn-save-as')
        .should('be.visible')
        .click();
    cy.get('#saveAsQRExtracted')
        .click();
  },

  /**
   *  Waits for the spinner to be gone.
   */
  waitForSpinnerStopped: function () {
    cy.get('.spinner')
        .should('not.be.visible');
    // Apparently, even waiting for the spinner is not long enough for angular
    // to finish updating elements on the page, so sleep a bit.
    cy.wait(400);
  },

  /**
   *  Closes the "save results" dialog.
   */
  closeSaveResultsDialog: function() {
    cy.get('#closeSaveResults')
        .should('be.visible')
        .click();
    cy.get('#closeSaveResults')
        .should('not.be.visible');
  },

  /**
   *  Expands the Available Questionnaires section.
   */
  expandAvailQs: function() {
    cy.get('#collapse-three')
        .invoke('attr', 'class')
        .then((cls) => {
          if (!(/\bin\b/.test(cls))) {
            cy.get('#heading-three a')
                .click();
          }
        });
  },

  /**
   *  Expands the Saved QuestionnaireResponses section.
   */
  expandSavedQRs: function() {
    cy.get('#collapse-one')
        .invoke('attr', 'class')
        .then((cls) => {
          if (!(/\bin\b/.test(cls))) {
            cy.get('#heading-one a')
                .click();
          }
        });
  },

  /**
   * Get the URL of the save QuestionnaireResponse
   */
  getQRUrlFromDialog: function() {
    return cy.get('#saveResultsList li a')
        .filter(':contains("QuestionnaireResponse")')
        .eq(0)
        .invoke('attr', 'href');
  },

  /**
   * Returns a promise that resolves a resource on a FHIR server
   * @param url the url of a resource on a FHIR server.
   */
  getResouceByUrl(url) {
    return new Promise((resolve) => {
      sAgent.get(url).then(res => {
        resolve(res.body);
      });
    });
  },

  /**
   *  Opens up the SMART app in the SMART on FHIR developer sandbox.
   * @param fhirVersion the FHIR server version to be picked in SMART env.
   * It could be either 'r4' or 'r3'. The default value is 'r4'.
   */
  launchSmartAppInSandbox: function (fhirVersion) {
    if (!fhirVersion)
      fhirVersion = 'r4';
    cy.visit('https://lforms-smart-fhir.nlm.nih.gov/?auth_error=&fhir_version_1='+ fhirVersion +
        '&fhir_version_2='+ fhirVersion + '&iss=&launch_ehr=1&'+
        'patient=&prov_skip_auth=1&provider=&pt_skip_auth=1&public_key=&sb=&sde=&'+
        'sim_ehr=0&token_lifetime=15');
    cy.byId('launch-url')
        .clear()
        .type('http://localhost:8000/lforms-fhir-app/launch.html');
    cy.byId('ehr-launch-url')
        // Cypress does not allow multiple browser windows/tabs,
        // remove the 'target' attribute before opening the link.
        .invoke('removeAttr', 'target')
        .click();

    // practitioner login
    cy.get('button.btn-success')
        .click();
    // patient search
    cy.get('#search-text')
        .should('be.visible')
        .type('Daniel');
    cy.get('input[type=submit]')
        .click();
    cy.byId('patient-smart-1186747')
        .should('be.visible')
        .click();
  },

  /**
   *  Deletes the currently displayed QuestionnaireResponse.
   */
  deleteCurrentQR: function() {
    cy.get('#btn-delete')
        .should('be.visible')
        .click();
    cy.on('window:confirm', (txt) => {
      expect(txt).to.contains('Are you sure you want to delete');
    });
    util.waitForSpinnerStopped();
  },

  /**
   *  Stores an observation on the test fhir server.  This is used to create
   *  test data for prepopulation.
   * @param fhirVer the FHIR version (R4 or STU3)
   * @param patientID the ID of the patient this Observation is for.
   * @param coding the coding of the Observation
   * @param valueType the FHIR type of the observation's value (capitalized)
   * @param value a value of type valueType
   */
  storeObservation: function(fhirVer, patientID, coding, valueType, value) {
    if (fhirVer == 'STU3')
      fhirVer = 'Dstu3';  // what HAPI calls it
    const obs = {
      "resourceType": "Observation",
      "status": "final",
    }
    obs.code = {coding: [coding]};
    obs['value'+valueType] = value;
    obs.subject = {reference: "Patient/"+patientID};
    obs.effectiveDateTime = obs.issued = (new Date()).toISOString();
    util.tagResource(obs);
    cy.request({
      method: 'POST',
      url: 'https://lforms-fhir.nlm.nih.gov/base'+fhirVer+'/Observation',
      headers: {'Content-Type': 'application/fhir+json'},
      body: obs
    });
  },

  /**
   *  Returns a promise that resolves to an array of IDs of resources returned
   *  by a given query.  Used by deleteTestResources.
   * @param query the query to run against a FHIR server.
   * @param resourceIdsAlreadyReturned a list of resource IDs already returned
   */
  _findResourceIds: function (query, resourceIdsAlreadyReturned = []) {
    query += '&_total=accurate';
    return sAgent.get(query).set('Cache-Control', 'no-cache').then(res => {
      let entries = res.body.entry;
      const reportedTotal = res.body.total;
      const nextLink = res.body.link?.find(x => x.relation === 'next');
      if (nextLink) {
        // On rare occasions we end up having too many test resources but the
        // query returns a paging size of 20 with a "next" link.
        resourceIdsAlreadyReturned.push(...entries.map(e => e.resource.id));
        return util._findResourceIds(nextLink.url, resourceIdsAlreadyReturned);
      } else if (!resourceIdsAlreadyReturned.length && reportedTotal && (entries?.length !== reportedTotal)) {
        // Sometimes HAPI reports a number of resources, but does not include
        // them.  This might have been due to a caching issue, addressed above by
        // setting a Cache-Control header, but I am leaving this here in case we
        // see the problem again.
        console.log("For " + query + " the server reported a total of " + res.body.total +
          " resources, but " + entries?.length + " were returned. Retrying.");
        return new Promise((resolve) => {
          setTimeout(() => resolve(util._findResourceIds(query)), 10000);
        });
      } else {
        const newlyReturned = entries ? entries.map(e => e.resource.id) : [];
        resourceIdsAlreadyReturned.push(...newlyReturned);
        return resourceIdsAlreadyReturned;
      }
    });
  },


  /**
   *   Returns a promise that resolves when the attempts to delete the given
   *   resources have completed.
   *   This is used by deleteTestResources.
   *  @param serverURL the server base URL
   *  @param resType the resource type
   *  @param ids an array of the resource IDs to delete.
   */
  _deleteResIds: function(serverURL, resType, ids) {
    let delURLBase = serverURL + '/'+ resType + '/';
    let promises = [];
    ids.forEach(id => {
      let delURL = delURLBase+id;
      console.log("Deleting "+delURL);
      promises.push(sAgent.delete(delURL).then(delRes => {
        if (delRes.status >= 400) {
          throw 'Deletion of '+delURL+' FAILED';
        }
      }));
    });
    return Promise.all(promises);
  },


  /**
   *  Deletes resources created during testing.
   * @return a promise that resolves when the deletion attempt is done
   */
  deleteTestResources: function() {
    // A resource can't be deleted until resources that reference it are
    // deleted.  Therefore, we first delete Observations, then
    // QuestionnaireResponses, then Questionnaires, but the search starts with
    // Questionnaires that were created during testing.
    console.log("Deleting resources created by these tests.");
    const promises = [];
    const tagString = tagSystem+'%7C'+tagCode;
    for (let fhirVer of ['Dstu3', 'R4']) {
      let serverURL = 'https://lforms-fhir.nlm.nih.gov/base'+fhirVer;
      let qQuery = serverURL + '/Questionnaire?_summary=true&'+
          '_tag='+tagString;
      promises.push(this._findResourceIds(qQuery).then(qIds => {
        console.log("Found "+qIds.length+" test questionnaires to delete on "+serverURL);
        if (qIds.length) {
          // Find the QuestionaireResponses and delete those first.
          let qrQuery = serverURL +
              '/QuestionnaireResponse?_summary=true&questionnaire='+qIds.join(',');
          return this._findResourceIds(qrQuery).then(qrIds => {
            // Find any extracted Observations and delete those first, but
            // we can only do that for R4 or later.
            let obsDeleted; // a promise resolving when observations are deleted
            if (fhirVer != 'Dstu3' && qrIds.length) {
              let obsQuery = serverURL +
                  '/Observation?_summary=true&derived-from='+qrIds.join(',');
              obsDeleted = this._findResourceIds(obsQuery).then(obsIds => {
                return this._deleteResIds(serverURL, 'Observation', obsIds);
              });
            }
            else
              obsDeleted = Promise.resolve(); // no observations to delete

            return obsDeleted.then(()=> {
              let qrDeleted =
                  this._deleteResIds(serverURL, 'QuestionnaireResponse', qrIds);
              return qrDeleted.then(()=> {
                return this._deleteResIds(serverURL, 'Questionnaire', qIds);
              });
            });
          });
        }
      }));
      // Also delete the observations that were directly created by the tests
      let obsQuery = serverURL + '/Observation?_summary=true&'+
          '_tag='+tagString;
      promises.push(this._findResourceIds(obsQuery).then(obsIds => {
        if (obsIds.length) {
          return this._deleteResIds(serverURL, 'Observation', obsIds);
        }
      }));
    }
    return Promise.all(promises).catch(e => console.log(e));
  },

  /**
   *  Selects the given item from the "show" menu.
   */
  clickShowMenuItem: function (showItemCSS) {
    cy.get('#btn-show-as')
        .click()
    cy.get(showItemCSS)
        .should('be.visible')
        .click();
  },

  /**
   *  Shows the current Questionnaire's definition from the server.
   */
  showAsQuestionnaireFromServer: function () {
    this.clickShowMenuItem('#showOrigFHIRQuestionnaire');
  },

  /**
   *  Shows the current Questionnaire's definition as generated by LHC-Forms.
   */
  showAsQuestionnaire: function () {
    this.clickShowMenuItem('#showFHIRSDCQuestionnaire');
  },

  /**
   *  Shows the QuestionnaireResponse for the currently displayed Questionnaire.
   */
  showAsQuestionnaireResponse: function() {
    this.clickShowMenuItem('#showFHIRSDCQuestionnaireResponse');
  },

  /**
   *  Closes the currently displayed resource dialog.
   */
  closeResDialog: function () {
    const closeButton = '#closeDataDialog';
    cy.get(closeButton)
        .should('be.visible')
        .click();
    cy.get(closeButton)
        .should('not.be.visible');
  },


  pageObjects: {
    /**
     *  Returns the link to show the first saved questionnaire, or if
     *  provided, the first one that matches the given text.
     * @param matchText the text to the returned Questionnaire should have.
     */
    firstSavedQ: function(matchText) {
      if (matchText)
        return cy.get('#qList a.list-group-item')
            .filter(':contains("' + matchText + '")')
            .eq(0);
      else
        return cy.get('#qList a.list-group-item:first-child');
    },

    /**
     *  Returns the link to show the first saved
     *  QuestionnaireResponse, or if provided, the first saved
     *  QuestionnaireResponse whose label contains the given text.
     * @param matchText the text to the returned QR should have.
     */
    firstSavedQR: function(matchText) {
      if (matchText)
        return cy.get('#qrList a.list-group-item')
            .filter(':contains("' + matchText + '")')
            .eq(0);
      else
        return cy.get('#qrList a.list-group-item:first-child');
    },

    /**
     *  Returns the link to show the first saved USSG questionnaire.
     */
    firstSavedUSSGQ: function() {
      return cy.get('#qList a.list-group-item')
          .filter(':contains("Surgeon")')
          .eq(0);
    },

    /**
     *  The initial message element that says something like "Please select a
     *  form".
     */
    initialMessageDiv: function () {
      return cy.get('div.initial');
    }
  },


  autoCompHelpers: {
    /**
     * Wait for the autocomplete results to be shown
     */
    waitForSearchResults: function () {
      cy.get('#searchResults')
          .should('be.visible');
      cy.wait(75); // wait for autocompletion to finish to avoid a stale element
    },

    /**
     *  Returns the list item in the search results list at the given position
     *  number (starting at 1).  The returned item might be a heading.
     * @param pos the item position number (starting at 1).
     */
    searchResult: function(pos) {
      return cy.get('#searchResults' + ' li:nth-child('+pos+'), '+
          '#searchResults' + ' tr:nth-child('+pos+')');
    }
  }
}
