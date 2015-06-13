'use strict';

angular.module('liveJudgingAdmin.categories', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/categories', {
    templateUrl: 'modules/categories/categories.html',
    controller: 'CategoriesCtrl'
  });
}])

.controller('CategoriesCtrl', [function() {

}]);