// For tests that do not interact with the FHIR server
import { util } from './util';

describe('fhir app', () => {
  const title = 'siteName';
  const mainPageURL = util.mainPageURL;

  describe('Main View', () => {
    it('should render a page without any data', () => {
      cy.visit(mainPageURL);
      util.dismissFHIRServerDialog();
      cy.byId(title)
          .should('be.visible');
      cy.get('.panel-heading .panel-title')
          .eq(0)
          .invoke('text')
          .should('match', /Saved QuestionnaireResponses/);
    });

    it('should have a link to a sample Questionnaire', () => {
      cy.get('#sampleQ')
          // Cypress does not allow multiple browser windows/tabs,
          // remove the 'target' attribute before opening the link.
          .invoke('removeAttr', 'target')
          .click();
      // Wait for navigation.
      cy.location('pathname')
          .should('include', '.json');
      cy.window().then((win) => {
        let json = win.document.body.firstChild.innerHTML;
        expect(json.indexOf('"resourceType": "Questionnaire"')).to.be.greaterThan(-1);
      });
    });
  });

  describe("Load Button", () => {
    const height = '/8302-2/1',
        weight = '/29463-7/1',
        bmi = '/39156-5/1';

    it("should load a Questionnaire file", () => {
      cy.visit(mainPageURL);
      util.dismissFHIRServerDialog();
      cy.byId(title)
          .should('be.visible');
      util.uploadForm('R4/weight-height-questionnaire.json');
      cy.get('.lhc-form-title')
          .should('contain.text', 'Weight');

      // BMI
      cy.byId(height)
          .type('70');
      cy.byId(bmi)
          .should('have.value', '');
      cy.byId(weight)
          .type('70');
      cy.byId(bmi)
          .should('have.value', '22.1');
      cy.byId(height)
          .clear()
          .type('80');
      cy.byId(bmi)
          .should('have.value', '17');
    });
  });

  describe('R4 examples', () => {
    it('should have working answer lists', () => {
      cy.visit(mainPageURL);
      util.dismissFHIRServerDialog();
      util.uploadForm('R4/weight-height-questionnaire.json');
      cy.byId('/8361-8/1')
          .click();
      cy.get('#searchResults')
          .should('be.visible');
    });

    describe('vital signs panel', () => {
      it('should compute the correct BMI based on units', () => {
        function setUnit(field, unit) {
          cy.byId(field)
              .clear()
              .type(unit)
              .blur();
        }

        cy.visit(mainPageURL);
        util.dismissFHIRServerDialog();
        let weightNum = '/3141-9/1';
        let weightUnit = 'unit_/3141-9/1';
        let heightNum = '/8302-2/1';
        let heightUnit = 'unit_/8302-2/1';
        let bmi = '/39156-5/1';
        util.uploadForm('R4/vital-sign-questionnaire.json');
        cy.byId(weightNum)
            .type('70');
        cy.byId(heightNum)
            .type('5');
        // lbs and inches
        setUnit(weightUnit, 'lbs');
        setUnit(heightUnit, 'inches');
        cy.byId(bmi)
            .should('have.value', '1968.6');
        // kgs and inches
        setUnit(weightUnit, 'kgs');
        cy.byId(bmi)
            .should('have.value', '4340');
        // kgs and feet
        setUnit(heightUnit, 'feet');
        cy.byId(bmi)
            .should('have.value', '30.1');
        // kgs and centimeters
        setUnit(heightUnit, 'centimeters');
        cy.byId(bmi)
            .should('have.value', '28000');
        // kgs and meters
        setUnit(heightUnit, 'meters');
        cy.byId(bmi)
            .should('have.value', '2.8');
      });
    });
  });

  describe('STU3 examples', () => {
    it('should have working answer lists', () => {
      cy.visit(mainPageURL);
      util.dismissFHIRServerDialog();
      util.uploadForm('STU3/weight-height-questionnaire.json');
      cy.byId('/8361-8/1')
          .click();
      cy.get('#searchResults')
          .should('be.visible');
    });
  });
});
