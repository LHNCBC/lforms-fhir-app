import {loadLForms, getSupportedLFormsVersions, changeLFormsVersion} from 'lforms-loader';
import {spinner} from './spinner.js';

let lformsLoadPromise;

let params = new URL(document.location).searchParams;
let lformsVersion = params.get('lfv');
if (lformsVersion)
  lformsLoadPromise = loadLForms(lformsVersion).catch(e=>{
    console.log('Unable to load LHC-Forms version '+lformsVersion);
    if (e)
      console.log(e);
    throw e;
  });
else {
  lformsLoadPromise = getSupportedLFormsVersions().then(versions=>{
    return loadLForms(versions[0]).catch(e=>{
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
