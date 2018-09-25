'use strict';
var path = require('path');

describe('fhir app', function() {

  var title = element(by.id('siteName'));

  describe('Main View', function() {

    it('should render a page without any data', function() {
      browser.ignoreSynchronization = false;
      browser.get('/');
      browser.wait(function() {
        return title.isDisplayed();
      }, 5000);
      expect(element.all(by.css('.panel-heading .panel-title')).first().getText()).
        toMatch(/Saved QuestionnaireResponses/);
    });

  });

  describe("Load Button", function() {

    var fileInput = element(by.css('input[type=file]'));

    it("should load a Questionnaire file", function() {
      browser.ignoreSynchronization = false;
      browser.get('/');
      browser.wait(function() {
        return title.isDisplayed();
      }, 5000);
      let qFilePath = path.resolve(__dirname, 'data/weight-height-questionnaire.json');
      // For Firefox, the file input field needs to be visible before it will
      // accept input.
      browser.executeScript('arguments[0].classList.toggle("hide")', fileInput.getWebElement());
      fileInput.sendKeys(qFilePath);
      browser.executeScript('arguments[0].classList.toggle("hide")', fileInput.getWebElement());
      var EC = protractor.ExpectedConditions;
      browser.waitForAngular();
      browser.wait(EC.textToBePresentInElement(element(by.css('.lf-form-title')), "Weight"), 5000);
    });
  });

});
