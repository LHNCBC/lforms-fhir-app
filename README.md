# A SMART app for FHIR SDC Questionnaire

This is a [SMART](http://docs.smarthealthit.org/) app that can be used in
EHR (electonic health record) systems supporting SMART on FHIR to display
[FHIR](http://hl7.org/fhir/)
[SDC](http://hl7.org/fhir/uv/sdc/2018Sep/index.html)
[Questionnaire](http://hl7.org/fhir/uv/sdc/2018Sep/sdc-questionnaire.html) forms
and collect data as FHIR QuestionnaireResponse resources.

## Demo
A demo of this app can be launched via SMART
on FHIR from the [LHC FHIR Tools website](https://lhcforms.nlm.nih.gov/sdc).  It can
also be used without SMART, by going to it
[directly](https://lhcforms.nlm.nih.gov/lforms-fhir-app/), in which can you can
enter the base URL of a FHIR server to which you want the app to connect.
The source files from which the demo is built are on the master branch.
See "Customizing the App" below if you wish customize or build your own copy.

The app relies on the [LHC-Forms](http://lhncbc.github.io/lforms/) rendering
widget for displaying forms.  It has partial support for FHIR Questionnaires
(versions STU3 and R4) and the [Structured Data Capture Implementation
Guide](http://build.fhir.org/ig/HL7/sdc/).

For some sample forms to try, this repository comes with some forms under
e2e-test/data which are used by the test code to test the app.  The FHIR server
connected to by the SMART App gets reset weekly, but you can use the Upload
button to upload a new Questionnaire resource.  If downloading one of the forms
from GitHub, be sure click on the "Raw" button, which will open a page which
only has the Questionnaire data.  For example:
https://raw.githubusercontent.com/lhncbc/lforms-fhir-app/master/e2e-tests/data/R4/vital-sign-questionnaire.json
will open a page for a vital signs Questionnaire which you can save to a local
file and then use "Upload" to use it in the app.

## Customizing the App

If you wish to install and build the app locally so that you can customize it,
see below.  Note that adding support for additional parts of the SDC specification will
require edits to the [LHC-Forms](http://lhncbc.github.io/lforms/) widget.  (Pull
requests are very welcome, but it might be better to open an issue first to see
if we are already working on that feature.)

### Add Node.js and npm to your path
The file bashrc.lforms-fhir-app specifies the version of Node.js we are using
for development.  Download that version of Node.js, and add its bin directory to
your path.

### Install Dependencies

We have two kinds of dependencies in this project: tools and Angular framework code. The tools help
us manage and test the application.

* We get the tools we depend upon via `npm`, the Node package manager (npm).
* We get the Angular code via `bower`, a client-side code package manager (bower).
* In order to run the end-to-end tests, you will also need to have the
  Java Development Kit (JDK) installed on your machine. Check out the section on
  [end-to-end testing](#e2e-testing) for more info.

We have configured `npm` to automatically run `bower` so we can simply do:

```
npm ci
```

Behind the scenes this will also call `bower install`. After that, you should find out that you have
two new folders in your project.

* `node_modules` - contains the npm packages for the tools we need
* `app/bower_components` - contains the Angular framework files

Add node_modules/.bin to your path.

### Build the application
(For Windows, please add node_modules/.bin to PATH, either through GUI or command.)
```
npm run build
```
This will create files for production in a "dist" directory, but will also copy
some needed files into place from node_modules.

### Run the Application
```
npm run start
```
will start an http server running at port 8000.  Or, for testing the
production build,

```
npm run start-dist
```
will start a server on port 8000 that serves the files in dist.

Now browse to the app at `localhost:8000/lforms-fhir-app/`.

<a name="e2e-testing"></a>
### Running Tests (including End-to-End Tests)
```
npm run test
```
will run the tests.

For testing the production build in dist, run
```
npm run test-dist
```
