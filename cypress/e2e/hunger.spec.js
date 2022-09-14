// Tests the Hunger Vital Signs form.
import { util } from './util';

describe('Hunger Vital Signs form', () => {
  before(() => {
    cy.visit(util.mainPageURL);
    util.dismissFHIRServerDialog();  // not needed currently; might be later
    util.uploadForm('R4/hunger-vital-signs.json');
  });

  const riskElem = '#\\/88124-3\\/1';

  it('should start out with an empty risk assessment', () => {
    cy.get(riskElem)
        .should('have.value', '');
  });

  it('should have a risk status of "no risk" if "never or "don\'t know" is chosen', () => {
    util.autocompPickNth('#\\/88122-7\\/1', '', 3);
    cy.get(riskElem)
        .should('have.value', 'No risk');
  });

  it('should have a risk status of "at risk" if "often" or "sometimes" is chosen', () => {
    util.autocompPickNth('#\\/88123-5\\/1', '', 1);
    cy.get(riskElem)
        .should('have.value', 'At risk');
  });
});
