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
    listItemNum = 2;
  }
  var ptField = '.lf-patient-search input';
  browser.wait(EC.presenceOf($(ptField)), 20000);
  $(ptField).sendKeys(patientName);
  browser.wait(EC.textToBePresentInElement($('md-virtual-repeat-container'), patientName), 2000);
  for (let i=0; i<listItemNum; ++i)
    $(ptField).sendKeys(protractor.Key.ARROW_DOWN);
  $(ptField).sendKeys(protractor.Key.TAB);
  $('#btnOK').click();
  // Confirm patient info is in header
  var name = $('#ptName');
  browser.wait(EC.presenceOf(name), 5000);
  browser.wait(EC.textToBePresentInElement(name, patientName), 2000);
}

describe('Non-SMART connection to FHIR server', function() {
  let mainPageURL = '/lforms-fhir-app/';

  beforeAll(function() {
    browser.get(mainPageURL);
  });

  afterAll(function() {
    util.cleanUpTmpFiles();
    return util.deleteTestResources(); // Clean up test resources
  });


  it('should be able to select an off-list FHIR server', function() {
    var urlField = '#fhirServerURL';
    browser.wait(EC.presenceOf($(urlField)), 5000);
    $(urlField).click();
    // Note:  If this test fails, it might be because this particular server is
    // down.  In that case, feel free to replace it with another off-list
    // server.
    util.sendKeys($(urlField), 'http://wildfhir4.aegis.net/fhir4-0-0');
    $(urlField).sendKeys(protractor.Key.TAB);
    $('#btnOK').click();
    // Wait for dialog to close
    browser.wait(EC.not(EC.presenceOf($('#btnOk'))), 5000);
    pickPatient('a', 1);
  });

  it('should be able to select a FHIR server and a patient', function() {
    browser.get(mainPageURL);
    var urlField = '#fhirServerURL';
    browser.wait(EC.presenceOf($(urlField)), 5000);
    $(urlField).click();
    //util.sendKeys($(urlField), 'https://launch.smarthealthit.org/v/r3/fhir');
    util.sendKeys($(urlField), 'https://lforms-fhir.nlm.nih.gov/baseR4');
    $(urlField).sendKeys(protractor.Key.TAB);
    $('#btnOK').click();
    // Wait for dialog to close
    browser.wait(EC.not(EC.presenceOf($('#btnOk'))), 5000);
    // Wait for patient picker to open
    pickPatient();
    // Confirm patient is in context for form pre-population
    util.uploadFormWithTitleChange('R4/ussg-fhp.json');
    // Wait for name to be auto-filled (pre-population test)
    let nameField = element(by.id('/54126-8/54125-0/1/1'));
    browser.wait(EC.presenceOf(nameField), 2000);
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
        browser.wait(EC.presenceOf($(weightField)), 2000);
        $(weightField).click();
        util.clearField($(weightField));
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


    describe('saved QuestionnaireResponses', function() {
      it('should provide data for observationLinkPeriod from a saved questionnaire', function() {
        // Continuing from the previous test
        // Clear the field so we can check it fills in again
        var weightField = '#\\/29463-7\\/1';
        util.clearField($(weightField));

        // open the saved q section
        util.expandAvailQs()
        //browser.wait(EC.presenceOf(element(by.css('#qList a.list-group-item:first-child')), 2000);

        util.pageObjects.firstSavedQ('Weight').click();

        let weight = $(weightField); // new copy of element
        browser.wait(EC.presenceOf(weight), 2000);
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
        util.deleteCurrentQuestionnaire(); // Clean up uploaded form
      });
    });


    describe('Editing saved values', function() {
      var familyMemberName = '#\\/54114-4\\/54138-3\\/1\\/1';

      it('should show a saved value', function () {
        // Save a new QuestionnaireResponse
        util.uploadFormWithTitleChange('R4/ussg-fhp.json');
        browser.wait(EC.presenceOf($(familyMemberName)), 2000);
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
        browser.wait(EC.presenceOf($(familyMemberName)), 2000);
        browser.wait(()=>$(familyMemberName).getAttribute('value').then(
          (val)=>val==''), 5000);
        // open the saved qr section
        util.expandSavedQRs();
        // Load the saved QR and check the value
        util.pageObjects.firstSavedQR().click();
        browser.wait(EC.presenceOf($(familyMemberName)));
        expect($(familyMemberName).getAttribute('value')).toBe('zz');
      });

      it('should show an edited value', function() {
        // Now edit the saved value in the previous test
        util.clearField($(familyMemberName));
        $(familyMemberName).click();
        $(familyMemberName).sendKeys('aa');
        $('#btn-save').click();
        util.waitForSpinnerStopped();
        // open the saved q section
        util.expandAvailQs();
        // Load a blank questionnaire to clear the fields
        util.safeClick(util.pageObjects.firstSavedUSSGQ());
        browser.wait(EC.presenceOf($(familyMemberName)));
        expect($(familyMemberName).getAttribute('value')).toBe('');
        /// open the saved qr section
        util.expandSavedQRs();
        // Load the saved QR and check the value
        util.pageObjects.firstSavedQR().click();
        browser.wait(EC.presenceOf($(familyMemberName)));
        expect($(familyMemberName).getAttribute('value')).toBe('aa');
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

    describe('Next & previous buttons in Questionnaire list', function() {
      var firstQNameCSS = '#qList .list-group-item:nth-child(3)';
      beforeAll(()=> {
        util.expandAvailQs();
      });

      it('should initially have a next button and a disabled previous button', function() {
        expect($('#prevQPage').getAttribute('disabled')).toBe('true');
        expect($('#nextQPage').getAttribute('disabled')).not.toBe('true');
      });

      it('should have a working next button on the first page', function() {
        // Get the name of the first questionnaire in the list.
        browser.wait(EC.presenceOf($(firstQNameCSS)), 2000);
        $(firstQNameCSS).getAttribute('id').then(function(origId) {
          util.safeClick($('#nextQPage'));
          // Wait for the text of the first item to be different
          browser.wait(function() {
            return $(firstQNameCSS).getAttribute('id').then(function(newId) {
              return origId != newId;
            }, function fail() {return false}); // "fail" handles stale element references
          }, 2000);
        });
      });

      it('should have a working previous button on the second page', function() {
        // Get the name of the first questionnaire in the list.
        $(firstQNameCSS).getAttribute('id').then(function(origId) {
          $('#prevQPage').click();
          // Wait for the text of the first item to be different
          browser.wait(function() {
            return $(firstQNameCSS).getAttribute('id').then(function(newId) {
              return origId != newId;
            }, function fail() {return false}); // "fail" handles stale element references
          }, 2000);
        });
      });

    });

    describe('Search Questionnaires', function() {

      it('should find a questionnaire by its title', function() {
        var title = 'Height';
        var ptField = '.lf-patient-search input';
        util.safeClick($('#search'));
        browser.wait(EC.presenceOf($(ptField)), 20000);
        $(ptField).sendKeys(title);
        browser.wait(EC.textToBePresentInElement($('md-virtual-repeat-container .item-title'), title), 2000);
        $(ptField).sendKeys(protractor.Key.ARROW_DOWN);
        $(ptField).sendKeys(protractor.Key.TAB);
        $('#btnOK').click();
        // Confirm questionnaire is displayed
        browser.wait(EC.presenceOf($('.lf-form-title > span')), 5000);
        browser.wait(EC.textToBePresentInElement($('.lf-form-title > span'), title), 2000);

      });

    });
  });

  describe('Featured Questionnaires', function() {
    const danielJohnsonID = 'smart-1186747';

    beforeAll(function() {
      browser.get(mainPageURL);
      var urlField = '#fhirServerURL';
      browser.wait(EC.presenceOf($(urlField)), 5000);
      $(urlField).click();
      util.sendKeys($(urlField), 'https://lforms-fhir.nlm.nih.gov/baseR4');
      $(urlField).sendKeys(protractor.Key.TAB);
      $('#btnOK').click();
      // Wait for dialog to close
      browser.wait(EC.not(EC.presenceOf($('#btnOk'))), 5000);
      // Wait for patient picker to open
      pickPatient('Daniel', 1); // "Daniel Johnson"

      // Create a height value
      let obsPromise =
        util.storeObservation('R4', danielJohnsonID, {"system": "http://loinc.org",
          "code": "8302-2"}, 'Quantity',
          {"value": 70.1, "system": "http://unitsofmeasure.org", "code": "[in_i]"});
      browser.wait(obsPromise);
    });


    it('should display a list of featured questionnaires when https://lforms-fhir.nlm.nih.gov/baseR4 is selected', function() {
      let featuredTab = element(by.id('fqList'));
      browser.wait(EC.presenceOf(featuredTab), 2000);
    });

    it('should display one of the questionnaires', function() {
      // Continue with form loaded in previous tests
      let firstFeaturedQ = element(by.id('54127-6-x'));
      browser.wait(EC.presenceOf(firstFeaturedQ), 2000);

      firstFeaturedQ.click();
      let name = element(by.id('/54126-8/54125-0/1/1'));
      browser.sleep(2000)
      browser.wait(EC.presenceOf(name), 2000);
    });

    it('should display the weight and height questionnaire with pre-populated data', function() {
      // Continue with form loaded in previous tests
      let secondFeaturedQ = element(by.id('55418-8-x'));
      browser.wait(EC.presenceOf(secondFeaturedQ), 2000);

      secondFeaturedQ.click();
      let height = element(by.id('/8302-2/1'));
      browser.sleep(2000)
      browser.wait(EC.presenceOf(height), 2000);
      expect(height.getAttribute('value')).toBe("70.1");
    });

    it('should not display a list of featured questionnaires when https://lforms-fhir.nlm.nih.gov/baseDstu3 is selected', function() {
      browser.get(mainPageURL);
      var urlField = '#fhirServerURL';
      browser.wait(EC.presenceOf($(urlField)), 5000);
      $(urlField).click();
      util.sendKeys($(urlField), 'https://lforms-fhir.nlm.nih.gov/baseDstu3');
      $(urlField).sendKeys(protractor.Key.TAB);
      $('#btnOK').click();
      // Wait for dialog to close
      browser.wait(EC.not(EC.presenceOf($('#btnOk'))), 5000);
      // Wait for patient picker to open
      pickPatient();

      let featuredTab = element(by.id('fqList'));
      browser.wait(EC.not(EC.presenceOf(featuredTab)), 5000);

    });

    it('should be able to accept a "server" parameter', function() {
      browser.get(mainPageURL+'?server=https://lforms-fhir.nlm.nih.gov/baseR4');
      pickPatient();
    });

    it('should display a list of featured questionnaires when https://lforms-fhir.nlm.nih.gov/baseR4 is provided through the "server" parameter', function() {
      browser.get(mainPageURL+'?server=https://lforms-fhir.nlm.nih.gov/baseR4');
      pickPatient();
      let featuredTab = element(by.id('fqList'));
      browser.wait(EC.presenceOf(featuredTab), 2000);
    });

    it('should NOT display a list of featured questionnaires when https://lforms-fhir.nlm.nih.gov/baseDstu3 is provided through the "server" parameter', function() {
      browser.get(mainPageURL+'?server=https://lforms-fhir.nlm.nih.gov/baseDstu3');
      pickPatient();
      let featuredTab = element(by.id('fqList'));
      browser.wait(EC.not(EC.presenceOf(featuredTab)), 5000);
    });

  });

});
