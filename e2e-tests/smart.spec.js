// Tests required the SMART on FHIR connection.
let util = require('./util');
let po = util.pageObjects;
var EC = protractor.ExpectedConditions;

describe('Featured Questionnaires', function() {
  it('should display a list of featured questionnaires when R4 server is used', function() {
    util.launchSmartAppInSandbox();

    let featuredTab = element(by.id('fqList'));
    browser.wait(EC.presenceOf(featuredTab), 2000);

  });

  it('should display the the weight and height questionnaire with pre-populated data', function() {
    util.launchSmartAppInSandbox();

    let featuredTab = element(by.id('fqList'));
    browser.wait(EC.presenceOf(featuredTab), 2000);

    let secondFeaturedQ = element(by.id('55418-8-x'));
    browser.wait(EC.presenceOf(secondFeaturedQ), 2000);

    secondFeaturedQ.click();
    let weight = element(by.id('/8302-2/1'));
    browser.sleep(2000)
    browser.wait(EC.presenceOf(weight), 2000);
    expect(weight.getAttribute('value')).toBe("77.6");
  });

  it('should NOT display a list of featured questionnaires when R3 server is used', function() {
    util.launchSmartAppInSandbox('r3');

    let featuredTab = element(by.id('fqList'));
    browser.wait(EC.not(EC.presenceOf(featuredTab)), 5000);

  });

});

describe('SMART on FHIR connection', function () {
  beforeAll(function() {
    util.launchSmartAppInSandbox();
    var name = $('#ptName');
    browser.wait(EC.presenceOf(name), 5000);
    browser.wait(EC.textToBePresentInElement(name, 'Aaron'), 2000);
  });


  describe('saved form', function() {
    beforeAll(function() {
      // Upload, edit, and save a form.
      util.uploadForm('R4/ussg-fhp.json');
      // Wait for name to be auto-filled (pre-population test)
      let name = element(by.id('/54126-8/54125-0/1/1'));
      browser.wait(EC.presenceOf(name), 2000);
      browser.wait(EC.textToBePresentInElementValue(name, 'Aaron'), 2000);
      // Enter a height value
      let height = element(by.id('/54126-8/8302-2/1/1'));
      browser.wait(EC.presenceOf(height), 2000);
      util.clearField(height);
      height.sendKeys('70');
      let saveAs = $('#btn-save-as');
      saveAs.click();
      let sdcSave = $('#btn-save-sdc-qr');
      sdcSave.click();
      util.waitForSpinnerStopped();
      util.closeSaveResultsDialog();
      // Confirm that a warning message (about an unknown FHIR version) is not shown.
      expect(EC.not(EC.presenceOf($('.warning'))));
    });

    it ('should display a saved form', function () {
      // Wait for the first saved questionnaire to be this form.
      // open the saved q section
      element(by.css("#heading-three a")).click();
      let firstQ = po.firstSavedUSSGQ();
      browser.wait(EC.textToBePresentInElement(firstQ, 'Surgeon'), 2000);
      // Open the form and wait for it to render
      browser.wait(EC.elementToBeClickable(po.firstSavedUSSGQ()))
      po.firstSavedUSSGQ().click(); // sometimes firstQ is "stale"
      util.waitForSpinnerStopped();
      // Confirm that the edited field value is no longer there.
      height = element(by.id('/54126-8/8302-2/1/1')); // new on page
      browser.wait(EC.presenceOf(height), 2000);
      expect(height.getAttribute('value')).not.toBe('70');
      // Confirm that a warning message (about an unknown FHIR version) is not shown.
      expect(EC.not(EC.presenceOf($('.warning'))));

      // Now open up the saved QuestionnaireResponse and confirm we can see the
      // saved value.
      // open the saved qr section
      element(by.css("#heading-one a")).click();
      $('#qrList a:first-child').click();
      browser.wait(EC.presenceOf(element(by.id('/54126-8/8302-2/1/1'))), 15000);
      height = element(by.id('/54126-8/8302-2/1/1')); // new on page
      browser.wait(EC.textToBePresentInElementValue(height, '70'), 2000);
      expect(height.getAttribute('value')).toBe('70');
      // Confirm that a warning message (about an unknown FHIR version) is not shown.
      expect(EC.not(EC.presenceOf($('.warning'))));
      // open the saved q section
      element(by.css("#heading-three a")).click();
    });

    afterAll(function() {
      util.deleteCurrentQuestionnaire(); // Clean up uploaded form
    });
  });

  it('should provide data for observationLinkPeriod', function() {
    util.uploadForm('R4/weight-height-questionnaire.json');
    let height = element(by.id('/8302-2/1'));
    browser.wait(EC.presenceOf(height), 2000);
    browser.wait(function() {return height.getAttribute('value').then(value => value.length > 0)}, 2000);
  });


  describe('ValueSet search', function() {
    beforeAll(function() {
      util.uploadForm('R4/ussg-fhp.json');
    });

    it ('should work via the FHIR client', function() {
      var ethnicityID = '/54126-8/54133-4/1/1';
      var ethnicity = element(by.id(ethnicityID));
      util.sendKeys(ethnicity, 'ar');
      util.autoCompHelpers.waitForSearchResults();
      browser.sleep(75); // wait for autocompletion to finish to avoid a stale element
      util.autoCompHelpers.firstSearchRes.click();
      expect(util.autoCompHelpers.getSelectedItems(ethnicityID)).toEqual(['Argentinean']);
    });

    it('should work via a terminology server', function() {
      var diseasesID = '/54126-8/54137-5/54140-9/1/1/1';
      var diseaseHistory = element(by.id(diseasesID));
      util.sendKeys(diseaseHistory,'ar');
      util.autoCompHelpers.waitForSearchResults();
      util.autoCompHelpers.firstSearchRes.click();
      expect(diseaseHistory.getAttribute('value')).toEqual('Arm pain');
    }, 200000);
  });

  describe('Saved QuestionnaireResponses', function() {
    afterAll(function() {
      util.cleanUpTmpFiles();
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
          util.closeSaveResultsDialog();
          /// open the saved qr section
          element(by.css("#heading-one a")).click();
          // Wait for the saved questionnaire response to be this page.
          let qr = po.firstSavedQR(prefix);
          browser.wait(EC.presenceOf(qr), 2000);
          qr.click();
          bodyPos = element(by.id('/8361-8/1')); // get new copy of field
          browser.wait(EC.presenceOf(bodyPos), 2000);
          browser.wait(EC.visibilityOf(bodyPos), 2000);
          bodyPos.click();
          expect(po.answerList.isDisplayed()).toBeTruthy();

          util.deleteCurrentQuestionnaire(); // clean up test questionnaire
        }, 5000);
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
      util.closeSaveResultsDialog();
      /// open the saved qr section
      element(by.css("#heading-one a")).click();
      // Load the first QR
      var firstQR = po.firstSavedQR();
      browser.wait(EC.textToBePresentInElement(firstQR, 'Surgeon'), 2000);
      po.firstSavedQR().click();
      util.waitForSpinnerStopped();

      msgBody = po.resDialogBody();
    });

    afterAll(function() {
      /// open the saved q section
      element(by.css("#heading-three a.collapsed")).click();
      util.deleteCurrentQuestionnaire(); // Clean up uploaded form
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
        browser.wait(EC.textToBePresentInElement(msgBody, '"resourceType": "Questionnaire"'), 50);
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
