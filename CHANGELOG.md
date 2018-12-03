# Change Log

This log documents the significant changes for each release.
This project follows [Semantic Versioning](http://semver.org/).

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
