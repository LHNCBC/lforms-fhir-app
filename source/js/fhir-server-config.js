/*
 * Define lforms constants here and use this a dependency in the angular application
 */
export const fhirServerConfig = {
  listFhirServers: [
    // Only open servers are supported. It should have one of the'url' and 'smartServiceUrl', or both.
    // configuration format:
    // { name: '',     // name for the FHIR server. optional
    //   url: '',  // base URL of the FHIR server (non-SMART), must be https, because the public server is https.
    //                 // optional.
    //   smartServiceUrl: '', // service URL of a SMART endpoint, if featured questionnaires are known available
    //                   // at this SMART endpoint. optional.
    //   featuredQuestionnaires: [ // available questionnaires at the FHIR server, to be shown
    //                             // in "Featured Questionnaires" section
    //      { name: '', // name of the featured questionnaire to be displayed.
    //        id: '',   // id of the featured questionnaire resource
    //        code: ''} // code of the featured questionnaire to be displayed with the name, if it is LOINC code.
    //   ],
    //
    // }
    { url: 'https://launch.smarthealthit.org/v/r3/fhir'},
    { url: 'https://lforms-fhir.nlm.nih.gov/baseDstu3'},
    { url: 'https://lforms-fhir.nlm.nih.gov/baseR4',
      smartServiceUrl: 'https://lforms-smart-fhir.nlm.nih.gov/v/r4/fhir',
      featuredQuestionnaires: [
        {
          name: 'US Surgeon General family health portrait',
          id: '54127-6-x',
          code: '54127-6'
        },
        {
          name: 'Weight & Height tracking panel',
          id: '55418-8-x',
          code: '55418-8'
        },
        {
          name: 'Comprehensive metabolic 1998 panel',
          id: '24322-0-x',
          code: '24322-0'
        },
        {
          name: 'PHQ-9 quick depression assessment panel',
          id: '44249-1-x',
          code: '44249-1'
        },
        {
          name: 'Hard Coronary Heart Disease (10-year risk)',
          id: 'framingham-hchd-lhc'
          //code: 'framingham-hchd'
        },
        {
          name: 'Health Screening',
          id: 'sdoh-health-screening'
        },
        {
          name: 'Study drug toxicity panel',
          id: 'study-drug-tox-x'
          //code: 'study-drug-tox'
        },
        // {
        //   name: 'Glasgow coma scale',
        //   id: '35088-4-x',
        //   code: '35088-4'
        // },
        {
          name: 'AHC HRSN Screening',
          id: 'lforms-ahn-hrsn-screening'
        },

    ]}
  ]
};
