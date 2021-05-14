// Tests required the SMART on FHIR connection.
let util = require('./util');
let po = util.pageObjects;
var EC = protractor.ExpectedConditions;

describe('SMART on FHIR connection', function () {
  describe('STU3 server', function() {
    it('should NOT display a list of featured questionnaires', function() {
      util.launchSmartAppInSandbox('r3');

      let featuredTab = element(by.id('fqList'));
      browser.wait(EC.not(EC.presenceOf(featuredTab)), 5000);
    });
  });

  describe('R4 server', function() {
    beforeAll(function() {
      // Create a height value
      const danielJohnsonID = 'smart-1186747';
      let obsPromise =
        util.storeObservation('R4', danielJohnsonID, {"system": "http://loinc.org",
          "code": "8302-2"}, 'Quantity',
          {"value": 70.1, "system": "http://unitsofmeasure.org", "code": "[in_i]"});
      browser.wait(obsPromise);

      util.launchSmartAppInSandbox();
      var name = $('#ptName');
      browser.wait(EC.presenceOf(name), 5000);
      browser.wait(EC.textToBePresentInElement(name, 'Daniel'), 2000);
      var user = $('#userName');
      browser.wait(EC.textToBePresentInElement(user, 'Susan Clark'), 2000);
    });

    describe('Featured Questionnaires', function() {
      it('should display a list of featured questionnaires when R4 server is used', function() {
        let featuredTab = element(by.id('fqList'));
        browser.wait(EC.presenceOf(featuredTab), 2000);
      });

      it('should display the weight and height questionnaire with pre-populated data', function() {
        let secondFeaturedQ = element(by.id('55418-8-x'));
        browser.wait(EC.presenceOf(secondFeaturedQ), 2000);

        secondFeaturedQ.click();
        let height = element(by.id('/8302-2/1'));
        browser.sleep(2000)
        browser.wait(EC.presenceOf(height), 2000);
        browser.wait(function() {return height.getAttribute('value').then(value => value.length > 0)}, 2000);
      });
    });

    afterAll(function() {
      util.cleanUpTmpFiles();
      return util.deleteTestResources(); // Clean up test resources
    });


    describe('saved form', function() {
      beforeAll(function() {
        // Upload, edit, and save a form.
        util.uploadFormWithTitleChange('R4/ussg-fhp.json');
        // Wait for name to be auto-filled (pre-population test)
        let name = element(by.id('/54126-8/54125-0/1/1'));
        browser.wait(EC.presenceOf(name), 2000);
        browser.wait(EC.textToBePresentInElementValue(name, 'Daniel'), 2000);
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
        util.expandAvailQs();
        let firstQ = po.firstSavedUSSGQ();
        browser.wait(EC.textToBePresentInElement(firstQ, 'Surgeon'), 2000);
        // Open the form and wait for it to render
        const firstSavedUSSGQ = po.firstSavedUSSGQ();
        browser.wait(EC.elementToBeClickable(firstSavedUSSGQ), 2000);
        firstSavedUSSGQ.click();
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
        util.expandSavedQRs();
        $('#qrList a:first-child').click();
        browser.wait(EC.presenceOf(element(by.id('/54126-8/8302-2/1/1'))), 15000);
        height = element(by.id('/54126-8/8302-2/1/1')); // new on page
        browser.wait(EC.textToBePresentInElementValue(height, '70'), 2000);
        expect(height.getAttribute('value')).toBe('70');
        // Confirm that a warning message (about an unknown FHIR version) is not shown.
        expect(EC.not(EC.presenceOf($('.warning'))));
        // open the saved q section
        util.expandAvailQs();
      });

      afterAll(function() {
        util.deleteCurrentQuestionnaire(); // Clean up uploaded form
      });
    });

    it('should provide data for observationLinkPeriod', function() {
      util.uploadFormWithTitleChange('R4/weight-height-questionnaire.json');
      let height = element(by.id('/8302-2/1'));
      browser.wait(EC.presenceOf(height), 2000);
      browser.wait(function() {return height.getAttribute('value').then(value => value.length > 0)}, 2000);
    });


    describe('ValueSet search', function() {
      beforeAll(function() {
        util.uploadFormWithTitleChange('R4/ussg-fhp.json');
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
            browser.wait(EC.elementToBeClickable(qr), 2000);
            qr.click();
            bodyPos = element(by.id('/8361-8/1')); // get new copy of field
            browser.wait(EC.presenceOf(bodyPos), 2000);
            browser.wait(EC.visibilityOf(bodyPos), 2000);
            bodyPos.click();
            expect(po.answerList.isDisplayed()).toBeTruthy();

            util.deleteCurrentQuestionnaire(); // clean up test questionnaire
          }, 10000);
        });
      });
    });

    describe('Delete saved values', function() {
      var familyMemberName = '#\\/54114-4\\/54138-3\\/1\\/1';

      it('should delete a saved QuestionnaireResponse', function () {
        // Save a new QuestionnaireResponse
        util.uploadFormWithTitleChange('R4/ussg-fhp.json');
        browser.wait(EC.presenceOf($(familyMemberName)), 2000);
        $(familyMemberName).click();
        $(familyMemberName).sendKeys('to be deleted');
        util.saveAsQR();
        util.closeSaveResultsDialog();
        // Load a blank questionnaire to clear the fields
        util.expandAvailQs();
        util.safeClick(util.pageObjects.firstSavedUSSGQ());
        browser.wait(EC.presenceOf($(familyMemberName)), 2000);
        browser.wait(()=>$(familyMemberName).getAttribute('value').then(
          (val)=>val==''), 5000);
        // open the saved qr section
        util.expandSavedQRs();
        // Load the saved QR and check the value
        util.pageObjects.firstSavedQR().click();
        browser.wait(EC.presenceOf($(familyMemberName)));
        expect($(familyMemberName).getAttribute('value')).toBe('to be deleted');
        util.deleteCurrentQR();
        expect($('div.loading.initial').getText()).toBe('Please select a FHIR resource or upload from file.');
      });

      it('should delete a saved QuestionnarieResponse and associated Observations', function() {
        // Save a new QuestionnaireResponse
        util.uploadFormWithTitleChange('R4/ussg-fhp.json');
        browser.wait(EC.presenceOf($(familyMemberName)), 2000);
        $(familyMemberName).click();
        $(familyMemberName).sendKeys('to be deleted2');
        util.saveAsQRAndObs();
        util.closeSaveResultsDialog();
        // Load a blank questionnaire to clear the fields
        util.expandAvailQs();
        util.safeClick(util.pageObjects.firstSavedUSSGQ());
        browser.wait(EC.presenceOf($(familyMemberName)), 2000);
        browser.wait(()=>$(familyMemberName).getAttribute('value').then(
          (val)=>val==''), 5000);
        // open the saved qr section
        util.expandSavedQRs();
        // Load the saved QR and check the value
        util.pageObjects.firstSavedQR().click();
        browser.wait(EC.presenceOf($(familyMemberName)));
        expect($(familyMemberName).getAttribute('value')).toBe('to be deleted2');
        util.deleteCurrentQR();
        expect($('div.loading.initial').getText()).toBe('Please select a FHIR resource or upload from file.');
      });
    });



    describe("'Show' Menu", function () {
      var showMenu = $('#btn-show-as');
      var msgBody;
      beforeAll(function() {
        // Load a form
        browser.waitForAngular();
        util.uploadFormWithTitleChange('R4/ussg-fhp.json');
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
});
