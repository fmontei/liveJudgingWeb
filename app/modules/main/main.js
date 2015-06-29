'use strict';

angular.module('liveJudgingAdmin.main', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/', {
    templateUrl: 'modules/main/main.html',
    controller: 'MainCtrl'
  });
}])

/*.controller('MainCtrl', ['$location', '$route', '$routeParams', '$scope',
	function($location, $route, $routeParams, $scope) {
		$scope.$on('$routeChangeSuccess', function() {
			$scope.currentPath = $location.path();	
	});
}]);*/

.controller('MainCtrl', [function() {

}]);