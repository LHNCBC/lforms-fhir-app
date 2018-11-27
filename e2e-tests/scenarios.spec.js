'use strict';
var path = require('path');
var util = require('./util');
var po = util.pageObjects;
var EC = protractor.ExpectedConditions;


describe('fhir app', function() {

  var title = element(by.id('siteName'));
  let mainPageURL = '/lforms-fhir-app/';

  describe('Main View', function() {

    it('should render a page without any data', function() {
      browser.ignoreSynchronization = false;
      browser.get(mainPageURL);
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
      browser.ignoreSynchronization = false;
      browser.get(mainPageURL);
      browser.wait(function() {
        return title.isDisplayed();
      }, 5000);
      util.uploadForm('R4/weight-height-questionnaire.json');

      browser.waitForAngular();
      browser.wait(EC.textToBePresentInElement(element(by.css('.lf-form-title')), "Weight"), 5000);

      // BMI
      height.sendKeys("70");
      expect(bmi.getAttribute('value')).toBe("");
      weight.sendKeys("70");
      expect(bmi.getAttribute('value')).toBe("22.1");
      height.clear();
      height.sendKeys("80");
      expect(bmi.getAttribute('value')).toBe("17");
    });
  });

  describe('R4 examples', function() {
    it('should have working answer lists', function() {
      browser.get(mainPageURL);
      util.uploadForm('R4/weight-height-questionnaire.json');
      let bodyPos = element(by.id('/8361-8/1'));
      bodyPos.click();
      expect(po.answerList.isDisplayed()).toBeTruthy();
    });
  });

  describe('STU3 examples', function() {
    it('should have working answer lists', function() {
      browser.get(mainPageURL);
      util.uploadForm('STU3/weight-height-questionnaire.json');
      let bodyPos = element(by.id('/8361-8/1'));
      bodyPos.click();
      expect(po.answerList.isDisplayed()).toBeTruthy();
    });
  });

});
