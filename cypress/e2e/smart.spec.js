// Tests required the SMART on FHIR connection.
import { util } from './util';
const po = util.pageObjects;

describe('SMART on FHIR connection', () => {
  describe('STU3 server', () => {
    it('should launch smart app', () => {
      util.launchSmartAppInSandbox('r3');
    });

    // Continued from previous test. The tests had to be separated because Cyress
    // does not allow working on two domains in a single test.
    it('should NOT display a list of featured questionnaires', () => {
      // Wait for the server resources to finish loading.
      cy.get('#collapse-three')
          .should('be.visible')
          // Wait for the Loading message to go away.
          // The element is still in DOM but not displayed.
          .contains('Loading')
          .should('not.be.visible');

      cy.byId('fqList')
          .should('not.be.visible');
    });
  });

  describe('R4 server', () => {
    before(() => {
      // Create a height value
      const danielJohnsonID = 'smart-1186747';
      util.storeObservation('R4', danielJohnsonID, {"system": "http://loinc.org",
            "code": "8302-2"}, 'Quantity',
          {"value": 70.1, "system": "http://unitsofmeasure.org", "code": "[in_i]"});

      util.launchSmartAppInSandbox();
      cy.get('#ptName')
          .should('be.visible')
          .should('contain.text', 'Daniel');
      cy.get('#userName')
          .should('contain.text', 'Susan Clark');
    });

    after(() => {
      cy.task('cleanUpTmpFiles');
      cy.then(() => {
        return util.deleteTestResources();
      });
    });

    describe('Featured Questionnaires', () => {
      it('should display a list of featured questionnaires when R4 server is used', () => {
        cy.byId('fqList')
            .should('be.visible');
      });

      it('should display the weight and height questionnaire with pre-populated data', () => {
        const height = '/8302-2/1';
        cy.byId('55418-8-x')
            .should('be.visible')
            .click();
        cy.byId(height, { timeout: 200000 })
            .should('be.visible')
            .should('have.length.greaterThan', 0);
      });
    });

    describe('saved form', () => {
      Cypress.on('uncaught:exception', (err, runnable) => {
        // returning false here prevents Cypress from
        // failing the test from cross origin script
        return false
      });

      before(() => {
        // Upload, edit, and save a form.
        util.uploadFormWithTitleChange('R4/ussg-fhp.json');
        // Wait for name to be auto-filled (pre-population test)
        cy.byId('/54126-8/54125-0/1/1')
            .should('be.visible')
            .should('contain.value', 'Daniel');
        // Enter a height value
        cy.byId('/54126-8/8302-2/1/1')
            .should('be.visible')
            .focus()
            .clear()
            .type('70');
        cy.get('#btn-save-as')
            .click();
        cy.get('#createQRToFhir')
            .click();
        util.waitForSpinnerStopped();
        util.closeSaveResultsDialog();
      });

      it ('should display a saved form', () => {
        // Wait for the first saved questionnaire to be this form.
        // open the saved q section
        util.expandAvailQs();
        po.firstSavedUSSGQ()
            .should('contain.text', 'Surgeon');
        // Open the form and wait for it to render
        po.firstSavedUSSGQ()
            .click();
        util.waitForSpinnerStopped();
        const height = '/54126-8/8302-2/1/1';
        // Confirm that the edited field value is no longer there.
        cy.byId(height) // new on page
            .should('be.visible')
            .should('not.have.value', '70');
        // Confirm that a warning message (about an unknown FHIR version) is not shown.
        cy.get('.warning')
            .should('not.exist');

        // Now open up the saved QuestionnaireResponse and confirm we can see the
        // saved value.
        // open the saved qr section
        util.expandSavedQRs();
        cy.get('#qrList a:first-child')
            .click();
        cy.byId(height, { timeout: 15000 })
            .should('be.visible');
        cy.byId(height) // new on page
            .should('have.value', '70');
        // Confirm that a warning message (about an unknown FHIR version) is not shown.
        cy.get('.warning')
            .should('not.exist');
        // open the saved q section
        util.expandAvailQs();
      });
    });

    it('should provide data for observationLinkPeriod', () => {
      util.uploadFormWithTitleChange('R4/weight-height-questionnaire.json');
      const height = '/8302-2/1';
      cy.byId(height)
          .should('be.visible')
          .should('have.length.greaterThan', 0);
    });

    describe('ValueSet search', () => {
      before(() => {
        util.uploadFormWithTitleChange('R4/ussg-fhp.json');
      });

      it ('should work via the FHIR client', () => {
        const ethnicityID = '/54126-8/54133-4/1/1';
        cy.wait(50);
        cy.byId(ethnicityID)
            .type('ar');
        util.autoCompHelpers.waitForSearchResults();
        util.autoCompHelpers.searchResult(1)
            .click();
        cy.byId(ethnicityID)
            .should((el) => {
              const selectedItems = el[0].autocomp.getSelectedItems();
              expect(selectedItems).to.deep.equal(['Argentinean']);
            });
      });

      it('should work via a terminology server', () => {
        const diseasesID = '/54126-8/54137-5/54140-9/1/1/1';
        cy.byId(diseasesID)
            .type('ar');
        util.autoCompHelpers.waitForSearchResults();
        util.autoCompHelpers.searchResult(1)
            .click();
        cy.byId(diseasesID)
            .should('have.value', 'Arm pain');
      });
    });

    describe('Saved QuestionnaireResponses', () => {
      after(() => {
        cy.task('cleanUpTmpFiles');
      });

      ['R4', 'STU3'].forEach(function(fhirVersion) {
        describe(fhirVersion, () => {
          it('should have working answer lists', () => {
            const prefix = 'LHC-Forms-Test-WHQ-'+fhirVersion+'-';
            util.uploadFormWithTitleChange(fhirVersion+'/weight-height-questionnaire.json',
                prefix);
            const bodyPos = '/8361-8/1';
            cy.byId(bodyPos)
                .should('be.visible');

            util.saveAsQRAndObs();
            util.waitForSpinnerStopped();
            // check if qr.author is saved
            util.getQRUrlFromDialog().then((url) => {
                return util.getResouceByUrl(url).then((res) => {
                    expect(res.author).to.deep.equal({
                        reference: 'Practitioner/smart-Practitioner-71482713',
                        type: 'Practitioner',
                        display: 'Susan Clark'
                    });
                });
            });
            util.closeSaveResultsDialog();
            /// open the saved qr section
            util.expandSavedQRs();
            // Wait for the saved questionnaire response to be this page.
            po.firstSavedQR(prefix)
                .click();
            cy.byId(bodyPos) // get new copy of field
                .should('be.visible')
                .click();
            cy.get('#searchResults')
                .should('be.visible');
          });
        });
      });
    });

    describe('Delete saved values', () => {
      const familyMemberName = '#\\/54114-4\\/54138-3\\/1\\/1';

      it('should delete a saved QuestionnaireResponse', () => {
        // Save a new QuestionnaireResponse
        util.uploadFormWithTitleChange('R4/ussg-fhp.json');
        cy.get(familyMemberName)
            .should('be.visible')
            .click()
            .type('to be deleted');
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
        util.getQRUrlFromDialog().then((url) => {
            return util.getResouceByUrl(url).then((res) => {
                expect(res.author).to.deep.equal({
                    reference: 'Practitioner/smart-Practitioner-71482713',
                    type: 'Practitioner',
                    display: 'Susan Clark'
                });
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

    describe("'Show' Menu", () => {
      const msgBody = '#messageBody';

      before(() => {
        // Load a form
        util.uploadFormWithTitleChange('R4/ussg-fhp.json');
        cy.get('.lhc-form-title')
            .should('contain.text', 'Surgeon');
        // Save the form
        util.saveAsQR();
        util.waitForSpinnerStopped();
        util.closeSaveResultsDialog();
        /// open the saved qr section
        util.expandSavedQRs();
        // Load the first QR
        po.firstSavedQR()
            .should('contain.text', 'Surgeon')
            .click();
        util.waitForSpinnerStopped();
      });

      describe('Questionnaire from Server', () => {
        before(() => {
          util.showAsQuestionnaireFromServer();
        });

        after(() => {
          util.closeResDialog();
        });

        it('should open the dialog', () => {
          cy.get(msgBody)
              .should('be.visible');
        });

        it('should contain a Questionnaire resource', () => {
          cy.get(msgBody)
              .should('contain.text', '"resourceType": "Questionnaire"');
        });
      });

      describe('SDC Questionnaire', () => {
        before(() => {
          util.showAsQuestionnaire();
        });

        after(() => {
          util.closeResDialog();
        });

        it('should open the dialog', () => {
          cy.get(msgBody)
              .should('be.visible');
        });

        it('should contain a Questionnaire resource', () => {
          cy.get(msgBody)
              .should('contain.text', '"resourceType": "Questionnaire"');
        });

        it('should be an SDC questionnaire', () => {
          cy.get(msgBody)
              .should('contain.text', 'sdc-questionnaire');
        });
      });

      describe('SDC QuestionnaireResponse', () => {
        before(() => {
          util.showAsQuestionnaireResponse();
        });

        after(() => {
          util.closeResDialog();
        });

        it('should open the dialog', () => {
          cy.get(msgBody)
              .should('be.visible');
        });

        it('should contain a QuestionnaireResponse resource', () => {
          cy.get(msgBody)
              .should('contain.text', '"resourceType": "QuestionnaireResponse"');
        });

        it('should be an SDC QuestionnaireResponse', () => {
          cy.get(msgBody)
              .should('contain.text', 'sdc-questionnaire');
        });

        it('should set subject and author', () => {
          cy.get(msgBody)
            .invoke('text')
            .then((text) => {
              const data = JSON.parse(text);
              expect(data.author).to.deep.equal({
                reference: 'Practitioner/smart-Practitioner-71482713',
                type: 'Practitioner',
                display: 'Susan Clark'
              });
              expect(data.subject).to.deep.equal({
                reference: 'Patient/smart-1186747',
                display: 'Daniel Johnson'
              });
            });
        });
      });
    });
  });
});
