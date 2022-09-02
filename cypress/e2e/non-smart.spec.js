var EC = protractor.ExpectedConditions;
let util = require('./util');

/**
 *  Selects a patient from the patient dialog.
 * @param paitentName the text to match the patient name
 * @param listItemNum the position (starting at 1) of the patient in the search
 * results list.
 */
function pickPatient(patientName, listItemNum)  {
  if (!patientName) {
    patientName = 'Karen'; // "Karen Lewis"
    listItemNum = 1;
  }
  var ptField = '#resSelection';
  browser.wait(EC.visibilityOf($(ptField)), 20000);
  $(ptField).sendKeys(patientName);
  browser.wait(EC.textToBePresentInElement(util.pageObjects.answerList, patientName), 2000);
  for (let i=0; i<listItemNum; ++i)
    $(ptField).sendKeys(protractor.Key.ARROW_DOWN);
  $(ptField).sendKeys(protractor.Key.TAB);
  $('#resSelectBtn').click();
  // Confirm patient info is in header
  var name = $('#ptName');
  browser.wait(EC.visibilityOf(name), 5000);
  browser.wait(EC.textToBePresentInElement(name, patientName), 10000);
}

describe('Non-SMART connection to FHIR server', function() {
  let mainPageURL = '/lforms-fhir-app/';

  afterAll(function(done) {
    util.cleanUpTmpFiles();
    util.deleteTestResources().then(()=>done()); // Clean up test resources
  });


  it('should be able to select an off-list FHIR server', function() {
    browser.get(mainPageURL);
    // Note:  If this test fails, it might be because this particular server is
    // down.  In that case, feel free to replace it with another off-list
    // server.
    util.selectServerUsingDialog('http://wildfhir4.aegis.net/fhir4-0-1');
    pickPatient('a', 1);
  });


  it('should be able to select a FHIR server and a patient', function() {
    browser.get(mainPageURL);
    util.selectServerUsingDialog('https://lforms-fhir.nlm.nih.gov/baseR4');
    // Wait for patient picker to open
    pickPatient();
    // Confirm patient is in context for form pre-population
    util.uploadFormWithTitleChange('R4/ussg-fhp.json');
    // Wait for name to be auto-filled (pre-population test)
    let nameField = element(by.id('/54126-8/54125-0/1/1'));
    browser.wait(EC.visibilityOf(nameField), 2000);
    browser.wait(EC.textToBePresentInElementValue(nameField, 'Karen'), 2000);
  });

  describe('After patient selection', function() {
    beforeAll(() => {
      browser.get(mainPageURL+'?server=https://lforms-fhir.nlm.nih.gov/baseR4');
      pickPatient();
    });

    describe('Extracting observations', function() {

      it('should be able to save extracted observations', function () {
        util.uploadFormWithTitleChange('R4/weight-height-questionnaire.json');
        var weightField = '#\\/29463-7\\/1';
        browser.wait(EC.visibilityOf($(weightField)), 2000);
        $(weightField).click();
        util.clearField($(weightField));
        $(weightField).sendKeys('50');
        util.saveAsQRAndObs();
        util.waitForSpinnerStopped();
        browser.wait(EC.textToBePresentInElement($('#saveResultsStatus'), 'Save succeeded'));
        browser.wait(EC.textToBePresentInElement($('#saveResultsList'), 'Created Observation'));
        util.closeSaveResultsDialog();
      });
    });


    describe('saved QuestionnaireResponses', function() {
      it('should provide data for observationLinkPeriod from a saved questionnaire', function() {
        // Continuing from the previous test
        // Clear the field so we can check it fills in again
        var weightField = '#\\/29463-7\\/1';
        util.clearField($(weightField));

        // open the saved q section
        util.expandAvailQs()
        //browser.wait(EC.visibilityOf(element(by.css('#qList a.list-group-item:first-child')), 2000);

        util.pageObjects.firstSavedQ('Weight').click();

        let weight = $(weightField); // new copy of element
        browser.wait(EC.visibilityOf(weight), 2000);
        browser.wait(EC.textToBePresentInElementValue(weight, '50'));
        expect(weight.getAttribute('value')).toMatch(/^50/);
      });


      it('should have working expressions', function() {
        // Continue with form loaded in previous tests
        let height = element(by.id('/8302-2/1'));
        util.clearField(height);
        height.sendKeys('30');
        let weight = element(by.id('/29463-7/1'));
        util.clearField(weight);
        weight.sendKeys('20');
        let bmi = element(by.id('/39156-5/1'));
        expect(bmi.getAttribute('value')).toBe('34.4');
      });
    });


    describe('Editing saved values', function() {
      var familyMemberName = '#\\/54114-4\\/54138-3\\/1\\/1';

      it('should show a saved value', function () {
        // Save a new QuestionnaireResponse
        util.uploadFormWithTitleChange('R4/ussg-fhp.json');
        browser.wait(EC.visibilityOf($(familyMemberName)), 2000);
        $(familyMemberName).click();
        $(familyMemberName).sendKeys('zz');
        util.saveAsQR();
        // check if qr.author is saved
        util.getQRUrlFromDialog().then(function(url) {
          util.getResouceByUrl(url).then(function(res) {
            expect(res.author).toBe(undefined)
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
        expect($(familyMemberName).getAttribute('value')).toBe('zz');
      });

      it('should show an edited value', function() {
        // Now edit the saved value in the previous test
        util.clearField($(familyMemberName));
        $(familyMemberName).click();
        $(familyMemberName).sendKeys('aa');
        $('#btn-save').click();
        util.waitForSpinnerStopped();
        util.closeSaveResultsDialog();
        // open the saved q section
        util.expandAvailQs();
        // Load a blank questionnaire to clear the fields
        util.safeClick(util.pageObjects.firstSavedUSSGQ());
        browser.wait(EC.visibilityOf($(familyMemberName)));
        expect($(familyMemberName).getAttribute('value')).toBe('');
        /// open the saved qr section
        util.expandSavedQRs();
        // Load the saved QR and check the value
        util.pageObjects.firstSavedQR().click();
        browser.wait(EC.visibilityOf($(familyMemberName)));
        expect($(familyMemberName).getAttribute('value')).toBe('aa');
      });
    });


    describe('Delete saved values', function() {
      var familyMemberName = '#\\/54114-4\\/54138-3\\/1\\/1';

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
        browser.wait(EC.visibilityOf(util.pageObjects.initialMessageDiv));
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
            expect(res.author).toBe(undefined)
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
        browser.wait(EC.visibilityOf(util.pageObjects.initialMessageDiv));
      });
    });

    describe('Next & previous buttons in Questionnaire list', function() {
      var firstQNameCSS = '#qListItems .form-name:first-child';
      beforeAll(()=> {
        // Add a form with a unique title, so we can be sure of the list
        // changing.
        util.uploadFormWithTitleChange('R4/ussg-fhp.json');
        util.saveAsQR();
        util.closeSaveResultsDialog();
        util.expandAvailQs();
      });

      it('should initially have a next button and a disabled previous button', function() {
        expect($('#qPrevPage').getAttribute('disabled')).toBe('true');
        expect($('#qNextPage').getAttribute('disabled')).not.toBe('true');
      });

      it('should have a working next button on the first page', function() {
        // Get the name of the first questionnaire in the list.
        browser.wait(EC.visibilityOf($(firstQNameCSS)), 2000);
        $(firstQNameCSS).getText().then(function(origVal) {
          util.safeClick($('#qNextPage'));
          // Wait for the text of the first item to be different
          browser.wait(function() {
            return $(firstQNameCSS).getText().then(function(newVal) {
              return origVal != newVal;
            }, function fail() {return false}); // "fail" handles stale element references
          }, 2000);
        });
      });

      it('should have a working previous button on the second page', function() {
        // Get the name of the first questionnaire in the list.
        $(firstQNameCSS).getText().then(function(origVal) {
          $('#qPrevPage').click();
          // Wait for the text of the first item to be different
          browser.wait(function() {
            return $(firstQNameCSS).getText().then(function(newVal) {
              return origVal != newVal;
            }, function fail() {return false}); // "fail" handles stale element references
          }, 2000);
        });
      });

    });

    describe('Search Questionnaires', function() {
      beforeAll(()=> {
        util.expandAvailQs();
      });

      it('should find a questionnaire by its title', function() {
        var title = 'Height';
        var ptField = '#resSelection';
        util.safeClick($('#search'));
        browser.wait(EC.visibilityOf($(ptField)), 4000);
        $(ptField).sendKeys(title);
        browser.wait(EC.textToBePresentInElement(util.pageObjects.answerList, title), 2000);
        $(ptField).sendKeys(protractor.Key.ARROW_DOWN);
        $(ptField).sendKeys(protractor.Key.TAB);
        $('#resSelectBtn').click();
        // Confirm questionnaire is displayed
        browser.wait(EC.visibilityOf($('.lhc-form-title > span')), 5000);
        browser.wait(EC.textToBePresentInElement($('.lhc-form-title > span'), title), 2000);
      });

    });
  });

  describe('Featured Questionnaires', function() {
    const danielJohnsonID = 'smart-1186747';

    beforeAll(function() {
      browser.get(mainPageURL+'?server=https://lforms-fhir.nlm.nih.gov/baseR4');
      // Wait for patient picker to open
      pickPatient('Daniel J', 1); // "Daniel Johnson"

      // Create a height value
      let obsPromise =
        util.storeObservation('R4', danielJohnsonID, {"system": "http://loinc.org",
          "code": "8302-2"}, 'Quantity',
          {"value": 70.1, "system": "http://unitsofmeasure.org", "code": "[in_i]"});
      browser.wait(obsPromise);
    });


    it('should display a list of featured questionnaires when https://lforms-fhir.nlm.nih.gov/baseR4 is selected', function() {
      let featuredTab = element(by.id('fqList'));
      browser.wait(EC.visibilityOf(featuredTab), 2000);
    });

    it('should display one of the questionnaires', function() {
      // Continue with form loaded in previous tests
      let firstFeaturedQ = element(by.id('54127-6-x'));
      browser.wait(EC.visibilityOf(firstFeaturedQ), 2000);

      firstFeaturedQ.click();
      let name = element(by.id('/54126-8/54125-0/1/1'));
      browser.sleep(2000)
      browser.wait(EC.visibilityOf(name), 2000);
    });

    it('should display the weight and height questionnaire with pre-populated data', function() {
      // Continue with form loaded in previous tests
      let secondFeaturedQ = element(by.id('55418-8-x'));
      browser.wait(EC.visibilityOf(secondFeaturedQ), 2000);

      secondFeaturedQ.click();
      let height = element(by.id('/8302-2/1'));
      browser.sleep(2000)
      browser.wait(EC.visibilityOf(height), 2000);
      expect(height.getAttribute('value')).toBe("70.1");
    });

    it('should not display a list of featured questionnaires when https://lforms-fhir.nlm.nih.gov/baseDstu3 is selected', function() {
      // Note this is a test of the behavior with the dialog; the server
      // parameter is tested below.
      browser.get(mainPageURL);
      util.selectServerUsingDialog('https://lforms-fhir.nlm.nih.gov/baseDstu3');
      pickPatient();

      let featuredTab = element(by.id('fqList'));
      browser.wait(EC.invisibilityOf(featuredTab), 5000);

    });

    it('should be able to accept a "server" parameter', function() {
      browser.get(mainPageURL+'?server=https://lforms-fhir.nlm.nih.gov/baseR4');
      pickPatient();
    });

    it('should display a list of featured questionnaires when https://lforms-fhir.nlm.nih.gov/baseR4 is provided through the "server" parameter', function() {
      browser.get(mainPageURL+'?server=https://lforms-fhir.nlm.nih.gov/baseR4');
      pickPatient();
      let featuredTab = element(by.id('fqList'));
      browser.wait(EC.visibilityOf(featuredTab), 2000);
    });

    it('should NOT display a list of featured questionnaires when https://lforms-fhir.nlm.nih.gov/baseDstu3 is provided through the "server" parameter', function() {
      browser.get(mainPageURL+'?server=https://lforms-fhir.nlm.nih.gov/baseDstu3');
      pickPatient();
      let featuredTab = element(by.id('fqList'));
      browser.wait(EC.invisibilityOf(featuredTab), 5000);
    });

  });

});
