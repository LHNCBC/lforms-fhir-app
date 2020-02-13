// Helper functions for the tests.
var EC = protractor.ExpectedConditions;

var autoCompBasePage = require("../app/bower_components/autocomplete-lhc/test/protractor/basePage").BasePage;
var autoCompHelpers = new autoCompBasePage();

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
    browser.sleep(500); // sometimes going to the new window too soon prevents the window from loading
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
      $('#search-text').sendKeys('Alexis');
      $('input[type=submit]').click();
      let patient = element(by.id('patient-smart-9995679'));
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
   * @param formFileName the pathname to the form, relative to the test/data
   *  directory, or an absolute path.
   */
  uploadForm: function(formFileName) {
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
    browser.wait(EC.or(EC.presenceOf($('#th_Name')), EC.presenceOf($('.error'))), 2000);
  },


  /**
   *  Deletes the current Questionnaire, its QuestionnaireResponses, and their
   *  extracted Observations (if not STU3).  The purpose it to clean up forms
   *  that were uploaded during a test.  This assumes that there is a current
   *  questionnaire, i.e. that either a Questionnaire or saved QuestionnaireResponse
   *  is showing.
   */
  deleteCurrentQuestionnaire: function() {
    let deleteBtn = $('#deleteQBtn');
    // Make the button visible
    browser.executeScript('arguments[0].style.display=""', deleteBtn.getWebElement());
    browser.wait(EC.elementToBeClickable(deleteBtn));
    deleteBtn.click();
    let confirmButton = $('button.md-confirm-button');
    browser.wait(EC.elementToBeClickable(confirmButton));
    confirmButton.click();
    browser.wait(EC.textToBePresentInElement($('.md-title'), "Deletion Completed"));
    element(by.buttonText('OK')).click();
    browser.wait(EC.not(EC.textToBePresentInElement($('.md-title'), "Deletion Completed")));
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
   * @param formFilePath the pathname to the form, relative to the test/data
   *  directory.
   * @param prefix the text to prepend to the actual form title and to the
   *  form's first idenifier (so it cannot contain characters that identifer does
   *  not permit).
   */
  uploadFormWithTitleChange: function(formFilePath, prefix) {
    let tmp = require('tmp');
    let tmpObj = tmp.fileSync();
    this._tmpFiles.push(tmpObj);
    let qFilePath = require('path').resolve(__dirname, 'data', formFilePath);
    let fs = require('fs');
    let qData = JSON.parse(fs.readFileSync(qFilePath));
    qData.title = prefix + qData.title;
    qData.name = prefix + qData.name;
    qData.identifier[0].value = prefix + qData.identifier[0].value;
    qData.code[0].display = prefix + qData.code[0].display;
    qData.code[0].code = prefix + qData.code[0].code;
    fs.writeFileSync(tmpObj.name, JSON.stringify(qData, null, 2));
    util.uploadForm(tmpObj.name);
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
   *  Closes the "save results" dialog.
   */
  closeSaveResultsDialog: function() {
    var okButton = '#btnOK';
    browser.wait(EC.presenceOf($(okButton)));
    $(okButton).click();
    browser.wait(EC.not(EC.presenceOf($(okButton))));
  },


  /**
   *  Saves the current form as a questionnaire response.
   */
  saveAsQR: function() {
    let saveAs = $('#btn-save-as');
    saveAs.click();
    $('#btn-save-sdc-qr').click();
  },


  /**
   *  Returns a function, which when called, will send the given message to the
   *  log.  The purpose is to be used in .then clauses for debugging.
   */
  log: function(msg) {
    return ()=>console.log(msg);
  },


  /**
   *  Deletes the currently displayed QuestionnaireResponse.
   */
  deleteCurrentQR: function() {
    let deleteBtn = $('#btn-delete');
    browser.wait(EC.presenceOf(deleteBtn), 4000);
    deleteBtn.click();
    util.waitForSpinnerStopped();
  },


  /**
   *  The tests here do not interact with a FHIR server, so we need to dismiss that selection box.
   */
  dismissFHIRServerDialog: function() {
    var cancelButton = '#btnCancel';
    browser.wait(EC.elementToBeClickable($(cancelButton)), 5000);
    $(cancelButton).click();
    browser.wait(EC.not(EC.presenceOf($(cancelButton))), 5000);
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
      return $('#message-body');
    },

    /**
     *  The autocompletion list.
     */
    answerList: $('#searchResults')

  },

  autoCompHelpers: autoCompHelpers
}
module.exports = util;
