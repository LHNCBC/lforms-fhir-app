# Change Log

This log documents the significant changes for each release.
This project follows [Semantic Versioning](http://semver.org/).

## [3.3.3] 2024-12-03
### Fixed
- Escape certain characters in FHIR search parameters.

## [3.3.2] 2024-06-28
### Changed
- Simplify lforms API calls when showing a saved questionnaire response.

## [3.3.1] 2024-05-10
### Added
- Set subject and author when showing questionnaire response.

## [3.3.0] 2024-03-25
### Added
- Scripts for Windows environment.

## [3.2.0] 2024-02-27
### Changed
- updated lforms-loader version.

## [3.1.0] 2023-08-22
### Changed
- Now loads and uses the latest LHC-Forms version automatically.

## [3.0.3] 2023-05-10
### Changed
- Updated lforms to v33.3.4, which fixed a bug that values in
  QuestionnaireResponse are not displayed when the values are
  from answerValueSet in the Questionnaire.

## [3.0.2] 2023-03-21
### Changed
- Updated nodejs to v18.14.2.
- Updated lforms to v33.3.2.

## [3.0.1] 2022-12-09
### Changed
- Updated website header and footer and logo.

## [3.0.0] 2022-11-21
### Changed
- Updated lforms to 33.0.0, which removed support for IE 11.

## [2.0.7] - 2022-11-08
### Fixed
- Issue with Cache-Control header: some FHIR servers do not permit the
  Cache-Control header on CORS requests.

## [2.0.6] - 2022-09-26
### Fixed
- Fixed the link to the 'samples' page.

## [2.0.5] - 2022-09-12
### Updated
- LForms to 32.0.2.

## [2.0.4] - 2022-08-10
### Changed
- Use shared header and footer from CTSS.

## [2.0.3] - 2022-06-14
### Updated
- LForms to 30.3.0.

## [2.0.2] - 2022-04-07
### Fixed
- LForms.lformsVersion was showing 'undefined' after the lforms update in 2.0.1.

## [2.0.1] - 2022-04-07
### Changed
- Updated fhir-client.js to 2.4.0.
- Updated lforms to 30.1.3.

## [2.0.0] - 2022-01-07
### Changed
- Rewrite of app to remove AngularJs, which is no longer supported.
- Updated to use the web component version of LForms (still in beta).

## [1.3.1] - 2021-06-29
### Fixed
- Added a missing icon in production mode.

## [1.3.0] - 2021-05-13
### Added
- Added the display of the pratitioner's name on the page

## [1.2.4] - 2021-05-05
### Changed
- Updated lforms to 29.0.3

## [1.2.3] - 2021-04-06
### Changed
- Updated NIH/NLM/LHC logo;
- Removed favicon.ico

## [1.2.2] - 2021-03-29
### Fixed
- Fixe a bug in FHIR delete operation that now takes a URL string
  instead of an object.
### Updated
- Update fhirclient.js to 2.3.11

## [1.2.1] - 2021-03-05
### Fixed
- Updated lforms to 28.1.4 and adjusted tests and test Questionnaires.

## [1.2.0] - 2021-1-13
### Changed
- Updated lforms to 28.1.1.

## [1.1.0] - 2020-12-15
### Changed
- Added starting HTTP server before running tests

## [1.0.0] - 2020-12-04
### Changed
- Updated the SMART on FHIR client ('client-js', a.k.a. npm package fhirclient)
  to version 2.  (See http://docs.smarthealthit.org/client-js).
- Updated LForms to version 27.0.0.

## [0.14.17] - 2020-11-12
### Fixed
- Replaced value[x] with value in FHIRPath expressions in tests where possible
  (see e2e-tests/data/R4/*.json).

## [0.14.16] - 2020-09-08
### Changed
- Updated LForms to version 25.1.5.

## [0.14.15] - 2020-07-21
### Changed
- Updated LForms to version 25.1.2.

## [0.14.14] - 2020-06-18
### Changed
- Updated LForms to version 25.0.0.

## [0.14.13] - 2020-06-12
### Fixed
- Removed a 'Glasgow coma scale' Questionnaire from the featured list
  of our R4 server, because the Questionnaire with that ID was missing,
  and the score rule feature was adequately demonstrated by the PHQ-9 form.

## [0.14.12] - 2020-05-08
### Changed
- Removed deprecated json3 package dependency

## [0.14.11] - 2020-05-07
### Changed
- Updated lforms to 24.1.3
### Fixed
- Added missed polyfills for IE11

## [0.14.10] - 2020-04-21
### Fixed
- Fixed broken CSS resource links.

## [0.14.9] - 2020-04-02
### Updated
- Updated lforms to 23.0.1, and the test/example data files.

## [0.14.8] - 2020-03-13
### Added
- Updated lforms to 22.0.0, and introduced the use of a new package, lforms-updater,
  which takes care of breaking changes from lforms to support older form
  definitions and lforms-generated FHIR resources.

## [0.14.7] - 2020-02-27
### Fixed
- Fixed a bug that prevented entry of an off-list FHIR Server.
- Updated lforms to 21.1.0

## [0.14.6] - 2020-02-26
### Fixed
- Updated lforms package

## [0.14.5] - 2020-02-25
### Fixed
- Fixed protractor tests.

## [0.14.4] - 2020-02-18
### Added
- A "hunger vital signs" form (with FHIRPath expressions) to the tests.
### Changed
- Updated to lforms 20.2.0 from 20.0.0 (mostly fixes, plus one feature
  addition.)

## [0.14.3] - 2020-02-18
### Fixed
- Fixed a bug that Questionnaires names, instead of titles, are displayed in search box.

## [0.14.2] - 2020-02-13
### Fixed
- Tests which broke due to data changes on the servers we use for testing.

## [0.14.1] - 2020-01-10
### Fixed
- Fixed a bug that pre-population stopped working on featured questionnaires

## [0.14.0] - 2019-12-05
### Added
- Added a configuration file for FHIR servers
- Added a featured Questionnaire section for configured FHIR servers

## [0.13.2] - 2019-12-03
### Fixed
- Fixed a missing quotation mark on the "id" field of the JSON Questionnaire
  output in the dialog that shows the questionnaire from the server.

## [0.13.1] - 2019-10-31
### Fixed
- Fixed the missing operator and code system for enableWhen entries in ussg-fhp.json

## [0.13.0] - 2019-10-24
### Added
- Updated LForms to 18.3.0 to obtain new features and fixes.
- Added a sample form that computes the Framingham HCHD risk.

## [0.12.1] - 2019-09-29
### Fixed
- Updated LForms to 18.0.1 to obtain various fixes.

## [0.12.0] - 2019-09-11
### Fixed
- Fixed the "previous" page link in the side bar.
### Added
- A checkbox for controlling whether the date & time are shown for saved
  Questionnaires.
### Changed
- Moved search button to the top of the Questionnaire list to make it easier to
  find.

## [0.11.4] - 2019-07-24
### Added
- Updated LForms to include support for autocompletion with ValueSets, and added
  a test.
### Changed
- The SMART connection tests now hit our own FHIR server instead of the app
  gallery sandbox.

## [0.11.3] - 2019-06-21
### Fixed
- Prepopulation is now disabled for saved QuestionnaireResponses (so that saved
  data is not replaced with "prepopulation" data.

## [0.11.2] - 2019-06-07
### Fixed
- Added a means for the test code to delete Questionnaires that were uploaded
  for testing, so as not to clutter the Questionnaire list with duplicate
  entries.

## [0.11.1] - 2019-06-03
### Fixed
- Questionnaire list was not appearing for servers with lots of Questionnaires.

## [0.11.0] - 2019-05-21 (0.10.0 skipped)
### Added
- Questionnaire data extraction for Observation data is now supported via the
  questionnaire-observationLinkPeriod extension.

## [0.9.1] - 2019-05-03
### Fixed
Updated LForms to get several fixes:
- Fixed an issue with the processing of FHIRPath.
- Fixed regular expression field validation
- Fixed an problem with the handling of repsonses to Questionnaire items that do
  not have codes.
- Corrected itemControl codes.

## [0.9.0] - 2019-04-24
### Added
- If a SMART context is not found, the app now asks the user to enter the base
  URL of a FHIR server and select a patient.  This allows other FHIR servers to
  be tested which do not have a SMART interface.

## [0.8.1] - 2019-04-12
### Fixed
- Missing patient information in the status bar.
- Issue with the QuestionnaireResponse list not updating from R4 servers.

## [0.8.0] - 2019-03-27
### Added
- Questionnaire pre-population with Observation data is now supported via the
  questionnaire-observationLinkPeriod extension.

## [0.7.2] - 2019-03-27
### Removed
- The non-SDC menu options have been removed.  These were not really non-SDC,
  but simply removed any extension from the resource.  Also, any system that
  accepts a Questionnaire should be able to accept an SDC Questionnaire.

## [0.7.1] - 2019-03-21
### Fixed
- The "upload" button did not work in Edge (and probably IE).
- This version also includes an update to the LHC-Forms library, which includes
  a fix for Safari for calculatedExpressions.

## [0.7.0] - 2019-02-19
This version updates the LForms library from 13.10.2 to 14.2.0, which includes
the following changes.
### Added
- Output QuestionnaireResponses now include the selected patient as the subject.
### Fixed
- The selection of extensions for representing units has been corrected.
  (Samples can be seen under e2e-tests/data.)
### Changed
- Standard Questionnaire exports for R4 now contain '4.0' (instead of '3.5') as
  the FHIR version.
- Standard QuestionnaireResponse exports now include meta.profile.

## [0.6.1] - 2019-01-10
### Fixed
- Revised the sample "vital signs" form to remove / characters from the linkId
  output, which has a special meaning for LHC-Forms.  (We hope to remove that
  special meaning soon.)
- Updated LHC-Forms to get a fix for QuestionnaireResponses that include items
  without answers.
- Corrected the display of time stamps for saved resources.

## [0.6.0] - 2019-01-09
### Added
- The "variable" extension is now supported with FHIRPath expressions.

## [0.5.1] - 2018-12-11
### Fixed
 - Updated the LHC-Forms renderer to 13.7.1, to get the corrected settings for
   %context and %resource in FHIRPath expressions.

## [0.5.0] - 2018-12-06
### Added
 - Support for questionnaire-initialExpression (with FHIRPath).

## [0.4.1] - 2018-12-03
### Fixed
 - Saved Questionnaires were missing their lists.

## [0.4.0] - 2018-11-29
### Added
 - Questionnaires can now be uploaded that do not explicitly indicate their FHIR version
   with meta.profile if the FHIR version can be guessed from the structure.

## [0.3.3] - 2018-11-28
### Fixed
 - When saved Questionnaires are used, the FHIR version used is now the FHIR
   version from the server.

## [0.3.2] - 2018-11-27
### Fixed
 - Error messages for unsupported Questionnaire formats were not displayed.

## [0.3.1] - 2018-11-26
### Fixed
 - Corrected the sample test Questionnaires and made separate version for STU3
   and R4.

## [0.3.0] - 2018-11-21
### Added
- Now has some support pre-poluation via questionnaire-launchContext and
  questionnaire-calculatedExpression.

## [0.2.1] - 2018-10-16
### Fixed
- Updated some dependencies to avoid vulnerabilities.

## [0.2.0] - 2018-10-03
### Added
- Now has a build system to build the gh-pages demo

## [0.1.2] - 2018-09-30
### Changed
- Updated buttons style

## [0.1.1] - 2018-09-27
### Changed
- Updated npm packages.

## [0.1.0] - 2018-09-25
### Initial release
- A SMART on FHIR app that uses LForms widget to manage FHIR Questionnaire
  and QuestionnaireResponse.
