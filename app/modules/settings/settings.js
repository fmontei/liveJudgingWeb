'use strict';

angular.module('liveJudgingAdmin.settings', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/settings', {
    templateUrl: 'modules/settings/settings.html',
    controller: 'SettingsCtrl'
  });
}])

.controller('SettingsCtrl', ['$scope', function($scope) {
	
	$scope.tabs = [
		{ title: 'Event Dashboard', active: true, view: 'eventDashboard' },
		{ title: 'Delete Event', view: 'eventDelete' }
	];
	
	$scope.activeTab = $scope.tabs[0].view;
	
	$scope.changeActiveTab = function(tab) {
		$scope.activeTab = tab;
	}
	
}]);