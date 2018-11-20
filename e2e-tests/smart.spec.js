// Tests required the SMART on FHIR connection.
let util = require('./util');

describe('SMART on FHIR connection', function () {
  beforeAll(function() {
    util.launchSmartAppInSandbox();
  });


  it ('should display a saved form', function () {
    // Upload, edit, and save a form.
    util.uploadForm('ussg-fhp.json');
    // Wait for name to be auto-filled (pre-population test)
    var EC = protractor.ExpectedConditions;
    let name = element(by.id('/54126-8/54125-0/1/1'));
    browser.wait(EC.presenceOf(name), 2000);
    browser.wait(EC.textToBePresentInElementValue(name, 'Pok'), 2000);
    // Enter a height value
    let height = element(by.id('/54126-8/8302-2/1/1'));
    height.sendKeys('70');
    let saveAs = $('#btn-save-as');
    saveAs.click();
    let sdcSave = $('#btn-save-sdc-qr');
    sdcSave.click().then(function() {console.log("%%% saved")});
    util.waitForSpinnerStopped();

    // Wait for the first saved questionnaire to be this form.
    let firstQ = $('#qList a:first-child')
    browser.wait(EC.textToBePresentInElement(firstQ, 'Surgeon'), 2000);
    // Open the form and wait for it to render
    firstQ.click();
    util.waitForSpinnerStopped();
    // Confirm that the edited field value is no longer there.
    height = element(by.id('/54126-8/8302-2/1/1')); // new on page
    browser.wait(EC.presenceOf(height), 2000);
    expect(height.getAttribute('value')).not.toBe('70');

    // Now open up the saved QuestionnaireResponse and confirm we can see the
    // saved value.
    $('#qrList a:first-child').click();
    // height = element(by.id('/54126-8/8302-2/1/1')); // new on page
    browser.wait(EC.presenceOf(element(by.id('/54126-8/8302-2/1/1'))), 2000);
    expect(height.getAttribute('value')).toBe('70');

    // Delete the QR to clean up.
    let deleteBtn = $('#btn-delete');
    browser.wait(EC.presenceOf(deleteBtn), 2000);
    deleteBtn.click();
    util.waitForSpinnerStopped();
  });

});
