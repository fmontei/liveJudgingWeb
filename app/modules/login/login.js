'use strict';

angular.module('liveJudgingAdmin.login', ['base64', 'ngRoute'])

.config(['$routeProvider', function($routeProvider) {
        $routeProvider.when('/login', {
        templateUrl: 'modules/login/login.html',
        controller: 'LoginCtrl'
    });
}])

.controller('LoginCtrl', ['$base64', 
                          'sessionStorage',
                          '$location',
                          '$rootScope',
                          '$scope',
                          'CurrentUserService',
                          'LoginService',
                          'LogoutService',
                          'UserRESTService', 
    function($base64,
             sessionStorage,
             $location,
             $rootScope,
             $scope,
             CurrentUserService,
             LoginService,
             LogoutService,
             UserRESTService) {

        /* TODO: Use hash not base64 */

        $scope.newUser = {};
			
        $scope.returningUser = {};
			
				$scope.tabs = [{active: true}, {active: false}];
			
				$scope.$watch(function() {
						return CurrentUserService.hasLoginError;
				 }, function(newValue) {
						$scope.error = (newValue) ? 'Error logging in.' : undefined;
				 });

        $scope.register = function(user) {
					if (user.password !== user.password_confirmation) {
						$scope.registerError = 'Passwords do not match.';
						return;
					} else {
						$scope.registerError = undefined;
					}
					UserRESTService.register(user).$promise.then(function(user) {
						console.log('User registered.');
						$scope.tabs = [{active: true}, {active: false}];
						$scope.success = 'Successfully registered.';
					});
        };

        $scope.login = function(user) {
            CurrentUserService.login(user)
        };

        $scope.logout = function() {
            CurrentUserService.logout();
        };
    }
])

.factory('UserRESTService', ['$resource', 'CurrentUserService', function($resource, CurrentUserService) {
    return $resource('http://api.stevedolan.me/users', {}, {
        register: {
            method: 'POST'
        }
    });
}])

.factory('LoginService', function($resource) {
    return function(authHeader) {
        return $resource('http://api.stevedolan.me/login', {'platform': 'Web'}, {
            login: {
                method: 'GET',
                headers: authHeader,
                withCredentials: true
            }
        });
    }
})

.factory('LogoutService', function($resource) {
    return function(authHeader) {
        return $resource('http://api.stevedolan.me/logout', {}, {
            logout: {
                method: 'GET',
                headers: authHeader
            }
        });
    }
})

.factory('CurrentUserService', function($resource,
                                        $base64,
                                        sessionStorage,
                                        $location,
                                        $rootScope,
                                        LoginService,
                                        LogoutService) {
    var service = {
        currentUser: null,
        isLoggedIn: false,
        hasLoginError: false
    };
  
    service.editUser = function(authHeader) {
        return $resource('http://api.stevedolan.me/users/:id', {
          id: '@id' 
        }, {
            edit: {
                method: 'PUT',
                headers: authHeader
            }
        });
    }

    service.isLoggedIn = function() {
        var hasUser = service.currentUser || sessionStorage.getObject('current_user') ? true : false;
        service.isLoggedIn = hasUser;
        return hasUser;
    },

    service.login = function(user) {
		service.hasLoginError = false;
        LoginService(service.getLoginAuthHeader(user.email, user.password)).login().$promise.then(function(resp) {
            console.log(service);
            service.currentUser = resp;
            service.isLoggedIn = true;
            sessionStorage.putObject('current_user', service.currentUser);
            $rootScope.isLoggedIn = true;
            $rootScope.$broadcast('loggedIn');
            $location.path('/eventSelect');
        }).catch(function() {
            service.hasLoginError = true;
        });
    },

    service.logout = function() {
        LogoutService(service.getAuthHeader()).logout().$promise.catch(function() {
            console.log("Server failed to logout.");
        }).finally(function() {
            sessionStorage.remove('current_user');
            sessionStorage.remove('event_view');
            sessionStorage.remove('selected_event');
            sessionStorage.remove('prev_event_view');
            sessionStorage.remove('teamView');
            sessionStorage.remove('selectedTeam');
            sessionStorage.remove('categories');
						sessionStorage.clear();

            service.currentUser = null;
            $rootScope.isLoggedIn = false;
            $rootScope.$broadcast('loggedOut');
            /* TODO: make a logout page to redirect to */
            $location.path('/login');
        });
    },

    service.getAuthHeader = function() {
        var token = service.getUserToken();
        return {Authorization: 'Token token=' + token};
    },

    service.getLoginAuthHeader = function(email, password) {
        return {Authorization: 'Basic ' + $base64.encode(email + ':' + password)};
    },

    service.getCurrentUser = function() {
        if (!service.currentUser) {
            service.currentUser = sessionStorage.getObject('current_user');
        }
        return service.currentUser;
    },

    service.getUserToken = function() {
        return service.getCurrentUser().token.access_token;
    }

    return service;
})

.directive('loginValidation', function() {
  	return {
      require: "ngModel",
      scope: {
        otherModelValue: "=compareTo"
      },
      link: function(scope, element, attributes, ngModel) {

        ngModel.$validators.compareTo = function(modelValue) {
            if (modelValue !== scope.otherModelValue)
              element.addClass('invalid-password');
          else
              element.removeClass('invalid-password');
          return modelValue === scope.otherModelValue;
        };

        scope.$watch("otherModelValue", function() {
          ngModel.$validate();
        });
      }
  	};
});
