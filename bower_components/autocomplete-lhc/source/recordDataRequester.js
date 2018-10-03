if (typeof Def === 'undefined')
  window.Def = {};

// Wrap the definitions in a function to protect our version of global variables
(function($, jQuery, Def) {
  "use strict";

  var Class = Def.PrototypeAPI.Class;

  /**
   *  This class handles data requests that some fields (just autocompleting
   *  fields, at present) make to retrieve additional information about a record
   *  specified by the field's value (perhaps in combination with other field
   *  values).  The class relies on the data_req_input parameter for a field
   *  to know which fields need to be sent along with value of the field
   *  making the request.  It also relies on the data_req_output parameter
   *  to know what fields are populated from a request's return data.
   */
  Def.RecordDataRequester = Class.create();

  var tmp = {

    /**
     *  The HTML DOM form field element for which this instance
     *  will be retrieving additional data.
     */
    formField_: null,

    /**
     *  The code field (if present) associated with formField_
     */
    codeField_: null,

    /**
     *  The URL for getting additional data.
     */
    dataURL_: null,

    /**
     *  This is an array of target field names (e.g. patient_name) of fields whose
     *  values should be sent along with the formField's value when sending the
     *  request for additional data.  They are sent in the URL created for the
     *  ajax request, in the form fieldname=fieldvalue.
     */
    dataReqInput_: null,

    /**
     *  This is an array of target field names (e.g. patient_name) of fields whose
     *  values will be filled in following a data request.
     */
    dataReqOutput_: null,

    /**
     *  A hash of dataReqInput_ values (target field names) to
     *  the corresponding field objects.
     */
    inputFieldsHash_: null,

    /**
     *  A hash of dataReqOutput_ values (target field names) to
     *  arrays of the corresponding field objects.
     *
     *  Note that there can be more than one output field per target field
     *  name, as in the fetch rule form.  This would usually be when writing
     *  a value for a field in a horizontal table, where multiple lines exist and
     *  the field in each line must be updated.
     */
    outputFieldsHash_: null,

    /**
     *  It is important for the assignListData method to know whether this
     *  RecordDataRequester (RDR) has been previously used to fetch data.
     *  This keeps track of that.
     */
    noPriorDataReq_: true,

    /**
     *  The latest pending Ajax request (if any).
     */
    latestPendingAjaxRequest_: null,

    /**
     *  The field value at the time of the last data request.
     */
    lastFieldVal_: null,

    /**
     *  The hash of data returned in response to the last data request
     *  (made by this RecordDataRequester).
     */
    lastDataHash_: null,

    /**
     *  true if the output fields all in the same group as formField.  In this
     *  case, we can cache the output fields.
     */
    outputToSameGroup_: null,

    /*
     * a hash of hashes that represent the fields that should be checked
     * for list updating when the value of the field changes.  Each hash
     * key represents an output field - which should be one of the field
     * names in the outputFieldsHash_.  The value of each hash element should
     * be a hash whose key is a condition string and whose value is the
     * autocompleter whose list should be updated if the condition is met.
     *
     * autoCompUpdateList_{outputFieldA: {update_condition_a: [ac1,ac2,ac3,ac4],
     *                                    update_condition_b: [ac5,ac6]},
     *                     outputFieldB: {update_condition_c: [ac10],
     *                                    update_condition_d: [ac20,ac2]} }
     */
    autoCompUpdateList_: null,


    /**
     *  The class constructor.
     * @param formField The HTML DOM form field element for which this instance
     *  will be retrieving additional data.
     * @param dataURL The URL for getting additional data.
     * @param dataReqInput This is an array of
     *  target field names (e.g. patient_name) of fields whose values should be
     *  sent along with the formField's value when sending the request
     *  for additional data.  This may be null.
     * @param dataReqOutput This is an array of
     *  target field names (e.g. patient_name) of fields whose values will
     *  be filled in following a data request.
     * @param outputToSameGroup true if the output fields all in the same
     *  group as formField.  In this case, we can cache the output
     *  fields.
     */
    initialize: function(formField, dataURL, dataReqInput, dataReqOutput,
        outputToSameGroup) {
      this.formField_ = formField;
      this.dataURL_ = dataURL;
      this.dataReqInput_ = dataReqInput;
      this.dataReqOutput_ = dataReqOutput;
      this.outputToSameGroup_ = outputToSameGroup;
      this.setOutputNamesToRDRNames(formField, dataReqOutput) ;
    },


    /**
     *  This sets the mapping between the field that "owns" this
     *  RecordDataRequester and the field(s) that should get the
     *  output from it.  The mapping is maintained in the
     *  Def.RecordDataRequester.outputFieldNameToRDRFieldName_ hash.
     *
     *  This was originally part of the initialize function.  However, we
     *  have a case (and will probably have more) where a field's list can
     *  come from more than one field's RDR.  So this was broken out from
     *  the initialize function and is called there AND is also called
     *  when a list is passed to an autocompleter.  That way the field that
     *  gets its list from multiple fields will get the latest list created.
     *
     *  @param formField the form field that owns this RDR
     *  @param dataReqOutput the dataReqOutput list to use to get the
     *   output fields.  These will always be target field names - without
     *   the prefix and suffix.
     */
    setOutputNamesToRDRNames: function(formField, dataReqOutput) {
      // Initialize this RDR's entries in outputFieldNameToRDRFieldName_.
      // (See the declaration of this hash map below.)
      var rdrTargetField = Def.Autocompleter.getFieldLookupKey(formField);
      var map = Def.RecordDataRequester.outputFieldNameToRDRFieldName_;
      for (var i=0, max=dataReqOutput.length; i<max; ++i) {
        map[dataReqOutput[i]] = rdrTargetField;
      } // end do for each output field
    } , // end setOutputNamesToRDRNames


    /**
     *  A copy constructor, for a new field (e.g. another field in a new row
     *  of a table).
     * @param fieldID the ID of the field for which the new RecordDataRequester
     *  is being constructed.
     * @return a new RecordDataRequester for field field ID
     */
    dupForField: function(fieldID) {
      return new Def.RecordDataRequester($(fieldID), this.dataURL_,
        this.dataReqInput_, this.dataReqOutput_, this.outputToSameGroup_);
    },


    /**
     *  Starts a request for the additional data needed for the field.  When
     *  the request completes, a callback function in this class
     *  (onDataReqComplete) will be called to put the retrieved data into the
     *  fields specified by the dataReqOutput parameter given in the constructor.
     *  (However, the callback code relies in the server's copy of dataReqOutput.)
     *  If the field's value is blank, this will just call clearDataOutputFields()
     *  instead of making the AJAX request.
     * @param listDataOnly (optional, default=false) Whether only data for
     *  autocompleter lists should be assigned.  If this is true, any other
     *  data (including values for the autocompleter fields) will be ignored.
     *  (The "true" value is used by assignListData()).
     */
    requestData: function(listDataOnly) {

      this.noPriorDataReq_ = false;

      if (!this.inputFieldsHash_)
        this.initFieldsHash();

      // Start an Ajax request
      if (!this.dataRequestOptions_)
        this.dataRequestOptions_ = {};

      // Clear the output fields, which might have now have invalid data
      // from a previous data request.  The drug duplicate warning code
      // in appSpecific.js waits until the output fields are filled in,
      // which it can only do if the fields are cleared before the request
      // is sent.

      // Don't do this if listDataOnly is true, which happens when we are
      // retrieving the list for a field on a saved form.  We don't need to do
      // the duplicate check then, because presumably it has already been done,
      // and we don't want to wipe out the entered values.
      if  (!listDataOnly)
        this.clearDataOutputFields();

      // We can no longer cache the assignment of onComplete, which now
      // depends on the input parameter.  (We could cache the bound versions
      // of the functions, but I am not sure if it is worth it.)
      this.dataRequestOptions_.complete = jQuery.proxy(listDataOnly ?
        this.onDataReqCompleteForListData :
        this.onDataReqComplete, this);

      this.dataRequestOptions_.data = this.buildParameters();
      this.latestPendingAjaxRequest_ =
        jQuery.ajax(this.dataURL_, this.dataRequestOptions_);
      this.lastFieldVal_ = Def.Autocompleter.getFieldVal(this.formField_);

    }, // end requestData


    /**
     *  Under certain conditions, this method will set the lists of any
     *  output fields that have prefetched autocompleters.  The use case
     *  for this method is where a prefetched autocompleter for some field,
     *  field B, is initially
     *  defined without a list, because its list is based on another field,
     *  field A,
     *  that has a RecordDataRequester that assigns the list for field B after
     *  a change to field A.  However, for
     *  previously saved forms that are being edited, the value of the field A
     *  will sometimes be filled in, and no change event is issued,
     *  so field B doesn't get its list that way.  Instead, we wait for
     *  field B to get a focus event, and then it uses this method (on
     *  field A's RecordDataRequester) to request that the list data for
     *  any output fields that have lists be filled in.  Now, it is possible
     *  that the focus event on field B may be occuring just after a change
     *  event from field A.  To avoid sending an unnecessary request, we check
     *  to see whether this RecordDataRequester has already requested data, and
     *  if so this method does nothing.  (Also, if the field does not have a
     *  value, we don't do anything because we have nothing about which to request
     *  data.)
     */
     assignListData: function() {
       if (this.noPriorDataReq_ && Def.Autocompleter.getFieldVal(this.formField_) !== '')
         this.requestData(true);
     },


    /**
     *  Returns the data retrieved for the given field on the last data
     *  request this RecordDataRequester made.
     * @param targetField the target field name of the output field for which
     *  data is needed.
     * @return the data, or null if there is no data for the given target field
     *  or if no data request has yet been run or if the RecordDataRequester's
     *  form field's value has changed since the last data request (in which case
     *  a new one is probably in progress).
     */
    getFieldData: function(targetField) {
      var rtn = null;
      if (this.lastDataHash_&&
          Def.Autocompleter.getFieldVal(this.formField_) === this.lastFieldVal_) {
        rtn = this.lastDataHash_[targetField];
      }
      return rtn;
    },


    /**
     *  This gets called when the data request comes back (after the user
     *  has made a selection from the list).
     * @param response the AJAX response object
     */
    onDataReqComplete: function(response) {
      // Do nothing if this is not the most recent request.
      // There is a small chance (which becomes larger with network delays)
      // that two requests from in the same field could be issued and return
      // in the order A, B, A returns, B returns, or in the order
      // A, B, B returns, A returns.  This check keeps the output fields
      // in a consistent state with the triggering field.
      if (this.latestPendingAjaxRequest_ === response) {
        // Do nothing if the field value has changed since this
        this.lastFieldVal_ = Def.Autocompleter.getFieldVal(this.formField_);
        // The response text should be a JSON object for a data hash map.
        var dataHash = response.responseJSON || JSON.parse(response.responseText);
        this.lastDataHash_ = dataHash;
        this.assignDataToFields(dataHash);
        this.processUpdateList(dataHash) ;
        this.latestPendingAjaxRequest_ = null;
      }
    },


    /**
     *  This gets called when the data request comes back (after the user
     *  has made a selection from the list).
     * @param response the AJAX response object
     */
    onDataReqCompleteForListData: function(response) {
      // Do nothing if this is not the most recent request.
      // (See onDataReqComplete.)
      if (this.latestPendingAjaxRequest_ === response) {
        // The response text should be a JSON object for a data hash map.
        var dataHash = response.responseJSON || JSON.parse(response.responseText);
        this.lastDataHash_ = dataHash;
        this.assignDataToFields(dataHash, true);
        this.processUpdateList(dataHash) ;
        this.latestPendingAjaxRequest_ = null;
      }
    },


    /**
     *  Clears the fields specified as output fields at construction.  If the
     *  field has an associated prefetched list, the list will be cleared as
     *  well.  I'm not sure yet if that is what we will always want to happen.
     *  At the moment, when a list field gets assigned a value from a
     *  data request, the value is the list's list, not the field value.
     */
    clearDataOutputFields: function() {

      if (!this.inputFieldsHash_)
        this.initFieldsHash();

      var updatedFields = [];
      var outputFieldsHash = this.getOutputFieldsHash();
      for (var i=0, max=this.dataReqOutput_.length; i<max;  ++i) {
        var fields = outputFieldsHash[this.dataReqOutput_[i]];
        if (fields !== undefined) {
          for (var j=0, maxJ=fields.length; j<maxJ; ++j) {
            var field = fields[j];
            // Look for an autocompleter for the field.  For now,
            // we assume a prefetched list autocompleter.
            if (field.autocomp && field.autocomp.setListAndField) {
              // If we call setListAndField, that will take care of propagating
              // the change in field value.  For this reason, we don't add
              // the field to the updatedFields list.
              field.autocomp.setListAndField([]);
            }
            else {
              Def.Autocompleter.setFieldVal(field, '', false);
              updatedFields.push(field);
            }
          }
        }
      }

      Def.Autocompleter.Event.notifyObservers(null, 'RDR_CLEARING', updatedFields);
    }, // end clearDataOutputFields


    /**
     *  This function adds fields to the list of fields whose autocompleter
     *  lists need to be updated on a change to the field to which this rdr
     *  is attached.
     *
     *  Use case:  On the fetch rule form we have a field that might contain
     *  a drug name.  (The field is a combo field, so it might be used for
     *  drug names or for other things).  If a drug name is specified, the
     *  name of the drug drives the values in a list of valid strengths for
     *  the drug.  Another field may need that strength list - IF yet ANOTHER
     *  field is set to a certain value.
     *
     *  So, fieldA = the first field - the one that contains a drug name.
     *  fieldB = the second field - the one that needs the strength list.
     *  fieldC = the third field - the one that is set to a value that makes
     *  fieldB need the strength list.
     *
     *  Other code works fine to allow fieldB to obtain the strength list
     *  from fieldA's record data requester when fieldB is first created.
     *  But suppose fieldB has already been created and filled in with a
     *  strength that is valid for the drug named in fieldA.  Then the user
     *  CHANGES the value of fieldA, invalidating the value in fieldB.  The
     *  value in fieldB needs to be removed and the autocompleter on fieldB
     *  needs a new list of valid strength values.  That's where this list
     *  comes in.  If fieldA has values in the autoCompUpdateList_ that belongs
     *  to its recordDataRequester object, and fieldA is changed, this list
     *  is used to find fields (via fieldC's value) whose autocompleter lists
     *  need to be updated.  See the processUpdateList function for a
     *  description of how that happens.
     *
     *  This function is in charge of adding fields to the autoCompUpdateList_.
     *  This is called when fieldC is set to a value that indicates fieldB
     *  needs the list.  Using the above example, when fieldC is set to
     *  'Strength', fieldB needs the strength list that is based on the
     *  drug name in fieldA.   So when fieldB (another combo field) is 'created',
     *  it calls this to add its name to fieldA's autoCompUpdateList_,
     *  specifying that the update should be done only for instances of fieldC
     *  that are set to 'Strength'.  (Naturally, all of these fields are in
     *  horizontal tables and so may have multiple instances).
     *
     *  Hope this helps.   lm, 10/2009.
     *
     *  @param origOutputField the name (without the prefix or suffix) of the
     *   original output field for the list.  This will correspond to the
     *   name this recordDataRequester uses in the dataHash it creates for
     *   the requested data.  For example, for the strength list described
     *   above, this will be drug_strength_form.
     *
     *  @param ac the autocompleter object for the field that needs the
     *   drug_strength_form list.  In the example given above, this would
     *   be the autocompleter for fieldB.
     *
     *  @param update_condition an array expressing the condition used to
     *   tell which versions of the output field (fieldC) need to be updated.
     *   In the example given above, this would contain the field name (WITH
     *   prefix and suffix) - fe_fieldA_x_x ... , the operator to be used
     *   (must be 'EQ' or 'NE') - in this case 'EQ', and the value that fieldA
     *   must contain - in this case 'Strength'.
     */
    addFieldsToUpdateList: function(origOutputField, ac, update_condition) {
      if (this.autoCompUpdateList_ === null) {
        this.autoCompUpdateList_ = {} ;
      }
      if (this.autoCompUpdateList_[origOutputField] === null) {
        this.autoCompUpdateList_[origOutputField] = {};
      }
      if (this.autoCompUpdateList_[origOutputField][update_condition] === null) {
        this.autoCompUpdateList_[origOutputField][update_condition] = [ac] ;
      }
      else {
        this.autoCompUpdateList_[origOutputField][update_condition].push(ac) ;
      }
    } , // end addFieldsToUpdateList


    /**
     *  This function processes the autoCompUpdateList_, if there is one for
     *  this recordDataRequester, against the dataHash passed in.  If a key
     *  in the dataHash matches a key in the autoCompUpdateList_, and if
     *  the condition specified for that key in the autoCompUpdateList_
     *  evaluates to true, the selections list in the autocompleter(s)
     *  specified for that key in the autoCompUpdateList_ is updated with
     *  the list from the dataHash.
     *
     *  See the addFieldsToUpdateList function for a description of the use case
     *  that drives this process.
     *
     *  @param dataHash a hash whose keys are the names of fields (without a
     *   prefix or suffix) that are to receive the data obtained by this
     *   recordDataRequester, and whose values are the values to be placed in
     *   the field or given to the field's autocompleter.
     */
    processUpdateList: function(dataHash) {
      if (this.autoCompUpdateList_ !== null) {
        for (var key in dataHash) {
          var val = dataHash[key];
          var isList = (val instanceof Array && val.length > 0);
          if (this.autoCompUpdateList_[key] !== null) {
            for (var cond in this.autoCompUpdateList_[key]) {
              var condition = cond.split(',');
              var trig_field = $(condition[0]);
              var trig_val = Def.Autocompleter.getFieldVal(trig_field);
              if ((condition[1] === 'EQ' && trig_val === condition[2]) ||
                  (condition[1] === 'NE' && trig_val !== condition[2])) {
                var acList = this.autoCompUpdateList_[key][cond];
                for (var a = 0, max = acList.length; a < max; a++) {
                  // make sure that this is not a zombie autocompleter that
                  // is too much trouble to fully destroy.
                  if (acList[a].element) {
                    if (isList) {
                      if (val[0] instanceof Array)
                        acList[a].setListAndField(val[0], val[1]) ;
                      else
                        acList[a].setListAndField(val) ;
                    }
                    // Could be a null return for an autocompleter field
                    // that had a list and now does not.
                    else if (val === null) {
                      acList[a].setListAndField([], []) ;
                    }
                  }
                }  // end do for each autocompleter or field to be updated
              } // end if the condition is true
            } // end do for each condition
          } // end if the list has entries for this key
        } // end do for each key in the hash
      } // end if this rdr has a list
    }, // end processUpdateList

    /* ***********************************************************************
     * Functions below this line are not intended to be called directly (except by
     * test code.)
     */

    /**
     *  Initializes input/outputFieldsHash_.
     */
    initFieldsHash: function() {
      this.inputFieldsHash_ = {};
      var autospace = Def.Autocompleter;

      if (this.dataReqInput_) {
        var targetFields = this.dataReqInput_;
        for (var i=0, max=targetFields.length; i<max; ++i) {
          var targetFieldName = targetFields[i];
          var fields = autospace.findRelatedFields(this.formField_, targetFieldName);
          if ( fields.length === 1) {
            // We found the field.  Store it for future use.
            this.inputFieldsHash_[targetFieldName] = fields[0];
          }
        }
      }

      // If the output fields are for the same row, cache them.
      if (this.outputToSameGroup_)
        this.outputFieldsHash_ = this.constructOutputFieldsHash();
    },


    /**
     *  Returns a hash of output target field names to arrays of matching
     *  fields.  Uses a cached version if available.
     */
    getOutputFieldsHash: function() {
      return this.outputToSameGroup_ ? this.outputFieldsHash_ :
         this.constructOutputFieldsHash();
    },


    /**
     *  Constructs  a hash of output target field names to arrays of matching
     *  fields.
     */
    constructOutputFieldsHash: function() {
      var outputFH = {};
      var targetFields = this.dataReqOutput_;
      var autospace = Def.Autocompleter;
      for (var i=0, max=targetFields.length; i<max; ++i) {
        var targetFieldName = targetFields[i];
        var fields = autospace.findRelatedFields(this.formField_, targetFieldName);
        // There could be more than one field per targetFieldName (e.g. a
        // field in a repeating line table, whose source list is determined by
        // the value of another field outside the table.)  So, we no longer
        // restrict this to just one field.
        if ( fields.length > 0) {
          // We found the field.  Store it for future use.
          outputFH[targetFieldName] = fields;
        }
      }
      return outputFH;
    },


    /**
     *  Finds fields matching the target names in the given data hash's keys,
     *  and tries to assign to them (in some appropriate way) the values.
     * @param dataHash the data hash
     * @param listDataOnly (optional, default=false) Whether only data for
     *  autocompleter lists should be assigned.  If this is true, any other
     *  data (including values for the autocompleter fields) will be ignored.
     *  (The "true" value is used by assignListData()).  No field values
     *  are changed when this is true.  The purpose is just to update lists.
     */
    assignDataToFields: function(dataHash, listDataOnly) {
      if (!this.inputFieldsHash_)
        this.initFieldsHash();

      // For each key in the hash, look for a field to give the value to.
      var updatedFields = [];
      var updatedFieldIDToVal = {}; // hash from fields to field values
      var outputFieldsHash = this.getOutputFieldsHash();
      var lookupCache = Def.Autocompleter;
      for (var key in dataHash) {
        var fields = outputFieldsHash[key];
        if (fields !== undefined) {
          for (var i=0, max=fields.length; i<max; ++i) {
            var field = fields[i];
            // We found the field.
            var val = dataHash[key];
            if (val instanceof Array) {
              // Look for an autocompleter for the field.  For now,
              // we assume a prefetched list autocompleter.
              if (field.autocomp !== null) {
                // Now that lists carry codes with them, when setting the value
                // for a list, it should normally have both a list of codes
                // and a list of values.  However, we support the case where
                // there is just a list of values.
                var targetField = lookupCache.getFieldLookupKey(field);
                this.setOutputNamesToRDRNames(this.formField_, [targetField]) ;
                //this.setOutputNamesToRDRNames(this.formField_,
                //                             splitFullFieldID(field.id)[1]) ;
                // Note:  Calling setListAndField takes care of propagating the
                // change to the field, so we don't need to add it to the
                // updatedFields array.
                if (val.length > 0 && val[0] instanceof Array) {
                  // if there's an option
                  if (val[2]) {
                    field.autocomp.initHeadings(val[2]);
                  }
                  if (listDataOnly) // In this case, don't update the field.
                    field.autocomp.setList(val[0], val[1]); // list, codes
                  else
                    field.autocomp.setListAndField(val[0], val[1]); // list, codes
                }
                else {
                  if (listDataOnly)
                    field.autocomp.setList(val); // just a list
                  else
                    field.autocomp.setListAndField(val); // just a list
                }
                if (this.autoCompUpdateList_ !== null &&
                    this.autoCompUpdateList_[targetField] !== null) {
                  var fieldValHash = {};
                  fieldValHash[targetField] = val ;
                  this.processUpdateList(fieldValHash) ;
                }
              }  // end if we found an autocompleter for the field
            } // end if the value is an array
            else if (!listDataOnly) {
              if (field.comboField !== undefined) { // if the field is a "combo field"
                field.comboField.mimicField(val, this.formField_.id);
              }
              else {
                // Assume a string
                Def.Autocompleter.setFieldVal(field, val, false);
                updatedFields.push(field);
                updatedFieldIDToVal[field.id] = val;
              }
            } // end if the value is an array or listDataOnly is false
          } // end do for each field
        } // end if there are fields
      } // end do for each key in the dataHash


      Def.Autocompleter.Event.notifyObservers(null, 'RDR_ASSIGNMENT',
        {updatedFields: updatedFields, updatedFieldIDToVal: updatedFieldIDToVal,
         listField: this.formField_});
    }, // end assignDataToFields


    /**
     *  Constructs and returns the CGI parameter string for the URL used
     *  to make the data request.
     */
    buildParameters: function() {
      var data = {};
      if (!this.inputFieldsHash_)
        this.initFieldsHash();

      // Include the code field's value if there is a code field and if it
      // has a value.  If there isn't a code field value, include formField_'s
      // value.
      // Get the code value, assuming there is at most one (i.e. a non-multiselect
      // list, which is the use case for RecordDataRequester).
      var codeVal = this.formField_.autocomp.getSelectedCodes()[0];
      if (codeVal !== null && codeVal !== undefined)
        data.code_val = codeVal;
      else
        data.field_val = Def.Autocompleter.getFieldVal(this.formField_);

      if (this.dataReqInput_) {
        for (var i=0, max=this.dataReqInput_.length; i<max; ++i) {
          var inputTargetFieldName = this.dataReqInput_[i];
          var inputField = this.inputFieldsHash_[inputTargetFieldName];
          if (inputField === undefined || inputField === null)
            throw 'Could not find field for '+inputTargetFieldName;
          data[inputTargetFieldName] = Def.Autocompleter.getFieldVal(inputField);
        }
      }
      // Lastly add authenticity_token for csrf protection
      data.authenticity_token = window._token || '';
      return data;
    }
  };


  jQuery.extend(Def.RecordDataRequester.prototype, tmp);
  tmp = null;


  // Additional class-level data members and methods.
  jQuery.extend(Def.RecordDataRequester, {

    /**
     *  A hash map from data request output field target field names to the
     *  target field names of the field whose data requester sends them data.
     *
     *  So if fieldA has an autocompleter and a recordDataRequester that
     *  provides data for fieldB, this hash would contain an entry with a
     *  key of fieldB whose value is fieldA.
     *
     *  This hash is created as the RecordDataRequesters are created.
     */
    outputFieldNameToRDRFieldName_: {},

    /**
     *  Returns the RDR for the given field ID, or null if none can be located.
     * @param outputFieldID the field ID of the output field for the
     *  RecordDataRequester that is to be returned.
     */
    getOutputFieldRDR: function(outputFieldID) {
      var rtn = null;
      var outputField = $(outputFieldID);
      var outputFieldKey = Def.Autocompleter.getFieldLookupKey(outputField);
      var rdrFieldName = this.outputFieldNameToRDRFieldName_[outputFieldKey];
      var rdrFields =
         Def.Autocompleter.findRelatedFields(outputField, rdrFieldName);

      if (rdrFields.length === 1) {
        var rdrField = rdrFields[0];
        var autocomp = rdrField.autocomp;
        if (autocomp)
          rtn = autocomp.recDataRequester_;
      }
      return rtn;
    }
  });
})(Def.PrototypeAPI.$, jQuery, Def);
