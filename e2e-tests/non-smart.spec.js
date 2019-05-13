var EC = protractor.ExpectedConditions;
let util = require('./util');

/**
 *  Selects a patient from the patient dialog.
 */
function pickPatient()  {
  var ptField = '.lf-patient-search input'
  browser.wait(EC.presenceOf($(ptField)), 20000);
  $(ptField).sendKeys('karen');
  browser.wait(EC.textToBePresentInElement($('md-virtual-repeat-container'), 'Karen'), 2000);
  $(ptField).sendKeys(protractor.Key.ARROW_DOWN);
  $(ptField).sendKeys(protractor.Key.TAB);
  $('#btnOK').click();
  // Confirm patient info is in header
  var name = $('#ptName');
  browser.wait(EC.presenceOf(name), 5000);
  browser.wait(EC.textToBePresentInElement(name, 'Karen'), 2000);
}

describe('Non-SMART connection to FHIR server', function() {
  let mainPageURL = '/lforms-fhir-app/';
  it('should be able to select a FHIR server and a patient', function() {
    browser.get(mainPageURL);
    var urlField = '#fhirServerURL';
    browser.wait(EC.presenceOf($(urlField)), 5000);
    $(urlField).click();
    util.sendKeys($(urlField), 'https://launch.smarthealthit.org/v/r3/fhir');
    $(urlField).sendKeys(protractor.Key.TAB);
    $('#btnOK').click();
    // Wait for dialog to close
    browser.wait(EC.not(EC.presenceOf($('#btnOk'))), 5000);
    // Wait for patient picker to open
    pickPatient();
    // Confirm patient is in context for form pre-population
    util.uploadForm('R4/ussg-fhp.json');
    // Wait for name to be auto-filled (pre-population test)
    let nameField = element(by.id('/54126-8/54125-0/1/1'));
    browser.wait(EC.presenceOf(nameField), 2000);
    browser.wait(EC.textToBePresentInElementValue(nameField, 'Pok'), 2000);
  });

 fdescribe('Extracting observations', function() {
    it('should be able to accept a "server" parameter', function() {
      browser.get(mainPageURL+'?server=https://lforms-fhir.nlm.nih.gov/baseR4');
      pickPatient();
    });

    it('should be able to save extracted observations', function () {
      util.uploadForm('R4/weight-height-questionnaire.json');
      var weightField = '#\\/29463-7\\/1';
      browser.wait(EC.presenceOf($(weightField)), 2000);
      $(weightField).click();
      $(weightField).sendKeys('50');
      let saveAs = $('#btn-save-as');
      saveAs.click();
      $('#btn-save-sdc-qr-obs').click();
      util.waitForSpinnerStopped();
      var dialogContent = 'md-dialog-content';
      browser.wait(EC.presenceOf($(dialogContent)), 2000);
      browser.wait(EC.textToBePresentInElement($(dialogContent), 'Save succeeded'));
      browser.wait(EC.textToBePresentInElement($(dialogContent),
          'Created Observation')).then(function() {
        $('#btnOK').click();
      });
    });
  });
});
