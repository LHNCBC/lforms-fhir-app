// Tests the Hunger Vital Signs form.

var util = require('./util');

describe('Hunger Vital Signs form', function() {

  beforeAll(() => {
    browser.get(util.mainPageURL);
    util.dismissFHIRServerDialog(); // not needed currently; might be later
    util.uploadForm('R4/hunger-vital-signs.json');
  });

  function riskElem() {
    return $('#\\/88124-3\\/1');
  }

  it('should start out with an empty risk assessment', function() {
    expect(riskElem().getAttribute('value')).toEqual('');
  });


  it('shold have a risk status of "no risk" if "never or "don\'t know" is chosen', function() {
    let firstQ = $('#\\/88122-7\\/1');
    util.autoCompHelpers.autocompPickNth(firstQ, '', 3);
    expect(riskElem().getAttribute('value')).toEqual('No risk');
  });

  it('should have a risk status of "at risk" if "often" or "sometimes" is chosen', function() {
    let firstQ = $('#\\/88123-5\\/1');
    util.autoCompHelpers.autocompPickNth(firstQ, '', 1);
    expect(riskElem().getAttribute('value')).toEqual('At risk');
  });
});
