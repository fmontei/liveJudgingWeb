'use strict';

angular.module('liveJudgingAdmin.rubrics', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/rubrics', {
    templateUrl: 'modules/rubrics/rubrics.html',
    controller: 'RubricsCtrl'
  });
}])

.controller('RubricsCtrl', ['$scope', 'sessionStorage', 'RubricManagementService', 'RubricWatchService',
						function($scope, sessionStorage, RubricManagementService, RubricWatchService) {

	var rubricWatchService = RubricWatchService($scope, sessionStorage);
	rubricWatchService.init();

	var rubricManagementService = RubricManagementService($scope, sessionStorage);
	rubricManagementService.getRubrics();

	$scope.rubricForm = {};
	$scope.modalCriteria = [];

	$scope.rubricRating = 5; // Default

	$scope.createNewAccordionCriterion = function() {
		console.log($scope.modalCriteria);
		var numberOfNewCriteria = 0;
		for (var i = 0; i < $scope.modalCriteria.length; i++)
			if ($scope.modalCriteria[i].name.indexOf('New Criterion') !== -1)
				numberOfNewCriteria++;
		if (numberOfNewCriteria > 0)
			$scope.modalCriteria.push({name: 'New Criterion (' + numberOfNewCriteria + ')', rating: $scope.rubricRating, ratingType: 'Inherited'});
		else
			$scope.modalCriteria.push({name: 'New Criterion', rating: $scope.rubricRating, ratingType: 'Inherited'});
	}

	$scope.removeAccordionCriterion = function(index) {
		$scope.modalCriteria.splice(index, 1);
	}

	$scope.updateRatingType = function(index, type) {
		$scope.modalCriteria[index].ratingType = type;
	}

	$scope.createRubric = function() {
		var rubricReq = {name: $scope.rubricForm.name};
		console.log($scope.modalCriteria);
		rubricManagementService.createRubric(rubricReq, $scope.modalCriteria);
	}

	$scope.changeView = function(view) {
		rubricManagementService.changeView(view);
	}
}])

.factory('RubricManagementService', function(CurrentUserService, RubricRESTService) {
	return function($scope, sessionStorage) {
		var authHeader = CurrentUserService.getAuthHeader();
		var rubricManagement = {};

		rubricManagement.changeView = function(view) {
			sessionStorage.put('rubricView', view);
		}

		rubricManagement.getRubrics = function() {
			var eventId = sessionStorage.getObject('selected_event').id;
			RubricRESTService(authHeader).rubrics.get({event_id: eventId}).$promise.then(function(resp) {
				sessionStorage.putObject('rubrics', resp);
				console.log(resp);
				console.log(sessionStorage.getObject('rubrics'));
			}).catch(function() {
				console.log('Error getting rubrics');
			});
		}

		rubricManagement.getRubricCriteria = function(rubricId) {
			RubricRESTService(authHeader).criteria.get({rubric_id: rubricId}).$promise.then(function(resp) {
				console.log(resp);
				console.log('Successfully created criteria');
			}).catch(function() {
				console.log('Error creating criteria');
			});
		}

		rubricManagement.createRubric = function(rubricReq, criteriaReq) {
			var eventId = sessionStorage.getObject('selected_event').id;
			RubricRESTService(authHeader).rubrics.create({event_id: eventId}, rubricReq).$promise.then(function(resp) {
				rubricManagement.createRubricCriteria(criteriaReq).then(function(resp) {
					rubricManagement.getRubrics();
				});
				console.log('Successfully created rubric');
			}).catch(function() {
				console.log('Error creating rubric');
			});
		}

		rubricManagement.createRubricCriteria = function(criteria) {
			var defer = $q.defer();
			var rubricRESTService = RubricRESTService(authHeader);

			var criteriaPromises = [];
			for (var i = 0; i < criteria.length; i++) {
				criteriaPromise.push(createRubricCriterion(criteria[i], rubricRESTService));
			}

			$q.all(criteriaPromises).then(function() {
				defer.resolve();
			}).catch(function() {
				defer.reject();
				console.log('Error creating criteria');
			});

			return defer.promise;

			function createRubricCriterion(criteron, rubricRESTService) {
				var defer = $q.defer();
				rubricRESTService.criteria.create(criterion).$promise.then(function(resp) {
					defer.resolve(resp.criterion);
				}).catch(function() {
					defer.reject();
				});

				return defer.promise;
			}
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
					isArray: true,
					headers: authHeader
				},
				create: {
					method: 'POST',
					headers: authHeader
				}
			}),
			criteria: $resource('http://api.stevedolan.me/rubrics/:rubric_id/criteria', {
				rubric_id: '@id'
			}, {
				get: {
					method: 'GET',
					isArray: true,
					headers: authHeader
				},
				create: {
					method: 'POST',
					headers: authHeader
				}
			})
		}
	}
})

.factory('RubricWatchService', function() {
	return function($scope, sessionStorage) {
		var service = {};

		service.init = function() {
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

			$scope.$watch(function() {
				return sessionStorage.getObject('rubrics');
			}, function(newValue) {
				$scope.rubrics = newValue;
			}, true);
		}

		return service;
	}
});