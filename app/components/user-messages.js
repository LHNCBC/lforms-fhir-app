'use strict';

angular.module('lformsApp')
  .service('userMessages', function($rootScope) {

     // A hash of type/message pairs.
    var messages = {};

    return messages;
  });
