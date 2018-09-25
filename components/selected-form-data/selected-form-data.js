'use strict';

angular.module('lformsApp')
  .service('selectedFormData', function($rootScope) {
    // AngularJS will instantiate a singleton by calling "new" on this function
    var data = {
      lfData : null,
      fhirResInfo : {
        resId : null,
        resType : null,
        resTypeDisplay : null,
        extensionType : null,
        questionnaireResId : null,
        questionnaireName : null
      }
    };

    // Public API here
    return {
      /**
       * Get the shared LForms form data
       * @returns {null} LForms form data
       */
      getFormData : function () {
        return data.lfData;
      },

      getFhirResInfo : function () {
        return data.fhirResInfo;
      },

      /**
       * Get the ID of the FHIR resource that is associated with the form data
       * @returns {String|null} the ID string
       */
      getFhirResourceId: function() {
        return data.fhirResInfo.resId;
      },


      /**
       * Get the type of the FHIR resource that is associated with the form data
       * @returns {String|null} the ID string
       */
      getFhirResourceType: function() {
        return data.fhirResInfo.resType;
      },


      /**
       * Set the shared LForms form data and ID of the associated FHIR DiagnosticReport resource
       * @param formData an LForm form data object
       * @param fhirResourceIdOnServer an ID of the associated FHIR DiagnosticReport resource
       */
      setFormData : function (formData, fhirResInfo) {
        data.lfData = formData;
        if (!fhirResInfo) {
          data.fhirResInfo = {
            resId : null,
            resType : null,
            resTypeDisplay : null,
            extensionType : null,
            questionnaireResId : null,
            questionnaireName : null
          };
        }
        else {
          data.fhirResInfo = fhirResInfo;
        }

        $rootScope.$broadcast('LF_NEW_DATA');
      }
    };
  });
