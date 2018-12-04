// Tests required the SMART on FHIR connection.
let util = require('./util');
let po = util.pageObjects;
var EC = protractor.ExpectedConditions;


describe('SMART on FHIR connection', function () {
  beforeAll(function() {
    util.launchSmartAppInSandbox();
  });


  it ('should display a saved form', function () {
    // Upload, edit, and save a form.
    util.uploadForm('R4/ussg-fhp.json');
    // Wait for name to be auto-filled (pre-population test)
    let name = element(by.id('/54126-8/54125-0/1/1'));
    browser.wait(EC.presenceOf(name), 2000);
    browser.wait(EC.textToBePresentInElementValue(name, 'Pok'), 2000);
    // Enter a height value
    let height = element(by.id('/54126-8/8302-2/1/1'));
    height.sendKeys('70');
    let saveAs = $('#btn-save-as');
    saveAs.click();
    let sdcSave = $('#btn-save-sdc-qr');
    sdcSave.click();
    util.waitForSpinnerStopped();
    // Confirm that a warning message (about an unknown FHIR version) is not shown.
    expect(EC.not(EC.presenceOf($('.warning'))));

    // Wait for the first saved questionnaire to be this form.
    let firstQ = po.firstSavedUSSGQ();
    browser.wait(EC.textToBePresentInElement(firstQ, 'Surgeon'), 2000);
    // Open the form and wait for it to render
    firstQ.click();
    util.waitForSpinnerStopped();
    // Confirm that the edited field value is no longer there.
    height = element(by.id('/54126-8/8302-2/1/1')); // new on page
    browser.wait(EC.presenceOf(height), 2000);
    expect(height.getAttribute('value')).not.toBe('70');
    // Confirm that a warning message (about an unknown FHIR version) is not shown.
    expect(EC.not(EC.presenceOf($('.warning'))));

    // Now open up the saved QuestionnaireResponse and confirm we can see the
    // saved value.
    $('#qrList a:first-child').click();
    // height = element(by.id('/54126-8/8302-2/1/1')); // new on page
    browser.wait(EC.presenceOf(element(by.id('/54126-8/8302-2/1/1'))), 2000);
    expect(height.getAttribute('value')).toBe('70');
    // Confirm that a warning message (about an unknown FHIR version) is not shown.
    expect(EC.not(EC.presenceOf($('.warning'))));

    util.deleteCurrentQR(); // clean up
  });


  describe('Saved QuestionnaireResponses', function() {
    afterAll(function() {
      util.cleanUpTmpFiles();
      // Clean up test questionnaires
      browser.executeScript(function () {
        var fhirService = angular.element(document.body).injector().get("fhirService")
        fhirService.fhir.search({
          type: "Questionnaire",
          query: {'title:contains': 'LHC-Forms-Test'},
          headers: {'Cache-Control': 'no-cache'}
        }).then(function success(resp){
          var bundle = resp.data;
          var count = (bundle.entry && bundle.entry.length) || 0;
          for (var i=0; i<count; ++i) {
            var qr = bundle.entry[i].resource;
            var qrId = qr.id;
            fhirService.deleteFhirResource('Questionnaire', qrId);
          }
        });
      });
      browser.wait(EC.not(EC.presenceOf(po.firstSavedQ('LHC-Forms-Test'))), 2000);
    });

    afterEach(function() {
      util.deleteCurrentQR(); // clean up
    });

    ['R4', 'STU3'].forEach(function(fhirVersion) {
      describe(fhirVersion, function() {
        it('should have working answer lists', function() {
          var prefix = 'LHC-Forms-Test-WHQ-'+fhirVersion;
          util.uploadFormWithTitleChange(fhirVersion+'/weight-height-questionnaire.json',
            prefix);
          let bodyPos = element(by.id('/8361-8/1'));
          expect(bodyPos.isDisplayed()).toBeTruthy();
          $('#btn-save-as').click(); // open save as menu
          $('#btn-save-sdc-qr').click(); // save the Q & QR
          util.waitForSpinnerStopped();
          // Wait for the saved questionnaire response to be this page.
          let qr = po.firstSavedQR(prefix);
          browser.wait(EC.presenceOf(qr), 2000);
          qr.click();
          bodyPos = element(by.id('/8361-8/1')); // get new copy
          browser.wait(EC.presenceOf(bodyPos), 2000);
          bodyPos.click();
          expect(po.answerList.isDisplayed()).toBeTruthy();
        });
      });
    });
  });


  describe("'Show' Menu", function () {
    var showMenu = $('#btn-show-as');
    var msgBody;
    beforeAll(function() {
      // Load a form
      browser.waitForAngular();
      util.uploadForm('R4/ussg-fhp.json');
      browser.wait(EC.textToBePresentInElement(element(by.css('.lf-form-title')), "Surgeon"), 5000);

      // Save the form
      $('#btn-save-as').click();
      $('#btn-save-sdc-qr').click();
      util.waitForSpinnerStopped();

      // Load the first QR
      var firstQR = po.firstSavedQR();
      browser.wait(EC.textToBePresentInElement(firstQR, 'Surgeon'), 2000);
      po.firstSavedQR().click();
      util.waitForSpinnerStopped();

      msgBody = po.resDialogBody();
    });

    afterAll(function() {
      util.deleteCurrentQR(); // clean up
    });

    /**
     *  Selects the given item from the "show" menu.
     */
    function clickShowMenuItem(showItemCSS) {
      showMenu.click();
      let showItem = $(showItemCSS);
      browser.wait(EC.presenceOf(showItem), 2000);
      browser.wait(EC.elementToBeClickable(showItem));
      showItem.click();
      browser.waitForAngular();
    }

    /**
     *  Closes the currently displayed resource dialog.
     */
    function closeResDialog() {
      let closeButton = $('#close-res-dialog');
      browser.wait(EC.visibilityOf(closeButton));
      browser.wait(EC.elementToBeClickable(closeButton));
      closeButton.click();
      browser.waitForAngular();
      browser.wait(EC.not(EC.visibilityOf(closeButton)));
    }

    describe('Questionnaire from Server', function() {
      beforeAll(()=>clickShowMenuItem('#show-q-from-server'));
      afterAll(()=>closeResDialog());

      it('should open the dialog', function() {
        browser.wait(EC.visibilityOf(msgBody));
      });

      it('should contain a Questionnaire resource', function () {
        expect(EC.textToBePresentInElement(msgBody, '"resourceType": "Questionnaire"'));
      });
    });

    describe('Questionnaire', function() {
      beforeAll(() => clickShowMenuItem('#show-q'));
      afterAll(()=>closeResDialog());

      it('should open the dialog', function() {
        browser.wait(EC.visibilityOf(msgBody));
      });

      it('should contain a Questionnaire resource', function () {
        expect(EC.textToBePresentInElement(msgBody, '"resourceType": "Questionnaire"'));
      });

      it('should not be an SDC questionnaire', function() {
        expect(EC.not(EC.textToBePresentInElement(msgBody, 'sdc-questionnaire')));
      });
    });

    describe('QuestionnaireResponse', function() {
      beforeAll(() => clickShowMenuItem('#show-qr'));
      afterAll(()=>closeResDialog());

      it('should open the dialog', function() {
        browser.wait(EC.visibilityOf(msgBody));
      });

      it('should contain a QuestionnaireResponse resource', function () {
        expect(EC.textToBePresentInElement(msgBody, '"resourceType": "QuestionnaireResponse"'));
      });

      it('should not be an SDC QuestionnaireResponse', function() {
        expect(EC.not(EC.textToBePresentInElement(msgBody, 'sdc-questionnaire')));
      });
    });

    describe('SDC Questionnaire', function() {
      beforeAll(() => clickShowMenuItem('#show-sdc-q'));
      afterAll(()=>closeResDialog());

      it('should open the dialog', function() {
        browser.wait(EC.visibilityOf(msgBody));
      });

      it('should contain a Questionnaire resource', function () {
        expect(EC.textToBePresentInElement(msgBody, '"resourceType": "Questionnaire"'));
      });

      it('should be an SDC questionnaire', function() {
        expect(EC.textToBePresentInElement(msgBody, 'sdc-questionnaire'));
      });
    });

    describe('SDC QuestionnaireResponse', function() {
      beforeAll(() => clickShowMenuItem('#show-sdc-qr'));
      afterAll(()=>closeResDialog());

      it('should open the dialog', function() {
        browser.wait(EC.visibilityOf(msgBody));
      });

      it('should contain a QuestionnaireResponse resource', function () {
        expect(EC.textToBePresentInElement(msgBody, '"resourceType": "QuestionnaireResponse"'));
      });

      it('should be an SDC QuestionnaireResponse', function() {
        expect(EC.textToBePresentInElement(msgBody, 'sdc-questionnaire'));
      });
    });

  });
});
