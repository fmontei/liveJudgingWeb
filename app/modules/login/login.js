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
                          'RegistrationRESTService', 
    function($base64,
             sessionStorage,
             $location,
             $rootScope,
             $scope,
             CurrentUserService,
             LoginService,
             LogoutService,
             RegistrationRESTService) {

        $scope.newUser = {};
			
        $scope.returningUser = {};
			
				$scope.tabs = [{active: true}, {active: false}, {active: false}];
      
        $scope.defaultAccounts = [{email: 'alice@test.com', password: 'password'}];
			
				$scope.$watch(function() {
						return CurrentUserService.hasLoginError;
				 }, function(newValue) {
            if (newValue) {
              $scope.loginError = 'Error logging in.';
              $scope.success = undefined;
            } else {
              $scope.loginError = undefined;
            }
				 });

        $scope.register = function(user) {
					if (user.password !== user.password_confirmation) {
						$scope.registerError = 'Passwords do not match.';
						return;
					} else {
						$scope.registerError = undefined;
					}
					RegistrationRESTService.register(user).$promise.then(function(user) {
						console.log('User registered.');
						$scope.tabs = [{active: true}, {active: false}];
						$scope.success = 'Successfully registered.';
            $scope.loginError = undefined;
					});
        };

        $scope.login = function(user) {
            CurrentUserService.login(user)
        };

        $scope.logout = function() {
            CurrentUserService.logout();
        };
      
        $scope.setLoginPassword = function() {
          angular.forEach($scope.defaultAccounts, function(account) {
            if (account.email === $scope.returningUser.email) {
              $scope.returningUser.password = account.password;
            }
          });  
        };
    }
])

.factory('RegistrationRESTService', ['$rootScope', '$resource', 'CurrentUserService', 
                                     function($rootScope, $resource, CurrentUserService) {
    return $resource($rootScope.rootURL + 'users', {}, {
        register: {
            method: 'POST'
        }
    });
}])

.factory('UserRESTService', ['$rootScope', '$resource', function($rootScope, $resource) {
    return function(authHeader) {
        return $resource($rootScope.rootURL + 'users', {}, {
            get: {
                method: 'GET',
                params: {email: '@email'},
                headers: authHeader,
                isArray: true
            }
        });
    }
}])

.factory('LoginService', ['$rootScope', '$resource', function($rootScope, $resource) {
    return function(authHeader) {
        return $resource($rootScope.rootURL + 'login', {'platform': 'Web'}, {
            login: {
                method: 'GET',
                headers: authHeader,
                withCredentials: true
            }
        });
    }
}])

.factory('LogoutService', function($rootScope, $resource) {
    return function(authHeader) {
        return $resource($rootScope.rootURL + 'logout', {}, {
            logout: {
                method: 'GET',
                headers: authHeader
            }
        });
    }
})

.factory('CurrentUserService', function($rootScope,
                                        $resource,
                                        $base64,
                                        sessionStorage,
                                        $location,
                                        LoginService,
                                        LogoutService) {
    var service = {
        currentUser: null,
        isLoggedIn: false,
        hasLoginError: false
    };
  
    service.editUser = function(authHeader) {
        return $resource($rootScope.rootURL + 'users/:id', {
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
