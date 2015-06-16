'use strict';

// Declare app level module which depends on views, and components
angular.module('liveJudgingAdmin', [
  'ngResource',
  'ngRoute',
  'ui.bootstrap',
  'liveJudgingAdmin.login',
  'liveJudgingAdmin.event',
  'liveJudgingAdmin.projects',
  'liveJudgingAdmin.judges',
  'liveJudgingAdmin.rubrics',
  'liveJudgingAdmin.categories',
  'liveJudgingAdmin.settings'
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.otherwise({redirectTo: '/login'});
}])

.controller('MainCtrl', ['$location', '$route', '$routeParams', '$scope', 
	function($location, $route, $routeParams, $scope) {
		$scope.$on('$routeChangeSuccess', function() {
			$scope.currentPath = $location.path();	
		});

    // Used to determine if the sidebar should be hidden.
    $scope.isDashboard = function() {
      if ($scope.currentPath === '/login' || $scope.currentPath === '/eventSelect') {
        return false;
      }
      return true;
    }
		
}]);
