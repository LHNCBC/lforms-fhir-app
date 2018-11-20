// Helper functions for the tests.

let util = {
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
  clearField: function(field) {
    field.click();
    field.sendKeys(protractor.Key.CONTROL, 'a'); // select all
    field.sendKeys(protractor.Key.BACK_SPACE); // clear the field
  },


  /**
   *  Opens up the SMART app in the SMART on FHIR developer sandbox.
   */
  launchSmartAppInSandbox: function () {
    util.setAngularSite(false);
    browser.get('https://launch.smarthealthit.org/?auth_error=&fhir_version_1=r2'+
     '&fhir_version_2=r3&iss=&launch_ehr=1&launch_url=http%3A%2F%2Flocalhost%3A'+
     '8000%2Flforms-fhir-app%2Flaunch.html&patient=&prov_skip_auth=1&provider='+
     '&pt_skip_auth=1&public_key=&sb=&sde=&sim_ehr=1&token_lifetime=15&user_pt=');
    // Select R3
    // https://stackoverflow.com/a/24259419/360782
    element(by.cssContainingText('#fhir-version-2 option', 'R3 (STU3)')).click();
    let launchURL = element(by.id('launch-url'));
    util.clearField(launchURL);
    launchURL.sendKeys('http://localhost:8000/lforms-fhir-app/launch.html');
    let launchButton = element(by.id('ehr-launch-url'));
    // For some reason, if the launch button is clicked too quickly, the new
    // window never finishes loading, even if stopped and restarted by hand,
    // so sleep a bit.
    browser.sleep(200);
    launchButton.click(); // opens new window

    // Switch to new window to continue
    // https://stackoverflow.com/a/32243857/360782
    // Wait for there to be more than one.
    browser.wait(function() {
      return browser.getAllWindowHandles().then(function(handles){
        return handles.length > 1;
      });
    });

    browser.getAllWindowHandles().then(function(handles){
      browser.switchTo().window(handles[1]);
      let iframe = $('#frame');
      var EC = protractor.ExpectedConditions;
      browser.wait(EC.presenceOf(iframe), 2000);
      browser.switchTo().frame(iframe.getWebElement());
      let patient = element(by.id('patient-eb3271e1-ae1b-4644-9332-41e32c829486'));
      browser.wait(EC.presenceOf(patient), 2000);
      patient.click();
      var EC = protractor.ExpectedConditions;
      browser.wait(function() {
        // Note: EC.elementToBeClickable did not work.  Apparently a button can
        // be "clickable" and yet disabled?
        // Sometimes says upload is "not on page", so use $
        browser.wait(EC.presenceOf($('#upload')), 2000);
        return $('#upload').getAttribute('disabled').then(function(disabled) {
          return !disabled;
        });
      });
    });
  },

  /**
   *  The input element for uploading files.
   */
  fileInput: element(by.css('input[type=file]')),

  /**
   *  Uploads the requested form from the e2e-tests/data directory.
   */
  uploadForm: function(formFileName) {
    let qFilePath = require('path').resolve(__dirname, 'data', formFileName);
    let upload = $('#upload');
    var EC = protractor.ExpectedConditions;
    browser.wait(EC.elementToBeClickable(upload), 2000);
    browser.executeScript('arguments[0].classList.toggle("hide")', util.fileInput.getWebElement());
    util.fileInput.sendKeys(qFilePath);
    browser.executeScript('arguments[0].classList.toggle("hide")', util.fileInput.getWebElement());
    // Wait for the form to appear
    var EC = protractor.ExpectedConditions;
    browser.wait(EC.presenceOf($('#th_Name')), 2000).then(function() {console.log("found tn_name") });
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
    browser.sleep(200);
  }
}
module.exports = util;
