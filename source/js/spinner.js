/** Functions for the spinner */

import * as util from './util'

/**
 *  A reference to the spinner element.
 */
const spinner_ = document.getElementById('spinner');


export const spinner = {
  show: () => util.show(spinner_),
  hide: () => util.hide(spinner_)
}
