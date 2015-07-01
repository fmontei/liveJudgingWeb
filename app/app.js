'use strict';

// Declare app level module which depends on views, and components
angular.module('liveJudgingAdmin', [
  'base64',
  'ngResource',
  'ngRoute',
  'ui.bootstrap',
  'liveJudgingAdmin.login',
  'liveJudgingAdmin.event',
  'liveJudgingAdmin.teams',
  'liveJudgingAdmin.judges',
  'liveJudgingAdmin.rubrics',
  'liveJudgingAdmin.categories',
  'liveJudgingAdmin.settings'
])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.otherwise({redirectTo: '/login'});
}])

.run(function($rootScope, $location, CurrentUserService) {
  $rootScope.$on('routeChangeStart', function() {
    console.log(CurrentUserService.isLoggedIn());
    if (CurrentUserService.isLoggedIn()) {
      $location.path('/event');
    }
  })
})

.controller('MainCtrl', ['$cookies',
                         '$location',
                         '$rootScope',
                         '$route',
                         '$routeParams',
                         '$scope',
                         'CurrentUserService',
                         'LogoutService',
	function($cookies, $location, $rootScope, $route, $routeParams, $scope, CurrentUserService, LogoutService) {
		$scope.$on('$routeChangeSuccess', function() {
			$scope.currentPath = $location.path();
		});

    $scope.$on('$locationChangeStart', function(event, next, current) {
      if ($location.path() !== '/login' && !$cookies.getObject('current_user')) {
        event.preventDefault();
        // Occassionally preventDefault() would
        // still allow part of the page to load.
        $location.path('/login');
      }
    });

    // Used to determine if the sidebar should be hidden.
    $scope.isDashboard = function() {
      if ($scope.currentPath === '/login' || $scope.currentPath === '/eventSelect' || !$cookies.get('selected_event')) {
        return false;
      }
      return true;
    }

    $scope.$on('loggedIn', function() {
      $scope.user = CurrentUserService.getCurrentUser();
    });

    $scope.$watch(function() {
      return CurrentUserService.getCurrentUser()
    }, function(newVal, oldVal) {
      $scope.user = newVal;
    });

    $scope.logout = CurrentUserService.logout;
}])

.factory('sessionStorage', ['$window',
  function($window) {
    var sessionStorage = {};

    sessionStorage.putObject = function(key, value) {
      var stringValue = JSON.stringify(value);
      $window.sessionStorage.setItem(key, stringValue);
    }

    sessionStorage.put = function(key, value) {
      $window.sessionStorage.setItem(key, stringValue);
    }

    sessionStorage.getObject = function(key) {
      var stringValue = $window.sessionStorage.getItem(key);
      return JSON.parse(stringValue);
    }

    sessionStorage.get = function(key) {
      return $window.sessionStorage.getItem(key);
    }

    sessionStorage.clear = function() {
      return $window.sessionStorage.clear();
    }

    return sessionStorage;
  }
]);
