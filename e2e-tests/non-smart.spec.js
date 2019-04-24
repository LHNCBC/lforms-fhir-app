var EC = protractor.ExpectedConditions;
let util = require('./util');

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
    browser.wait(EC.presenceOf($('#btnCancel')), 20000);
    // Pick a patient
    var ptField = '.lf-patient-search input'
    $(ptField).sendKeys('pok');
    browser.wait(EC.textToBePresentInElement($('md-virtual-repeat-container'), 'Pok'), 2000);
    $(ptField).sendKeys(protractor.Key.ARROW_DOWN);
    //browser.wait(EC.textToBePresentInElement($(ptField), 'Pok'), 20000);
    $(ptField).sendKeys(protractor.Key.TAB);
    $('#btnOK').click();

    // Confirm patient info is in header
    var name = $('#ptName');
    browser.wait(EC.presenceOf(name), 5000);
    browser.wait(EC.textToBePresentInElement(name, 'Pok'), 2000);

    // Confirm patient is in context for form pre-population
    util.uploadForm('R4/ussg-fhp.json');
    // Wait for name to be auto-filled (pre-population test)
    let nameField = element(by.id('/54126-8/54125-0/1/1'));
    browser.wait(EC.presenceOf(nameField), 2000);
    browser.wait(EC.textToBePresentInElementValue(nameField, 'Pok'), 2000);
  });
});
