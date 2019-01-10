# Change Log

This log documents the significant changes for each release.
This project follows [Semantic Versioning](http://semver.org/).


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
