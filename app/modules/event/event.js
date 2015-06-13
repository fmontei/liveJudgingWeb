'use strict';

angular.module('liveJudgingAdmin.event', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/event', {
    templateUrl: 'modules/event/event.html',
    controller: 'EventCtrl'
  });
}])

.controller('EventCtrl', [function() {
	
}]);

