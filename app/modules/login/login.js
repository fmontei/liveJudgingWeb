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
                          'User', 
    function($base64,
             $cookies,
             $location,
             $rootScope,
             $scope,
             CurrentUserService,
             LoginService,
             User) {

        $scope.newUser = {};
        $scope.returningUser = {};

        $scope.register = function(user) {
            User.register(user).$promise.then(function(user) {
                $scope.user = user;
            });
        };

        $scope.login = function(user) {
            var loginCredentials = 'Basic ' + $base64.encode($scope.returningUser.email + ':' + $scope.returningUser.password);
            LoginService({'Authorization': loginCredentials}).login().$promise.then(function(resp) {
                CurrentUserService.setCurrentUser(resp.user);
                $rootScope.$broadcast('loginSuccess');
                $location.path('/event');
            });
        };

        $scope.logout = function() {
            LoginService({'Authorization': $cookies.get('access_token')}).logout().$promise.then(function(resp) {
                $cookies.remove('current_user');
                //CurrentUserService.removeCurrentUser();
            });
        };
    }
])

.factory('User', ['$resource', function($resource) {
    return $resource('http://api.stevedolan.me/users', {}, {
        register: {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain'
            }
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
            },
            logout: {
                method: 'GET',
                headers: authHeader
            }
        });
    }
})

.factory('CurrentUserService', function($cookies, LoginService) {
    var currentUser;
    var accessToken;

    return {
        isLoggedIn: function() {
            return (currentUser || $cookies.getObject('current_user')) ? true : false;
        },
        getCurrentUser: function() {
            if (!currentUser) {
                currentUser = $cookies.getObject('current_user');
            }
            return currentUser;
        },
        getUserToken: function() {
            if (!token) {
                token = $cookies.get('current_user').token.access_token;
            }
            return token;
        },
        setCurrentUser: function(user) {
            $cookies.putObject('current_user', user);
            currentUser = user;
            accessToken = user.token.access_token;
        }
    }
});
