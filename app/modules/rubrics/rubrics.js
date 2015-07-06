'use strict';

angular.module('liveJudgingAdmin.rubrics', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/rubrics', {
    templateUrl: 'modules/rubrics/rubrics.html',
    controller: 'RubricsCtrl'
  });
}])

.controller('RubricsCtrl', ['$scope', '$cookies', 'sessionStorage', 'RubricManagementService',
						function($scope, $cookies, sessionStorage, RubricManagementSerive) {
							
	var rubricManagementService = RubricManagementSerive($scope, $cookies);
							
	$scope.modalCriteria = [{name: 'Flavor'}, {name: 'Texture'}, {name: 'Size'}];
	
	$scope.createNewAccordionCriterion = function() {
		var numberOfNewCriteria = 0;
		for (var i = 0; i < $scope.modalCriteria.length; i++) 
			if ($scope.modalCriteria[i].name.indexOf('New Criterion') !== -1)
				numberOfNewCriteria++;
		if (numberOfNewCriteria > 0)
			$scope.modalCriteria.push({name: 'New Criterion (' + numberOfNewCriteria + ')'});
		else
			$scope.modalCriteria.push({name: 'New Criterion'});
	}
	
	$scope.removeAccordionCriterion = function(index) {
		$scope.modalCriteria.splice(index, 1);
	}

	$scope.updateRatingType = function(index, type) {
		$scope.modalCriteria[index].ratingType = type;
	}
	
	$scope.changeView = function(view) {
		rubricManagementService.changeView(view);
	}
	
	$cookies.put('rubricView', 'default');
	
	$scope.$watch(function() {
		return $cookies.get('rubricView');
	}, function(newValue) {
		$scope.rubricView = newValue;
	});
							
	$scope.$watch(function() {
		return $cookies.getObject('selectedCategory');
	}, function(newValue) {
		$scope.selectedCategory = newValue;
	}, true);
}])

.factory('RubricManagementService', function() {
	return function($scope, $cookies) {
		var rubricManagement = {};

		rubricManagement.changeView = function(view) {
			$cookies.put('rubricView', view);
		}

		return rubricManagement;
	}
});