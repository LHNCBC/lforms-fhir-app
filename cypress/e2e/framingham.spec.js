// Tests the Framingham HCHD form.  This does not interact with the FHIR server.
import { util } from './util';

describe('Framingham HCHD risk form', () => {
  // These tests compare the output of the form with the output of a perl
  // script written by Mehmet Kayaalp, who diligently tested his script
  // against an online tool that no longer exists.
  // The purpose here is it be able to test changes to our form without
  // having to re-run the perl script.

  before(() => {
    cy.visit(util.mainPageURL);
    util.dismissFHIRServerDialog();
    util.uploadForm('R4/framingham-HCHD.json');
  });

  /**
   *  Returns true if the given value is not null or undefined or the empty
   *  string.
   */
  function hasValue(val) {
    return val !== '' && val !== null && val !== undefined;
  }

  /**
   *  Sets the given field to the given value, or clears it if no value is
   *  provided.
   */
  function setOrClear(field, val) {
    field.clear();
    if (hasValue(val)) {
      field.type(''+val);
    }
  }

  var lastAge, lastGender, lastSmokes, lastSystolic, lastTChol, lastHDL, lastAntihypert;

  /**
   *  Clears the framingham form and populates it with the given values,
   *  which should be strings or numbers, or in the case of "smokes" and "antihypert",
   *  booleans.
   */
  function populateForm(age, gender, smokes, systolic, tChol, hdl, antihypert) {
    // Setting field values is relatively slow.  Only set the ones we think
    // changed.
    if (age != lastAge) {
      setOrClear(cy.get('#\\/age\\/1'), age);
      lastAge = age;
    }
    if (gender != lastGender) {
      if (hasValue(gender)) {
        cy.get('#\\/46098-0\\/1').type(gender).type('{downArrow}').type('{enter}');
      } else {
        cy.get('#\\/46098-0\\/1').clear();
      }
      lastGender = gender;
    }
    if (smokes != lastSmokes) {
      if (hasValue(smokes)) {
        smokes ? cy.get('#\\/smokes\\/1Y').click() : cy.get('#\\/smokes\\/1N').click();
      }
      lastSmokes = smokes;
    }
    if (systolic != lastSystolic) {
      setOrClear(cy.get('#\\/8480-6\\/1'), systolic);
      lastSystolic = systolic;
    }
    if (tChol != lastTChol) {
      setOrClear(cy.get('#\\/2093-3\\/1'), tChol);
      lastTChol = tChol;
    }
    if (hdl != lastHDL) {
      setOrClear(cy.get('#\\/2085-9\\/1'), hdl);
      lastHDL = hdl;
    }
    if (antihypert != lastAntihypert) {
      if (hasValue(antihypert)) {
        antihypert ? cy.get('#\\/antihypertensive\\/1Y').click() : cy.get('#\\/antihypertensive\\/1N').click();
        lastAntihypert = antihypert;
      }
    }
  }

  /**
   *  Asserts that the computed risk value is equal to the given value.
   */
  function assertRisk(expectedRisk) {
    cy.window().then((win) => {
      // The perl output contained 15 digits after the decimal.  JavaScript
      // provides a few more, so we need to round.
      // Also, there was a difference found in the 15th place, so we will
      // round both values to the 13th place.  (Rounding to the 14th place
      // still sometimes results in a difference, if one value has a 5 and the
      // other a 4 in the 15th place).
      let val = win.LForms.Util.getFormFHIRData('QuestionnaireResponse', 'R4').item[7].answer[0].valueDecimal;
      val = parseFloat(val);
      let precFactor = 10**13;
      val = Math.round(val*precFactor)/precFactor;
      expectedRisk = Math.round(expectedRisk*precFactor)/precFactor;
      expect(val).to.equal(expectedRisk);
    });
  }

  it('should show age message when age is out of range', () => {
    // Initially, it should not be visible
    cy.get('#label-\\/age_requirement_notice\\/1')
        .should('not.exist');
    populateForm(29); // too young for form
    cy.get('#label-\\/age_requirement_notice\\/1')
        .should('be.visible');
    populateForm(30); // youngest age
    cy.get('#label-\\/age_requirement_notice\\/1')
        .should('not.exist');
    populateForm(79); // oldest age
    cy.get('#label-\\/age_requirement_notice\\/1')
        .should('not.exist');
    populateForm(80); // too old for form
    cy.get('#label-\\/age_requirement_notice\\/1')
        .should('be.visible');
  });

  // There are actually four equations, based on age and gender.  Each
  // equation is tested below in a separate 'it'.
  it('should produce correct results for Female > 78', () => {
    // While here, also check that the "all answers required" message is showing
    cy.get('#label-\\/all_answers_required_notice\\/1')
        .should('be.visible');

    populateForm(79, 'Female', true, 190, 150, 35, true);
    assertRisk(0.356375192717629);
    populateForm(79, 'Female', false, 190, 150, 35, true);
    assertRisk(0.35112386950111);
    populateForm(79, 'Female', true, 170, 150, 35, true);
    assertRisk(0.282308646422709);
    populateForm(79, 'Female', true, 190, 110, 35, true);
    assertRisk(0.326410530670775);
    populateForm(79, 'Female', true, 190, 150, 25, true);
    assertRisk(0.481657486836198);
    populateForm(79, 'Female', true, 190, 150, 35, false);
    assertRisk(0.251323279420655);

    // Special case: systolic BP < 120; forces antihypertensive value to
    // false.  (Applies across these four cases, so I am just testing it
    // here once.)
    populateForm(79, 'Female', true, 100, 150, 35, true);
    assertRisk(0.0546747653467465);
    populateForm(79, 'Female', true, 100, 150, 35, false);
    assertRisk(0.0546747653467465); // same value
  });

  it('should produce correct results for Female <= 78', () => {
    populateForm(59, 'Female', true, 190, 150, 35, true);
    assertRisk(0.145148635979579);
    populateForm(59, 'Female', false, 190, 150, 35, true);
    assertRisk(0.0645034888512626);
    populateForm(59, 'Female', true, 170, 150, 35, true);
    assertRisk(0.11135790743962);
    populateForm(59, 'Female', true, 190, 110, 35, true);
    assertRisk(0.0850975091080599);
    populateForm(59, 'Female', true, 190, 150, 25, true);
    assertRisk(0.208539122665616);
    populateForm(59, 'Female', true, 190, 150, 35, false);
    assertRisk(0.0978885972845346);
  });

  it('should produce correct results for Male > 70', () => {
    populateForm(79, 'Male', true, 190, 150, 35, true);
    assertRisk(0.45956062065269);
    populateForm(79, 'Male', false, 190, 150, 35, true);
    assertRisk(0.454587337325116);
    populateForm(79, 'Male', true, 170, 150, 35, true);
    assertRisk(0.412679866560373);
    populateForm(79, 'Male', true, 190, 110, 35, true);
    assertRisk(0.470708408836874);
    populateForm(79, 'Male', true, 190, 150, 25, true);
    assertRisk(0.5659908538172);
    populateForm(79, 'Male', true, 190, 150, 35, false);
    assertRisk(0.383267655192785);
  });
});
