# A SMART app for FHIR SDC Questionnaire

This is a [SMART](http://docs.smarthealthit.org/) app that can be used in
EHR (electonic health record) systems supporting SMART on FHIR to display
[FHIR](http://hl7.org/fhir/)
[SDC](http://hl7.org/fhir/uv/sdc/2018Sep/index.html)
[Questionnaire](http://hl7.org/fhir/uv/sdc/2018Sep/sdc-questionnaire.html) forms
and collect data as FHIR QuestionnaireResponse resources.

There is a [demo](https://apps.smarthealthit.org/app/lforms-questionnaire-app)
of this app running as a GitHub pages website, but to see it work with a SMART
on FHIR context, try it out via the
[SMART App Gallery](https://apps.smarthealthit.org/app/lforms-questionnaire-app).
(That will open a page containing the GitHub pages demo, but the SMART on FHIR
connection will be established, so you will be able to save and load FHIR
resources.)

The app relies on the LHC-Forms rendering widget for displaying forms.  It has
partial support for both FHIR [STU3](http://hl7.org/fhir/us/sdc/) and
[R4](http://hl7.org/fhir/uv/sdc/2018Sep/index.html) SDC Questionnaires.

## Customizing the App

If you wish to install and build the app locally so that you can customize it,
see below.  Note that adding support for additional parts of the SDC specification will
require edits to the LHC-Forms widget.  (Pull requests are very welcome!)

### Install Dependencies

We have two kinds of dependencies in this project: tools and Angular framework code. The tools help
us manage and test the application.

* We get the tools we depend upon via `npm`, the Node package manager (npm).
* We get the Angular code via `bower`, a client-side code package manager (bower).
* In order to run the end-to-end tests, you will also need to have the
  Java Development Kit (JDK) installed on your machine. Check out the section on
  [end-to-end testing](#e2e-testing) for more info.

We have preconfigured `npm` to automatically run `bower` so we can simply do:

```
npm ci
```

Behind the scenes this will also call `bower install`. After that, you should find out that you have
two new folders in your project.

* `node_modules` - contains the npm packages for the tools we need
* `app/bower_components` - contains the Angular framework files

*Note that the `bower_components` folder would normally be installed in the root folder but
`angular-seed` changes this location through the `.bowerrc` file. Putting it in the `app` folder
makes it easier to serve the files by a web server.*

### Run the Application

We have preconfigured the project with a simple development web server. The simplest way to start
this server is:

```
npm start
```

Now browse to the app at `localhost:8000/lforms-fhir-app/`.


<a name="e2e-testing"></a>
### Running End-to-End Tests

The `angular-seed` app comes with end-to-end tests, again written in Jasmine. These tests
are run with the Protractor End-to-End test runner. It uses native events and has
special features for Angular applications.

* The configuration is found at `e2e-tests/protractor-conf.js`.
* The end-to-end tests are found in `e2e-tests/*spec.js`.

Protractor simulates interaction with our web app and verifies that the application responds
correctly. Therefore, our web server needs to be serving up the application, so that Protractor can
interact with it.

**Before starting Protractor, open a separate terminal window and run:**

```
npm start
```

In addition, since Protractor is built upon WebDriver, we need to ensure that it is installed and
up-to-date. The `angular-seed` project is configured to do this automatically before running the
end-to-end tests, so you don't need to worry about it. If you want to manually update the WebDriver,
you can run:

```
npm run update-webdriver
```

Once you have ensured that the development web server hosting our application is up and running, you
can run the end-to-end tests using the supplied npm script:

```
npm run protractor
```

This script will execute the end-to-end tests against the application being hosted on the
development server.
