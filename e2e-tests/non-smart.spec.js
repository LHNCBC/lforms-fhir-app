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
    listItemNum = 3;
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
    util.uploadForm('R4/ussg-fhp.json');
    // Wait for name to be auto-filled (pre-population test)
    let nameField = element(by.id('/54126-8/54125-0/1/1'));
    browser.wait(EC.presenceOf(nameField), 2000);
    browser.wait(EC.textToBePresentInElementValue(nameField, 'Karen'), 2000);
  });

  describe('Extracting observations', function() {

    it('should be able to accept a "server" parameter', function() {
      browser.get(mainPageURL+'?server=https://lforms-fhir.nlm.nih.gov/baseR4');
      pickPatient();
    });

    it('should be able to save extracted observations', function () {
      util.uploadForm('R4/weight-height-questionnaire.json');
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
      element(by.css("#heading-three a")).click();
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
      util.uploadForm('R4/ussg-fhp.json');
      browser.wait(EC.presenceOf($(familyMemberName)), 2000);
      $(familyMemberName).click();
      $(familyMemberName).sendKeys('zz');
      util.saveAsQR();
      util.closeSaveResultsDialog();
      // Load a blank questionnaire to clear the fields
      util.pageObjects.firstSavedUSSGQ().click();
      browser.wait(EC.presenceOf($(familyMemberName)));
      expect($(familyMemberName).getAttribute('value')).toBe('');
      // open the saved qr section
      element(by.css("#heading-one a")).click();
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
      element(by.css("#heading-three a")).click();
      // Load a blank questionnaire to clear the fields
      util.pageObjects.firstSavedUSSGQ().click();
      browser.wait(EC.presenceOf($(familyMemberName)));
      expect($(familyMemberName).getAttribute('value')).toBe('');
      /// open the saved qr section
      element(by.css("#heading-one a")).click();
      // Load the saved QR and check the value
      util.pageObjects.firstSavedQR().click();
      browser.wait(EC.presenceOf($(familyMemberName)));
      expect($(familyMemberName).getAttribute('value')).toBe('aa');
      // open the saved q section
      element(by.css("#heading-three a")).click();
      util.deleteCurrentQuestionnaire(); // Clean up uploaded form
    });
  });


  describe('Next & previous buttons in Questionnaire list', function() {
    var firstQNameCSS = '#qList .list-group-item:nth-child(3)';


    it('should initially have a next button and a disabled previous button', function() {
      expect($('#prevQPage').getAttribute('disabled')).toBe('true');
      expect($('#nextQPage').getAttribute('disabled')).not.toBe('true');
    });

    it('should have a working next button on the first page', function() {
      // Get the name of the first questionnaire in the list.
      browser.wait(EC.presenceOf($(firstQNameCSS)), 2000);
      $(firstQNameCSS).getAttribute('id').then(function(origId) {
        $('#nextQPage').click();
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

  describe('Featured Questionnaires', function() {

    describe('Non-SMART', function() {
      it('should display a list of featured questionnaires when https://lforms-fhir.nlm.nih.gov/baseR4 is selected', function() {
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
        let weight = element(by.id('/8302-2/1'));
        browser.sleep(2000)
        browser.wait(EC.presenceOf(weight), 2000);
        expect(weight.getAttribute('value')).toBe("70.1");
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

});
