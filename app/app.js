'use strict';

// Declare app level module which depends on views, and components
angular.module('liveJudgingAdmin', [
  'base64',
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

.controller('MainCtrl', ['$cookies', '$location', '$route', '$routeParams', '$scope', 'CurrentUserService',
	function($cookies, $location, $route, $routeParams, $scope, CurrentUserService) {
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

    $scope.username;

    $scope.$on('loginSuccess', function() {
      $scope.username = CurrentUserService.getCurrentUser().name;
    })

    $scope.$watch(function() {
      return CurrentUserService.getCurrentUser()
    }, function(oldVal, newVal) {
      if (newVal) {
        $scope.username = newVal.name;
      }
    });
}]);
