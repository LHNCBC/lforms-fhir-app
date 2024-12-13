import { util } from './util';

/**
 *  Selects a patient from the patient dialog.
 * @param paitentName the text to match the patient name
 * @param listItemNum the position (starting at 1) of the patient in the search
 * results list.
 */
function pickPatient(patientName, listItemNum) {
  if (!patientName) {
    patientName = 'Karen'; // "Karen Lewis"
    listItemNum = 1;
  }
  const ptField = '#resSelection';
  cy.get(ptField, { timeout: 20000 })
      .should('be.visible');
  // Intercept the last query which would contain '={patientName}', so as to
  // make sure results are returned from server before typing down arrows.
  // "Daniel J" may construct a query like 'name=Daniel&name=J'.
  cy.intercept('GET', patientName.split(' ').map(x => '*=' + x).join('') + '**').as('lastSearchQuery');
  cy.get(ptField)
      .type(patientName);
  cy.wait('@lastSearchQuery');
  cy.wait(200);
  cy.get('#searchResults')
      .should('contain.text', patientName);
  for (let i=0; i<listItemNum; ++i) {
    cy.get(ptField)
        .type('{downArrow}');
  }
  cy.get(ptField)
      .blur();
  cy.get('#resSelectBtn')
      .click();
  // Confirm patient info is in header
  cy.get('#ptName')
      .should('be.visible');
  cy.get('#ptName', { timeout: 10000 })
      .should('contain.text', patientName);
}

