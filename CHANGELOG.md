# Change Log

This log documents the significant changes for each release.
This project follows [Semantic Versioning](http://semver.org/).

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
