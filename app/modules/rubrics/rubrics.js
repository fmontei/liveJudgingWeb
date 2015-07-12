'use strict';

angular.module('liveJudgingAdmin.rubrics', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/rubrics', {
    templateUrl: 'modules/rubrics/rubrics.html',
    controller: 'RubricsCtrl'
  });
}])

.controller('RubricsCtrl', ['$scope', 'sessionStorage', 'RubricManagementService',
						function($scope, sessionStorage, RubricManagementService) {

	var rubricManagementService = RubricManagementService($scope, sessionStorage);

	$scope.rubricForm = {};
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

	$scope.createRubric = function() {
		var rubricReq = {name: $scope.rubricForm.name};
		rubricManagementService.createRubric(rubricReq);
	}

	$scope.changeView = function(view) {
		rubricManagementService.changeView(view);
	}

	sessionStorage.put('rubricView', 'default');

	$scope.$watch(function() {
		return sessionStorage.get('rubricView');
	}, function(newValue) {
		$scope.rubricView = newValue;
	});

	$scope.$watch(function() {
		return sessionStorage.getObject('selectedCategory');
	}, function(newValue) {
		$scope.selectedCategory = newValue;
	}, true);
}])

.factory('RubricManagementService', function(CurrentUserService, RubricRESTService) {
	return function($scope, sessionStorage) {
		var rubricManagement = {};

		rubricManagement.changeView = function(view) {
			sessionStorage.put('rubricView', view);
		}

		rubricManagement.getRubrics = function() {
			var eventId = sessionStorage.getObject('selected_event').id;
			RubricRESTService(CurrentUserService.getAuthHeader()).rubrics.get({event_id: eventId}).$promise.then(function(resp) {
				sessionStorage.put('rubrics', resp.event_rubrics);
				console.log(resp.event_rubrics);
			}).catch(function() {
				console.log('Error getting rubrics');
			});
		}

		rubricManagement.createRubric = function(rubricReq) {
			var eventId = sessionStorage.getObject('selected_event').id;
			RubricRESTService(CurrentUserService.getAuthHeader()).rubrics.create({event_id: eventId}, rubricReq).$promise.then(function(resp) {
				console.log(resp);
				console.log('Successfully created rubric');
			}).catch(function() {
				console.log('Error creating rubric');
			});
		}

		return rubricManagement;
	}
})

.factory('RubricRESTService', function($resource, CurrentUserService) {
	return function(authHeader) {
		return {
			rubrics: $resource('http://api.stevedolan.me/events/:event_id/rubrics', {
				event_id: '@id'
			}, {
				get: {
					method: 'GET',
					headers: authHeader
				},
				create: {
					method: 'POST',
					headers: authHeader
				}
			})
		}
	}
});