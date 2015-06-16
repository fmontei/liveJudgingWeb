'use strict';

angular.module('liveJudgingAdmin.login', ['ngRoute'])

.config(['$routeProvider', 
	function($routeProvider) {
  		$routeProvider.when('/login', {
			templateUrl: 'modules/login/login.html',
    	controller: 'LoginCtrl'
  	});
}])

.controller('LoginCtrl', ['$scope', 'User', 
	function($scope, User) {

		$scope.newUser = {};
		$scope.returningUser = {};

		$scope.register = function() {

			User.register($scope.newUser).$promise.then(function(user) {
				$scope.user = user;
			});
		};

		$scope.login = function() {
		};
	}
])

.factory('User', ['$resource', function($resource) {
		return $resource('http://api.stevedolan.me/users', {}, {
			register: {
				method: 'POST',
				header: {
					'Content-Type': 'text/plain'
				}
			}
		});
	}
])

.factory('LoginService', ['$resource', function($resource) {
		return $resource('http://api.stevedolan.me/login', {}, {
			login: {}
		});
}]);
