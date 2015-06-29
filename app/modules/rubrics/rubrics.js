'use strict';

angular.module('liveJudgingAdmin.rubrics', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/rubrics', {
    templateUrl: 'modules/rubrics/rubrics.html',
    controller: 'RubricsCtrl'
  });
}])

.controller('RubricsCtrl', ['$scope', function($scope) {
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
}]);