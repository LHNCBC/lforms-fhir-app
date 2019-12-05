/*
 * Define lforms constants here and use this a dependency in the angular application
 */
angular.module('lformsApp')
    .constant('fhirServerConfig', {
      listFhirServers: [
        // Only open servers are supported.
        // configuration format:
        // { name: '', // name for the FHIR server, optional
        //   url: '',  // must be https, because the public server is https
        //   featuredQuestionnaires: [{name: '', id: ''}], // available questionnaires at the FHIR server,
        //                                                 // for demonstration purpose
        // }
        {url: 'https://launch.smarthealthit.org/v/r3/fhir'},
        {url: 'https://lforms-fhir.nlm.nih.gov/baseDstu3'},
        {url: 'https://lforms-fhir.nlm.nih.gov/baseR4',
          featuredQuestionnaires: [
            {
              name: 'US Surgeon General family health portrait',
              id: '54127-6'
            },
            {
              name: 'Weight & Height tracking panel',
              id: '55418-8'
            },
            {
              name: 'Comprehensive metabolic 1998 panel',
              id: '24322-0'
            },
            {
              name: 'PHQ-9 quick depression assessment panel',
              id: '44249-1'
            },
            {
              name: 'Hard Coronary Heart Disease (10-year risk)',
              id: 'framingham-hchd-lhc'
            },
            {
              name: 'Health Screening',
              id: 'sdoh-health-screening'
            },
            {
              name: 'Study drug toxicity panel',
              id: 'study-drug-tox-x'
            },
            {
              name: 'Glasgow coma scale',
              id: '35088-4'
            },
            {
              name: 'AHC HRSN Screening',
              id: 'lforms-ahn-hrsn-screening'
            },

          ]}
      ]
    });


