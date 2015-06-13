'use strict';

// Declare app level module which depends on views, and components
angular.module('liveJudgingAdmin', [
  'ngRoute',
  'ui.bootstrap',
  'liveJudgingAdmin.event',
  'liveJudgingAdmin.projects',
  'liveJudgingAdmin.judges',
  'liveJudgingAdmin.rubrics',
  'liveJudgingAdmin.categories',
  'liveJudgingAdmin.settings'
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.otherwise({redirectTo: '/event'});
}])

.controller('MainCtrl', ['$location', '$route', '$routeParams', '$scope', 
	function($location, $route, $routeParams, $scope) {
		$scope.$on('$routeChangeSuccess', function() {
			$scope.currentPath = $location.path();	
		});
		
}]);
