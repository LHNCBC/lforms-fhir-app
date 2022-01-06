// Tests required the SMART on FHIR connection.
let util = require('./util');
let po = util.pageObjects;
var EC = protractor.ExpectedConditions;

describe('SMART on FHIR connection', function () {
  describe('STU3 server', function() {
    it('should NOT display a list of featured questionnaires', function() {
      util.launchSmartAppInSandbox('r3');

      let featuredTab = element(by.id('fqList'));
      browser.wait(EC.invisibilityOf(featuredTab), 5000);
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
      browser.wait(EC.visibilityOf(name), 5000);
      browser.wait(EC.textToBePresentInElement(name, 'Daniel'), 2000);
      var user = $('#userName');
      browser.wait(EC.textToBePresentInElement(user, 'Susan Clark'), 2000);
    });

    afterAll(function(done) {
      util.cleanUpTmpFiles();
      util.deleteTestResources().then(()=>done()); // Clean up test resources
    });


    describe('Featured Questionnaires', function() {
      it('should display a list of featured questionnaires when R4 server is used', function() {
        let featuredTab = element(by.id('fqList'));
        browser.wait(EC.visibilityOf(featuredTab), 2000);
      });

      it('should display the weight and height questionnaire with pre-populated data', function() {
        let secondFeaturedQ = element(by.id('55418-8-x'));
        browser.wait(EC.visibilityOf(secondFeaturedQ), 2000);

        secondFeaturedQ.click();
        let height = element(by.id('/8302-2/1'));
        browser.sleep(2000)
        browser.wait(EC.visibilityOf(height), 2000);
        browser.wait(function() {return height.getAttribute('value').then(value => value.length > 0)}, 200000);
      });
    });

    describe('saved form', function() {
      beforeAll(function() {
        // Upload, edit, and save a form.
        util.uploadFormWithTitleChange('R4/ussg-fhp.json');
        // Wait for name to be auto-filled (pre-population test)
        let name = element(by.id('/54126-8/54125-0/1/1'));
        browser.wait(EC.visibilityOf(name), 2000);
        browser.wait(EC.textToBePresentInElementValue(name, 'Daniel'), 2000);
        // Enter a height value
        let height = element(by.id('/54126-8/8302-2/1/1'));
        browser.wait(EC.visibilityOf(height), 2000);
        util.clearField(height);
        height.sendKeys('70');
        let saveAs = $('#btn-save-as');
        saveAs.click();
        let sdcSave = $('#createQRToFhir');
        sdcSave.click();
        util.waitForSpinnerStopped();
        util.closeSaveResultsDialog();
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
        browser.wait(EC.visibilityOf(height), 2000);
        expect(height.getAttribute('value')).not.toBe('70');
        // Confirm that a warning message (about an unknown FHIR version) is not shown.
        expect(EC.invisibilityOf($('.warning')));

        // Now open up the saved QuestionnaireResponse and confirm we can see the
        // saved value.
        // open the saved qr section
        util.expandSavedQRs();
        $('#qrList a:first-child').click();
        browser.wait(EC.visibilityOf(element(by.id('/54126-8/8302-2/1/1'))), 15000);
        height = element(by.id('/54126-8/8302-2/1/1')); // new on page
        browser.wait(EC.textToBePresentInElementValue(height, '70'), 2000);
        expect(height.getAttribute('value')).toBe('70');
        // Confirm that a warning message (about an unknown FHIR version) is not shown.
        expect(EC.invisibilityOf($('.warning')));
        // open the saved q section
        util.expandAvailQs();
      });
    });

    it('should provide data for observationLinkPeriod', function() {
      util.uploadFormWithTitleChange('R4/weight-height-questionnaire.json');
      let height = element(by.id('/8302-2/1'));
      browser.wait(EC.visibilityOf(height), 2000);
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
            var prefix = 'LHC-Forms-Test-WHQ-'+fhirVersion+'-';
            util.uploadFormWithTitleChange(fhirVersion+'/weight-height-questionnaire.json',
              prefix);
            let bodyPos = element(by.id('/8361-8/1'));
            expect(bodyPos.isDisplayed()).toBeTruthy();

            util.saveAsQRAndObs();
            util.waitForSpinnerStopped();
            // check if qr.author is saved
            util.getQRUrlFromDialog().then(function(url) {
              util.getResouceByUrl(url).then(function(res) {
                expect(res.author).toEqual(
                  {
                    reference: 'Practitioner/smart-Practitioner-71482713',
                    type: 'Practitioner',
                    display: 'Susan Clark'
                  }
                )
              })
            })
            util.closeSaveResultsDialog();
            /// open the saved qr section
            util.expandSavedQRs();
            // Wait for the saved questionnaire response to be this page.
            let qr = po.firstSavedQR(prefix);
            browser.wait(EC.elementToBeClickable(qr), 2000);
            qr.click();
            bodyPos = element(by.id('/8361-8/1')); // get new copy of field
            browser.wait(EC.visibilityOf(bodyPos), 2000);
            browser.wait(EC.visibilityOf(bodyPos), 2000);
            bodyPos.click();
            expect(po.answerList.isDisplayed()).toBeTruthy();
          }, 10000);
        });
      });
    });

    describe('Delete saved values', function() {
      var familyMemberName = '#\\/54114-4\\/54138-3\\/1\\/1';
      const initialMsgDiv = util.pageObjects.initialMessageDiv;

      it('should delete a saved QuestionnaireResponse', function () {
        // Save a new QuestionnaireResponse
        util.uploadFormWithTitleChange('R4/ussg-fhp.json');
        browser.wait(EC.visibilityOf($(familyMemberName)), 2000);
        $(familyMemberName).click();
        $(familyMemberName).sendKeys('to be deleted');
        util.saveAsQR();
        util.closeSaveResultsDialog();
        // Load a blank questionnaire to clear the fields
        util.expandAvailQs();
        util.safeClick(util.pageObjects.firstSavedUSSGQ());
        browser.wait(EC.visibilityOf($(familyMemberName)), 2000);
        browser.wait(()=>$(familyMemberName).getAttribute('value').then(
          (val)=>val==''), 5000);
        // open the saved qr section
        util.expandSavedQRs();
        // Load the saved QR and check the value
        util.pageObjects.firstSavedQR().click();
        browser.wait(EC.visibilityOf($(familyMemberName)));
        expect($(familyMemberName).getAttribute('value')).toBe('to be deleted');
        util.deleteCurrentQR();
        expect(EC.visibilityOf(initialMsgDiv));
      });

      it('should delete a saved QuestionnarieResponse and associated Observations', function() {
        // Save a new QuestionnaireResponse
        util.uploadFormWithTitleChange('R4/ussg-fhp.json');
        browser.wait(EC.visibilityOf($(familyMemberName)), 2000);
        $(familyMemberName).click();
        $(familyMemberName).sendKeys('to be deleted2');
        util.saveAsQRAndObs();
        // check if qr.author is saved
        util.getQRUrlFromDialog().then(function(url) {
          util.getResouceByUrl(url).then(function(res) {
            expect(res.author).toEqual(
              {
                reference: 'Practitioner/smart-Practitioner-71482713',
                type: 'Practitioner',
                display: 'Susan Clark'
              }
            )
          })
        })

        util.closeSaveResultsDialog();
        // Load a blank questionnaire to clear the fields
        util.expandAvailQs();
        util.safeClick(util.pageObjects.firstSavedUSSGQ());
        browser.wait(EC.visibilityOf($(familyMemberName)), 2000);
        browser.wait(()=>$(familyMemberName).getAttribute('value').then(
          (val)=>val==''), 5000);
        // open the saved qr section
        util.expandSavedQRs();
        // Load the saved QR and check the value
        util.pageObjects.firstSavedQR().click();
        browser.wait(EC.visibilityOf($(familyMemberName)));
        expect($(familyMemberName).getAttribute('value')).toBe('to be deleted2');
        util.deleteCurrentQR();
        expect(EC.visibilityOf(initialMsgDiv));
      });
    });


    describe("'Show' Menu", function () {
      var msgBody;
      beforeAll(function() {
        // Load a form
        util.uploadFormWithTitleChange('R4/ussg-fhp.json');
        browser.wait(EC.textToBePresentInElement(element(by.css('.lhc-form-title')), "Surgeon"), 5000);

        // Save the form
        util.saveAsQR();
        util.waitForSpinnerStopped();
        util.closeSaveResultsDialog();
        /// open the saved qr section
        util.expandSavedQRs();
        // Load the first QR
        var firstQR = po.firstSavedQR();
        browser.wait(EC.textToBePresentInElement(firstQR, 'Surgeon'), 2000);
        po.firstSavedQR().click();
        util.waitForSpinnerStopped();

        msgBody = po.resDialogBody();
      });



      describe('Questionnaire from Server', function() {
        beforeAll(()=>util.showAsQuestionnaireFromServer());
        afterAll(()=>util.closeResDialog());

        it('should open the dialog', function() {
          browser.wait(EC.visibilityOf(msgBody));
        });

        it('should contain a Questionnaire resource', function () {
          browser.wait(EC.textToBePresentInElement(msgBody, '"resourceType": "Questionnaire"'), 50);
        });
      });

      describe('SDC Questionnaire', function() {
        beforeAll(() => util.showAsQuestionnaire());
        afterAll(()=>util.closeResDialog());

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
        beforeAll(() => util.showAsQuestionnaireResponse());
        afterAll(()=>util.closeResDialog());

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
