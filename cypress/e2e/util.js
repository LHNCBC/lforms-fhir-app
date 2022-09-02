// Helper functions for the tests.
var EC = protractor.ExpectedConditions;

var autoCompBasePage = require("../node_modules/autocomplete-lhc/test/protractor/basePage").BasePage;
var autoCompHelpers = new autoCompBasePage();
const fs = require('fs');
const sAgent = require('superagent');
const https = require('https');

// Tag created resources with a unique tag.
const tagCode = 'LHC-Forms-Test'
const tagUnique = tagCode+'-'+Math.floor(Math.random() * 1000000);
const tagSystem = 'https://lhcforms.nlm.nih.gov'

let util = {
  /**
   *  The main page of the app.
   */
  mainPageURL: '/lforms-fhir-app/',

  /**
   * By default, protractor expects it to be angular application. This is used
   * to switch between angular and non angular sites.
   *
   * @param {Boolean} flag
   * @returns {Void}
   */
  setAngularSite: function(flag){
    browser.ignoreSynchronization = !flag;
  },


  /**
   *  Erases the value in the given field.  Leaves the focus in the field
   *  afterward.
   */
  clearField: autoCompHelpers.clearField,

  /**
   *  A replacement for sendKeys that only sends events for the final character
   *  in the string.
   */
  sendKeys: function(field, str) {
    browser.executeScript('arguments[0].value = "'+str.slice(0,-1)+'"', field.getWebElement());
    field.sendKeys(str.slice(-1));
    field.sendKeys(protractor.Key.ARROW_LEFT);
    browser.sleep(20); // give the autocompleter time to process the last key
  },


  /**
   *  Waits for a new window to open after calling the provided function.
   * @param action a function which should trigger the opening of a new window.
   * @return a promise for when the window has opened
   */
  waitForNewWindow: function(action) {
    return browser.getAllWindowHandles().then(function(oldHandles) {
      let oldNumHandles = oldHandles.length;
      action();
      browser.wait(function () {
        return browser.getAllWindowHandles().then(function(newHandles) {
          return newHandles.length > oldNumHandles;
        });
      });
    });
  },

  /**
   *  Switches to the newest window and runs the provided function in that context.
   * @param fn the function to be run against he new window.
   * @return Retuns a promise that resolves to whatever fn returns
   */
  runInNewestWindow: function(fn) {
    browser.sleep(1000); // sometimes going to the new window too soon prevents the window from loading
    return browser.getAllWindowHandles().then(function(handles) {
      let newWindowHandle = handles[handles.length-1];
      return browser.switchTo().window(newWindowHandle).then(function () {
        return fn();
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

    util.setAngularSite(false);
    browser.get('https://lforms-smart-fhir.nlm.nih.gov/?auth_error=&fhir_version_1='+ fhirVersion +
      '&fhir_version_2='+ fhirVersion + '&iss=&launch_ehr=1&'+
      'patient=&prov_skip_auth=1&provider=&pt_skip_auth=1&public_key=&sb=&sde=&'+
      'sim_ehr=0&token_lifetime=15');
    let launchURL = element(by.id('launch-url'));
    util.clearField(launchURL);
    this.sendKeys(launchURL, 'http://localhost:8000/lforms-fhir-app/launch.html');
    let launchButton = element(by.id('ehr-launch-url'));
    this.waitForNewWindow(function() {launchButton.click()});
    this.runInNewestWindow(function() {
      var EC = protractor.ExpectedConditions;
      // The following lines were for the case where the application is running
      // inside an frame.  I changed the URL above to not launch the application
      // that way, because the test app is http, and the URL above is https.
      //let iframe = $('#frame');
      //browser.wait(EC.presenceOf(iframe), 2000);
      //browser.switchTo().frame(iframe.getWebElement());

      // practitioner login
      let loginButton = element(by.css("button"))
      browser.wait(EC.elementToBeClickable(loginButton), 4000);
      loginButton.click();
      // patient search
      var searchField = $('#search-text');
      browser.wait(EC.presenceOf(searchField), 4000);
      searchField.sendKeys('Daniel');
      $('input[type=submit]').click();
      let patient = element(by.id('patient-smart-1186747'));
      browser.wait(EC.presenceOf(patient), 4000);
      patient.click();
      // Wait for the server resources to finish loading.
      var EC = protractor.ExpectedConditions;
      browser.wait(EC.presenceOf($('#collapse-three')), 2000);
      // Wait for the Loading message to go away
      browser.wait(EC.not(EC.textToBePresentInElement($('#collapse-three'),
        "Loading")));
    });
  },


  /**
   *  The input element for uploading files.
   */
  fileInput: element(by.css('input[type=file]')),

  /**
   *  Uploads the requested form from the e2e-tests/data directory.
   *  Note: Consider using uploadFormWithTitleChange instead, which both
   *  modifies the title and tags the Questionnaire resource for easier cleanup.
   * @param formFileName the pathname to the form, relative to the test/data
   *  directory, or an absolute path.
   */
  uploadForm: function(formFileName) {
    // If a form is already showing, change an attribute which we will use as a
    // test to determine whether the uploaded form renders.
    browser.executeScript('var n=$("#th_Name")[0]; if (n) n.id="zzz"');

    let qFilePath = formFileName.indexOf('/') == 0 ? formFileName :
      require('path').resolve(__dirname, 'data', formFileName);

    let upload = $('#upload');
    var EC = protractor.ExpectedConditions;
    browser.wait(EC.elementToBeClickable(upload), 2000);
    browser.executeScript('arguments[0].classList.toggle("hide")', util.fileInput.getWebElement());
    util.fileInput.sendKeys(qFilePath);
    browser.executeScript('arguments[0].classList.toggle("hide")', util.fileInput.getWebElement());
    // Wait for the form to appear, or an error
    var EC = protractor.ExpectedConditions;
    browser.wait(EC.or(EC.presenceOf($('#th_Name')), EC.presenceOf($('.error'))), 15000);
  },


  /**
   *  Temporary files removed by cleanUpTmpFiles.  These should be objects
   *  return by the "tmp" package.
   */
  _tmpFiles: [],


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
    let tmp = require('tmp');
    let tmpObj = tmp.fileSync();
    this._tmpFiles.push(tmpObj);
    let qFilePath = require('path').resolve(__dirname, 'data', formFilePath);
    let qData = JSON.parse(fs.readFileSync(qFilePath));
    qData.title = prefix + qData.title;
    qData.name = prefix + qData.name;
    qData.identifier[0].value = prefix + qData.identifier[0].value;
    qData.code[0].display = prefix + qData.code[0].display;
    qData.code[0].code = prefix + qData.code[0].code;
    util.tagResource(qData);
    fs.writeFileSync(tmpObj.name, JSON.stringify(qData, null, 2));
    util.uploadForm(tmpObj.name);
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
   *  Stores an observation on the test fhir server.  This is used to create
   *  test data for prepopulation.
   * @param fhirVer the FHIR version (R4 or STU3)
   * @param patientID the ID of the patient this Observation is for.
   * @param coding the coding of the Observation
   * @param valueType the FHIR type of the observation's value (capitalized)
   * @param value a value of type valueType
   * @return a promise that resolves when the request is completed
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
    return new Promise((resolve, reject) => {
      let respData = '';
      let options = {hostname: 'lforms-fhir.nlm.nih.gov',
        path: '/base'+fhirVer+'/Observation',
        method: 'POST', headers: {'Content-Type': 'application/fhir+json'}};
      let req = https.request(options,
       function callback(res) {
         res.on('data', (data)=>{respData+=data}); // needed or 'end' isn't called
         //res.on('end', ()=>{console.log("at end of response, "+respData); resolve(true)});
         res.on('end', ()=>resolve(true));
       });
      req.on('error', (e)=>{console.error(e); reject(e)});
      req.write(JSON.stringify(obs));
      req.end();
    });
  },


  /**
   *  Deletes temporary files that were created by the tmp package.
   */
  cleanUpTmpFiles: function() {
    for (var i=0, len=this._tmpFiles.length; i<len; ++i) {
      this._tmpFiles[i].removeCallback();
    }
  },


  /**
   *  Waits for the spinner to be gone.
   */
  waitForSpinnerStopped: function () {
    let spinner = $('.spinner');
    browser.wait(function() {
      return spinner.isDisplayed().then(function(isDisp) {
        return isDisp===false
      })
    });
    // Apparently, even waiting for the spinner is not long enough for angular
    // to finish updating elements on the page, so sleep a bit.
    browser.sleep(400);
  },


  /**
   *  Selects the server using the server dialog
   * @param serverURL the base URL of the FHIR server
   */
  selectServerUsingDialog: function(serverURL) {
    const urlField = '#serverSelection';
    browser.wait(EC.presenceOf($(urlField)), 5000);
    $(urlField).click();
    util.sendKeys($(urlField), serverURL);
    $(urlField).sendKeys(protractor.Key.TAB);
    const okayBtn = $('#serverSelectBtn');
    okayBtn.click();
    // Wait for dialog to close
    browser.wait(EC.invisibilityOf(okayBtn), 5000);
  },



  /**
   *  Closes the "save results" dialog.
   */
  closeSaveResultsDialog: function() {
    const okButton = '#closeSaveResults';
    browser.wait(EC.visibilityOf($(okButton)));
    $(okButton).click();
    browser.wait(EC.invisibilityOf($(okButton)));
  },


  /**
   *  Closes the currently displayed resource dialog.
   */
  closeResDialog: function () {
    const closeButton = $('#closeDataDialog');
    browser.wait(EC.visibilityOf(closeButton));
    browser.wait(EC.elementToBeClickable(closeButton));
    closeButton.click();
    browser.wait(EC.not(EC.visibilityOf(closeButton)));
  },


  /**
   *  Sends a message to console.log after waiting its turn in the protractor
   *  promise queue.
   * @param msg the message to log.
   */
  log: function (msg) {
    // See https://stackoverflow.com/questions/24564489/how-do-you-add-a-promise-to-the-flow-control-queue-using-protractor
    // for this and other solutions.
    browser.sleep(1).then(()=>console.log(msg));
  },


  /**
   * Get the URL of the save QuestionnaireResponse (the first in the list)
   * @returns a promise
   */
  getQRUrlFromDialog: function() {
    var link = element(by.css('li a'));
    browser.wait(EC.presenceOf(link), 1000);
    return link.getAttribute('href')
  },


  /**
   * Returns a promise that resolves a resource on a FHIR server
   * @param url the url of a resource on a FHIR server.
   */
   getResouceByUrl: function(url) {
    return sAgent.get(url).then(res => {
      return res.body
    });
  },


  /**
   *  Saves the current form as a questionnaire response.
   */
  saveAsQR: function() {
    let saveAs = $('#btn-save-as');
    browser.wait(EC.visibilityOf(saveAs), 2000);
    saveAs.click();
    $('#createQRToFhir').click();
  },


  /**
   *  Saves the current form as a questionnaire response.
   */
  saveAsQRAndObs: function() {
    let saveAs = $('#btn-save-as');
    browser.wait(EC.visibilityOf(saveAs), 2000);
    saveAs.click();
    $('#saveAsQRExtracted').click();
  },


  /**
   *  Selects the given item from the "show" menu.
   */
  clickShowMenuItem: function (showItemCSS) {
    const showMenu = $('#btn-show-as');
    showMenu.click();
    const showItem = $(showItemCSS);
    browser.wait(EC.visibilityOf(showItem), 2000);
    browser.wait(EC.elementToBeClickable(showItem));
    showItem.click();
  },


  /**
   *  Shows the current Questionnaire's definition from the server.
   */
  showAsQuestionnaireFromServer: function () {
    util.clickShowMenuItem('#showOrigFHIRQuestionnaire');
  },

  /**
   *  Shows the current Questionnaire's definition as generated by LHC-Forms.
   */
  showAsQuestionnaire: function () {
    util.clickShowMenuItem('#showFHIRSDCQuestionnaire');
  },

  /**
   *  Shows the QuestionnaireResponse for the currently displayed Questionnaire.
   */
  showAsQuestionnaireResponse: function() {
    util.clickShowMenuItem('#showFHIRSDCQuestionnaireResponse');
  },


  /**
   *  Deletes the currently displayed QuestionnaireResponse.
   */
  deleteCurrentQR: function() {
    let deleteBtn = $('#btn-delete');
    browser.wait(EC.presenceOf(deleteBtn), 4000);
    deleteBtn.click();
    browser.wait(EC.alertIsPresent(), 2000);
    browser.switchTo().alert().accept(); // https://stackoverflow.com/a/31667699/360782
    util.waitForSpinnerStopped();
  },


  /**
   *  Returns a promise that resolves to an array of IDs of resources returned
   *  by a given query.  Used by deleteTestResources.
   * @param query the query to run against a FHIR server.
   */
  _findResourceIds: function(query) {
    query += '&_total=accurate';
    return sAgent.get(query).set('Cache-Control', 'no-cache').then(res => {
      let entries = res.body.entry;
      const reportedTotal = res.body.total;
      if (reportedTotal && (entries?.length !== reportedTotal)) {
        // Sometimes HAPI reports a number of resources, but does not include
        // them.  This might have been due to a caching issue, addressed above by
        // setting a Cache-Control header, but I am leaving this here in case we
        // see the problem again.
        console.log("For "+query+" the server reported a total of "+res.body.total+
          " resources, but "+entries?.length+" were returned. Retrying.");
        return new Promise((resolve) => {
          setTimeout(()=>resolve(util._findResourceIds(query)), 10000);
        });
      }
      else {
        return entries ? entries.map(e=>e.resource.id) : [];
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
    util.log("Deleting resources created by these tests.");
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
   *  The tests here do not interact with a FHIR server, so we need to dismiss that selection box.
   */
  dismissFHIRServerDialog: function() {
    var cancelButton = '#serverCloseBtn';
    browser.wait(EC.elementToBeClickable($(cancelButton)), 5000);
    $(cancelButton).click();
    browser.wait(EC.invisibilityOf($(cancelButton)), 5000);
  },


  /**
   * Scrolls an element's parent container such that the element is visible to the user
   * @param {ElementFinder} elementFinder - protractor object to represent the element
   * @return {Promise}
   */
  scrollIntoView: function (elementFinder) {
    return elementFinder.getWebElement().then((element) => {
      return browser.executeScript(function (element) {
        if (element.scrollIntoViewIfNeeded) {
          element.scrollIntoViewIfNeeded(true);
        } else {
          element.scrollIntoView({block: 'center'});
        }
      }, element)
    });
  },

  /**
   * Scrolls an element into view and clicks on it when it becomes clickable
   * @param {ElementFinder} elementFinder - protractor object to represent the element
   * @return {Promise}
   */
  safeClick: function (elementFinder) {
    // Borrowed Yury's code from fhir-obs-viewer.
    // Originally this used browser.wait(EC.elementToBeClickable(elementFinder), 5000)
    // Switched to the following code, which should be the same, while
    // debugging.
    return browser.wait(EC.elementToBeClickable(elementFinder), 50000).then(()=>
      this.scrollIntoView(elementFinder).then(() => elementFinder.click())
    );
    /*
    return elementFinder.isPresent().then(() => {
        elementFinder.isDisplayed().then(() => {
          return this.scrollIntoView(elementFinder).then(() => elementFinder.click()});
        })
      });
      */
  },


  /**
   *  Expands the Saved QuestionnaireResponses section.
   */
  expandSavedQRs: function() {
    $('#collapse-one').getAttribute('class').then(cls=>{
      if (!(/\bin\b/.test(cls))) {
        var toggleLink = $('#heading-one a');
        this.safeClick(toggleLink);
      }
    });
  },


  /**
   *  Expands the Available Questionnaires section.
   */
  expandAvailQs: function() {
    $('#collapse-three').getAttribute('class').then(cls=>{
      if (!(/\bin\b/.test(cls))) {
        var toggleLink = $('#heading-three a');
        this.safeClick(toggleLink);
      }
    });
    /*  Originally was the following
    browser.executeScript(function() {
      var section = $('#collapse-three')[0];
      // Test if the section is collapsed
      if (!(/\bin\b/.test(section.className))) {
        var toggleLink = $('#heading-three a')[0];
        toggleLink.click(); // does not always work
      }
    });
    */
  },


  pageObjects: {
    /**
     *  Returns an element finder for the link to show the first saved
     *  questionnaire, or if provided, the first one that matches the given
     *  text.
     * @param matchText the text to the returned Questionnaire should have.
     */
    firstSavedQ: function(matchText) {
      if (matchText)
        return element(by.cssContainingText('#qList a.list-group-item', matchText));
      else
        return $('#qList a.list-group-item:first-child')
    },

    /**
     *  Returns an element finder for the link to show the first saved
     *  QuestionnaireResponse, or if provided, the first saved
     *  QuestionnaireResponse whose label contains the given text.
     * @param matchText the text to the returned QR should have.
     */
    firstSavedQR: function(matchText) {
      if (matchText)
        return element(by.cssContainingText('#qrList a.list-group-item', matchText));
      else
        return $('#qrList a.list-group-item:first-child')
    },

    /**
     *  Returns an element finder for the link to show the first saved USSG
     *  questionnaire.
     */
    firstSavedUSSGQ: function() {
      return element(by.cssContainingText('#qList a.list-group-item', 'Surgeon'));
    },

    /**
     *  Returns an element finder for the message body of the resource dialog.
     */
    resDialogBody: function () {
      return $('#messageBody');
    },

    /**
     *  The autocompletion list.
     */
    answerList: $('#searchResults'),

    /**
     *  The initial message element that says something like "Please select a
     *  form".
     */
    initialMessageDiv: $('div.initial')

  },

  autoCompHelpers: autoCompHelpers
}
module.exports = util;
