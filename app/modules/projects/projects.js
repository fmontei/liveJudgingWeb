'use strict';

angular.module('domInitApp', [])

.service('domInitService', function() {
	var service = this;
	
	service.instantiateAmPmSwitch = function(identifier) {
		$(identifier).bootstrapSwitch({
			onText: 'am',
			offText: 'pm'
		});
	}
	
	service.getTimeOptions = function() {
		service.times = [];
		for (var i = 1; i <= 12; i++) {
			for (var j = 0; j <= 45; j += 15) {
				if (j == 0) service.times.push(i + ":" + j + j);
				else service.times.push(i + ":" + j);
			}
		}
		return service.times;
	}
	
	service.initializeColorPicker = function(identifier) {
		$(identifier).colorpicker();
	}
	
	return service;
})

angular.module('liveJudgingAdmin.projects', ['ngRoute', 'domInitApp'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/projects', {
    templateUrl: 'modules/projects/projects.html',
    controller: 'ProjectsCtrl'
  });
}])

.controller('ProjectsCtrl', ['$scope', 'domInitService',
	function($scope, domInitService) {
		
	$scope.createAmPmSwitch = function(identifier) {
		domInitService.instantiateAmPmSwitch(identifier);
	}
	$scope.createAmPmSwitch('#am-pm-switch');
	
	$scope.createColorPicker = function(identifier) {
		domInitService.initializeColorPicker(identifier);
	}
	$scope.createColorPicker("#color-picker");
	
	$scope.timeOptions = domInitService.getTimeOptions();
	
	$scope.currentView = "default";
	$scope.changeView = function(view) {
		$scope.currentView = view;
	}
}]);