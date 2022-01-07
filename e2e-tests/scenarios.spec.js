// For tests that do not interact with the FHIR server
'use strict';
var path = require('path');
var util = require('./util');
var po = util.pageObjects;
var EC = protractor.ExpectedConditions;

describe('fhir app', function() {

  var title = element(by.id('siteName'));
  let mainPageURL = util.mainPageURL;

  describe('Main View', function() {

    it('should render a page without any data', function() {
      browser.get(mainPageURL);
      util.dismissFHIRServerDialog();
      browser.wait(function() {
        return title.isDisplayed();
      }, 5000);
      expect(element.all(by.css('.panel-heading .panel-title')).first().getText()).
        toMatch(/Saved QuestionnaireResponses/);
    });

    it('should have a link to a sample Questionnaire', function() {
      util.waitForNewWindow(function() {$('#sampleQ').click()});
      util.runInNewestWindow(function() {
        let contentPromise = browser.driver.executeScript('return document.body.firstChild.innerHTML');
        return contentPromise.then(function(json) {
          expect(json.indexOf('"resourceType": "Questionnaire"')).toBeGreaterThan(-1);
        });
      });
    });
  });

  describe("Load Button", function() {
    var height = element(by.id('/8302-2/1')),
        weight = element(by.id('/29463-7/1')),
        bmi = element(by.id('/39156-5/1'));

    it("should load a Questionnaire file", function() {
      browser.get(mainPageURL);
      util.dismissFHIRServerDialog();
      browser.wait(function() {
        return title.isDisplayed();
      }, 5000);
      util.uploadForm('R4/weight-height-questionnaire.json');

      browser.wait(EC.textToBePresentInElement(element(by.css('.lhc-form-title')), "Weight"), 5000);

      // BMI
      height.sendKeys("70");
      expect(bmi.getAttribute('value')).toBe("");
      weight.sendKeys("70");
      expect(bmi.getAttribute('value')).toBe("22.1");
      height.clear();
      height.sendKeys("80");
      expect(bmi.getAttribute('value')).toBe("17");
    });

    describe('Warnings or errors', function () {
      let tmpObj;
      beforeEach(function() {
        let tmp = require('tmp');
        tmpObj = tmp.fileSync();
      });
      afterEach(function() {
        tmpObj.removeCallback();
      });

      it("should show an error message if the FHIR version is not supported", function() {
        // Edit a working sample file.
        browser.get(mainPageURL);
        util.dismissFHIRServerDialog();
        let qFilePath = path.resolve(__dirname, 'data',
          'R4/weight-height-questionnaire.json');
        let fs = require('fs');
        let qData = JSON.parse(fs.readFileSync(qFilePath));
        qData.meta.profile = ['http://hl7.org/fhir/1.0/StructureDefinition/Questionnaire'];
        fs.writeFileSync(tmpObj.name, JSON.stringify(qData, null, 2));
        util.uploadForm(tmpObj.name);
        expect($('.error').isDisplayed()).toBe(true);
      });

      // In the rewrite to remove AngularJs, I decided this warning was not necessary.
      /*
      it("should show a warning message if the FHIR version was guessed", function() {
        // Edit a working sample file.
        browser.get(mainPageURL);
        util.dismissFHIRServerDialog();
        let qFilePath = path.resolve(__dirname, 'data',
          'R4/weight-height-questionnaire.json');
        let fs = require('fs');
        let qData = JSON.parse(fs.readFileSync(qFilePath));
        delete qData.meta;
        fs.writeFileSync(tmpObj.name, JSON.stringify(qData, null, 2));
        util.uploadForm(tmpObj.name);
        expect($('.warning').isDisplayed()).toBe(true);
      });

      it("should remove the warning if a new files is loaded with the "+
         "FHIR version specified", function () {
        // This test requires the previous one to have shown a warning.
        // Load a file that shouldn't trigger a warning.
        util.uploadForm('R4/weight-height-questionnaire.json');
        expect($('.warning').isPresent()).toBe(false);
      });
      */
    });
  });


  describe('R4 examples', function() {
    it('should have working answer lists', function() {
      browser.get(mainPageURL);
      util.dismissFHIRServerDialog();
      util.uploadForm('R4/weight-height-questionnaire.json');
      let bodyPos = element(by.id('/8361-8/1'));
      bodyPos.click();
      expect(po.answerList.isDisplayed()).toBeTruthy();
    });

    describe('vital signs panel', function() {
      it('should compute the correct BMI based on units', function() {
        function setUnit(field, unit) {
          util.clearField(field);
          field.click();
          field.sendKeys(unit);
          field.sendKeys(protractor.Key.TAB);
        }

        browser.get(mainPageURL);
        util.dismissFHIRServerDialog();
        let weightNum = element(by.id('/3141-9/1'));
        let weightUnit = element(by.id('unit_/3141-9/1'));
        let heightNum = element(by.id('/8302-2/1'));
        let heightUnit = element(by.id('unit_/8302-2/1'));
        let bmi = element(by.id('/39156-5/1'));
        util.uploadForm('R4/vital-sign-questionnaire.json');
        weightNum.sendKeys('70');
        heightNum.sendKeys('5');
        // lbs and inches
        setUnit(weightUnit, 'lbs');
        setUnit(heightUnit, 'inches');
        expect(bmi.getAttribute('value')).toBe('1968.6');
        // kgs and inches
        setUnit(weightUnit, 'kgs');
        expect(bmi.getAttribute('value')).toBe('4340');
        // kgs and feet
        setUnit(heightUnit, 'feet');
        expect(bmi.getAttribute('value')).toBe('30.1');
        // kgs and centimeters
        setUnit(heightUnit, 'centimeters');
        expect(bmi.getAttribute('value')).toBe('28000');
        // kgs and meters
        setUnit(heightUnit, 'meters');
        expect(bmi.getAttribute('value')).toBe('2.8');
      }, 200000);
    });
  });


  describe('STU3 examples', function() {
    it('should have working answer lists', function() {
      browser.get(mainPageURL);
      util.dismissFHIRServerDialog();
      util.uploadForm('STU3/weight-height-questionnaire.json');
      let bodyPos = element(by.id('/8361-8/1'));
      bodyPos.click();
      expect(po.answerList.isDisplayed()).toBeTruthy();
    });
  });

});
