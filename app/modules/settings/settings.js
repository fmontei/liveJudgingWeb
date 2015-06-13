'use strict';

angular.module('liveJudgingAdmin.settings', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/settings', {
    templateUrl: 'modules/settings/settings.html',
    controller: 'SettingsCtrl'
  });
}])

.controller('SettingsCtrl', [function() {

}]);