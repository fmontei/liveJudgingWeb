'use strict';

angular.module('liveJudgingAdmin.login', ['base64', 'ngCookies', 'ngRoute'])

.config(['$routeProvider', function($routeProvider) {
        $routeProvider.when('/login', {
        templateUrl: 'modules/login/login.html',
        controller: 'LoginCtrl'
    });
}])

.controller('LoginCtrl', ['$base64', 
                          '$cookies',
                          '$location',
                          '$rootScope',
                          '$scope',
                          'CurrentUserService',
                          'LoginService',
                          'LogoutService',
                          'User', 
    function($base64,
             $cookies,
             $location,
             $rootScope,
             $scope,
             CurrentUserService,
             LoginService,
             LogoutService,
             User) {

        /* TODO: Use hash not base64 */

        $scope.newUser = {};
        $scope.returningUser = {};
        $scope.error = '';

        $scope.register = function(user) {
            User.register(user).$promise.then(function(user) {
                console.log('User registered.');
                // TODO: Make a 'thanks for registering' screen? Or just login?'
                //$location.path('/registrationSuccess');
            });
        };

        $scope.login = function(user) {
            CurrentUserService.login(user)
            if (CurrentUserService.hasLoginError) {
                $scope.error = 'Unable to login.';
            }
        };

        $scope.logout = function() {
            CurrentUserService.logout();
        };
    }
])

.factory('User', ['$resource', function($resource) {
    return $resource('http://api.stevedolan.me/users', {}, {
        register: {
            method: 'POST'
        }
    }); 
}])

.factory('LoginService', function($resource) {
    return function(authHeader) {
        return $resource('http://api.stevedolan.me/login', {}, {
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

.factory('CurrentUserService', function($base64,
                                        $cookies,
                                        $location,
                                        $rootScope,
                                        LoginService,
                                        LogoutService) {
    var service = {
        currentUser: null,
        isLoggedIn: false,
        hasLoginError: false
    };

    service.isLoggedIn = function() {
        var hasUser = service.currentUser || $cookies.getObject('current_user') ? true : false;
        service.isLoggedIn = hasUser;
        return hasUser;
    },

    service.login = function(user) {
        service.hasLoginError = false;
        LoginService(service.getLoginAuthHeader(user.email, user.password)).login().$promise.then(function(resp) {
            console.log(service);
            service.currentUser = resp.user;
            service.isLoggedIn = true;
            $cookies.putObject('current_user', resp.user);
            $rootScope.isLoggedIn = true;
            $rootScope.$broadcast('loggedIn');
            $location.path('/event');
        }).catch(function() {
            service.hasLoginError = true;
        });
    },

    service.logout = function() {
        LogoutService(service.getAuthHeader()).logout().$promise.catch(function() {
            console.log("Server failed to logout.");
        }).finally(function() {
            $cookies.remove('current_user');
            $cookies.remove('view');
            $cookies.remove('selected_event');
            $cookies.remove('prev_event_view');
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
            service.currentUser = $cookies.getObject('current_user');
        }
        return service.currentUser;
    },

    service.getUserToken = function() {
        return service.getCurrentUser().token.access_token;
    }

    return service;
});