describe('Non-SMART connection to FHIR server', () => {
  Cypress.on('uncaught:exception', (err, runnable) => {
    // returning false here prevents Cypress from
    // failing the test from cross origin script
    return false
  });

  const mainPageURL = '/lforms-fhir-app/';

  after(() => {
    cy.task('cleanUpTmpFiles');
    cy.then(() => {
      return util.deleteTestResources();
    });
  });

  it('should be able to select an off-list FHIR server', () => {
    cy.visit(mainPageURL);
    // Note:  If this test fails, it might be because this particular server is
    // down.  In that case, feel free to replace it with another off-list
    // server.
    util.selectServerUsingDialog('http://wildfhir4.aegis.net/fhir4-0-1');
    pickPatient('a', 1);
  });

  it('should be able to select a FHIR server and a patient', () => {
    cy.visit(mainPageURL);
    util.selectServerUsingDialog('https://lforms-fhir.nlm.nih.gov/baseR4');
    // Wait for patient picker to open
    pickPatient();
    // Confirm patient is in context for form pre-population
    util.uploadFormWithTitleChange('R4/ussg-fhp.json');
    // Wait for name to be auto-filled (pre-population test)
    cy.byId('/54126-8/54125-0/1/1')
        .should('be.visible')
        .should('contain.value', 'Karen');
  });

  describe('After patient selection', () => {
    before(() => {
      cy.visit(mainPageURL+'?server=https://lforms-fhir.nlm.nih.gov/baseR4');
      pickPatient();
    });

    describe('Extracting observations', () => {
      Cypress.on('uncaught:exception', (err, runnable) => {
        // returning false here prevents Cypress from
        // failing the test from cross origin script
        return false
      });

      it('should be able to save extracted observations', () => {
        util.uploadFormWithTitleChange('R4/weight-height-questionnaire.json');
        cy.get('#\\/29463-7\\/1')
            // For some reason I need to put .focus() here because Cypress .clear() sometimes
            // fails silently.
            .focus()
            .clear()
            .type('50');
        util.saveAsQRAndObs();
        util.waitForSpinnerStopped();
        cy.get('#saveResultsStatus')
            .should('contain.text', 'Save succeeded');
        cy.get('#saveResultsList')
            .should('contain.text', 'Created Observation');
        util.closeSaveResultsDialog();
      });
    });

    describe('saved QuestionnaireResponses', () => {
      it('should provide data for observationLinkPeriod from a saved questionnaire', () => {
        // Continuing from the previous test
        // Clear the field so we can check it fills in again
        const weightField = '#\\/29463-7\\/1';
        cy.get(weightField)
            .focus()
            .clear();

        // open the saved q section
        util.expandAvailQs();

        util.pageObjects.firstSavedQ('Weight').click();
        cy.get(weightField)
            .should('be.visible')
            .should('contain.value', '50')
            .invoke('val')
            .should('match', /^50/);
      });

      it('should have working expressions', () => {
        // Continue with form loaded in previous tests
        cy.byId('/8302-2/1')
            .clear()
            .type('30');
        cy.byId('/29463-7/1')
            .clear()
            .type('20');
        cy.byId('/39156-5/1')
            .should('have.value', '34.4');
      });
    });

    describe('Editing saved values', () => {
      const familyMemberName = '#\\/54114-4\\/54138-3\\/1\\/1';

      it('should show a saved value', () => {
        // Save a new QuestionnaireResponse
        util.uploadFormWithTitleChange('R4/ussg-fhp.json');
        cy.get(familyMemberName)
            .should('be.visible')
            .type('zz');
        util.saveAsQR();
        util.waitForSpinnerStopped();
        // check if qr.author is saved
        util.getQRUrlFromDialog().then((url) => {
          return util.getResouceByUrl(url).then((res) => {
            expect(res.author).to.be.undefined;
          });
        });
        util.closeSaveResultsDialog();
        // Load a blank questionnaire to clear the fields
        util.expandAvailQs();
        util.pageObjects.firstSavedUSSGQ()
            .click();
        cy.get(familyMemberName)
            .should('be.visible')
            .should('have.value', '');
        // open the saved qr section
        util.expandSavedQRs();
        // Load the saved QR and check the value
        util.pageObjects.firstSavedQR().click();
        cy.get(familyMemberName)
            .should('be.visible')
            .should('have.value', 'zz');
      });

      it('should show an edited value', () => {
        // Now edit the saved value in the previous test
        cy.get(familyMemberName)
            .focus()
            .clear()
            .type('aa');
        cy.get('#btn-save')
            .click();
        util.waitForSpinnerStopped();
        util.closeSaveResultsDialog();
        // open the saved q section
        util.expandAvailQs();
        // Load a blank questionnaire to clear the fields
        util.pageObjects.firstSavedUSSGQ()
            .click();
        cy.get(familyMemberName)
            .should('be.visible')
            .should('have.value', '');
        /// open the saved qr section
        util.expandSavedQRs();
        // Load the saved QR and check the value
        util.pageObjects.firstSavedQR()
            .click();
        cy.get(familyMemberName)
            .should('be.visible')
            .should('have.value', 'aa');
      });
    });

    describe('Delete saved values', () => {
      const familyMemberName = '#\\/54114-4\\/54138-3\\/1\\/1';

      it('should delete a saved QuestionnaireResponse', () => {
        // Save a new QuestionnaireResponse
        util.uploadFormWithTitleChange('R4/ussg-fhp.json');
        // Have to wait a bit or familyMemberName might get detached from DOM.
        // Can't get hold of an exact element/event to monitor for this purpose.
        cy.wait(200);
        cy.get(familyMemberName)
            .should('be.visible')
            .click()
            .type('to be deleted')
            .should('have.value', 'to be deleted');
        util.saveAsQR();
        util.closeSaveResultsDialog();
        // Load a blank questionnaire to clear the fields
        util.expandAvailQs();
        util.pageObjects.firstSavedUSSGQ()
            .click();
        cy.get(familyMemberName)
            .should('be.visible')
            .should('have.value', '');
        // open the saved qr section
        util.expandSavedQRs();
        // Load the saved QR and check the value
        util.pageObjects.firstSavedQR()
            .click();
        cy.get(familyMemberName)
            .should('be.visible')
            .should('have.value', 'to be deleted');
        util.deleteCurrentQR();
        util.pageObjects.initialMessageDiv()
            .should('be.visible');
      });

      it('should delete a saved QuestionnarieResponse and associated Observations', () => {
        // Save a new QuestionnaireResponse
        util.uploadFormWithTitleChange('R4/ussg-fhp.json');
        cy.get(familyMemberName)
            .should('be.visible')
            .click()
            .type('to be deleted2');
        util.saveAsQRAndObs();
        util.waitForSpinnerStopped();
        // check if qr.author is saved
        util.getQRUrlFromDialog().then(function(url) {
          return util.getResouceByUrl(url).then(function(res) {
            expect(res.author).to.be.undefined;
          });
        });

        util.closeSaveResultsDialog();
        // Load a blank questionnaire to clear the fields
        util.expandAvailQs();
        util.pageObjects.firstSavedUSSGQ()
            .click();
        cy.get(familyMemberName)
            .should('be.visible')
            .should('have.value', '');
        // open the saved qr section
        util.expandSavedQRs();
        // Load the saved QR and check the value
        util.pageObjects.firstSavedQR()
            .click();
        cy.get(familyMemberName)
            .should('be.visible')
            .should('have.value', 'to be deleted2');
        util.deleteCurrentQR();
        util.pageObjects.initialMessageDiv()
            .should('be.visible');
      });
    });

    describe('Next & previous buttons in Questionnaire list', () => {
      const firstQNameCSS = '#qListItems .form-name:first-child';

      before(() => {
        // Add a form with a unique title, so we can be sure of the list
        // changing.
        util.uploadFormWithTitleChange('R4/ussg-fhp.json');
        util.saveAsQR();
        util.closeSaveResultsDialog();
        util.expandAvailQs();
      });

      it('should initially have a next button and a disabled previous button', () => {
        cy.get('#qPrevPage')
            .should('have.attr', 'disabled');
        cy.get('#qNextPage')
            .should('not.have.attr', 'disabled');
      });

      it('should have a working next button on the first page', () => {
        // Get the name of the first questionnaire in the list.
        cy.get(firstQNameCSS)
            .should('be.visible')
            .invoke('text')
            .then((origVal) => {
              cy.get(firstQNameCSS)
                  .should('have.text', origVal);
              cy.get('#qNextPage')
                  .click();
              // Wait for the text of the first item to be different
              cy.get(firstQNameCSS)
                  .should('not.have.text', origVal);
            });
      });

      it('should have a working previous button on the second page', () => {
        // Get the name of the first questionnaire in the list.
        cy.get(firstQNameCSS)
            .invoke('text')
            .then((origVal) => {
              cy.get(firstQNameCSS)
                  .should('have.text', origVal);
              cy.get('#qPrevPage')
                  .click();
              // Wait for the text of the first item to be different
              cy.get(firstQNameCSS)
                  .should('not.have.text', origVal);
            });
      });
    });

    describe('Search Questionnaires', () => {
      before(() => {
        util.expandAvailQs();
      });

      it('should find a questionnaire by its title', () => {
        const title = 'Height';
        const ptField = '#resSelection';
        cy.get('#search')
          .click();
        cy.get(ptField)
          .should('be.visible')
          .type(title);
        cy.get('#searchResults')
          .should('contain.text', title);
        cy.get(ptField)
          .type('{downArrow}')
          .blur();
        cy.get('#resSelectBtn')
          .click();
        // Confirm questionnaire is displayed
        cy.get('.lhc-form-title > span')
          .should('be.visible')
          .should('contain.text', title);
      });

      it('should prefix "," with "\\" in FHIR search param', () => {
        const title = 'vital signs, weight';
        const ptField = '#resSelection';
        // "vital signs\, weight"
        cy.intercept('**/Questionnaire?title=vital+signs%5C%2C+weight&_count=7')
          .as('fhirSearchQuery');
        cy.get('#search')
          .click();
        cy.get(ptField)
          .should('be.visible')
          .type(title);
        cy.wait('@fhirSearchQuery');
      });
    });
  });

  describe('Featured Questionnaires', () => {
    const danielJohnsonID = 'smart-1186747';

    before(() => {
      cy.visit(mainPageURL+'?server=https://lforms-fhir.nlm.nih.gov/baseR4');
      // Wait for patient picker to open
      pickPatient('Daniel J', 1); // "Daniel Johnson"
      // Create a height value
      util.storeObservation('R4', danielJohnsonID, {"system": "http://loinc.org",
            "code": "8302-2"}, 'Quantity',
          {"value": 70.1, "system": "http://unitsofmeasure.org", "code": "[in_i]"});
    });

    it('should display a list of featured questionnaires when https://lforms-fhir.nlm.nih.gov/baseR4 is selected', () => {
      cy.byId('fqList')
          .should('be.visible');
    });

    it('should display one of the questionnaires', () => {
      cy.byId('54127-6-x')
          .should('be.visible')
          .click();
      cy.byId('/54126-8/54125-0/1/1')
          .should('be.visible');
    });

    it('should display the weight and height questionnaire with pre-populated data', () => {
      cy.byId('55418-8-x')
          .should('be.visible')
          .click();
      cy.byId('/8302-2/1')
          .should('be.visible')
          .should('have.value', '70.1');
    });

    it('should not display a list of featured questionnaires when https://lforms-fhir.nlm.nih.gov/baseDstu3 is selected', () => {
      // Note this is a test of the behavior with the dialog; the server
      // parameter is tested below.
      cy.visit(mainPageURL);
      util.selectServerUsingDialog('https://lforms-fhir.nlm.nih.gov/baseDstu3');
      pickPatient();
      cy.byId('fqList')
          .should('not.be.visible');
    });

    it('should be able to accept a "server" parameter', () => {
      cy.visit(mainPageURL+'?server=https://lforms-fhir.nlm.nih.gov/baseR4');
      pickPatient();
    });

    it('should display a list of featured questionnaires when https://lforms-fhir.nlm.nih.gov/baseR4 is provided through the "server" parameter', () => {
      cy.visit(mainPageURL+'?server=https://lforms-fhir.nlm.nih.gov/baseR4');
      pickPatient();
      cy.byId('fqList')
          .should('be.visible');
    });

    it('should NOT display a list of featured questionnaires when https://lforms-fhir.nlm.nih.gov/baseDstu3 is provided through the "server" parameter', () => {
      cy.visit(mainPageURL+'?server=https://lforms-fhir.nlm.nih.gov/baseDstu3');
      pickPatient();
      cy.byId('fqList')
          .should('not.be.visible');
    });
  });
});
