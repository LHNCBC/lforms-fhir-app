import {loadLForms, getSupportedLFormsVersions, changeLFormsVersion} from 'lforms-loader';
import {spinner} from './spinner.js';


/**
 *  Initialiation that should happen after LForms has been loaded.
 */
function postLFormsInit() {
  spinner.hide();
}

let lformsLoadPromise;

let params = new URL(document.location).searchParams;
let lformsVersion = params.get('lfv');
spinner.show();
if (lformsVersion)
  lformsLoadPromise = loadLForms(lformsVersion).then(()=>postLFormsInit(), e=>{
    spinner.hide();
    const errMsgElem = document.getElementById('preLoadErrMsg');
    errMsgElem.textContent =
      'Unable to load LHC-Forms.  See the console for details.';
    show(errMsgElem);
    console.log('Unable to load LHC-Forms version '+lformsVersion);
    console.log(e);
  });
else {
  lformsLoadPromise = getSupportedLFormsVersions().then(versions=>{
    return loadLForms(versions[0]).then(()=>postLFormsInit(), e=>{
      // Some file failed to load.
      console.log(e);
      // Try the next most recent version
      changeLFormsVersion(versions[1]);
    });
  });
};


/**
 *  Returns a promise that is the result of trying to load LForms on the page,
 *  and which resolves when that attempt is finished.
 */
export function getLFormsLoadStatus() {
  return lformsLoadPromise;
};
