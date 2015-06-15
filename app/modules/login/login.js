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

		$scope.register = function() {
			var newUserData = {
				'email': 'joe@test.com',
				'password': 'secret',
				'password_confirmation': 'secret', //encrypt 
				'first_name': 'Joe',
				'last_name': 'Qwerty',
				'role': 'judge'
			};

			User.register(newUserData).$promise.then(function(user) {
				$scope.user = user;
			});
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
]);
