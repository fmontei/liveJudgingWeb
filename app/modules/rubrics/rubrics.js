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
	$scope.criteriaToRemove = [];
	$scope.rubricId = null; // Used for storing the id of the rubric currently in the modal.

	$scope.rubricRating = 5; // Default

	$scope.createNewAccordionCriterion = function() {
		console.log($scope.modalCriteria);
		var numberOfNewCriteria = 0;
		for (var i = 0; i < $scope.modalCriteria.length; i++)
			if ($scope.modalCriteria[i].label.indexOf('New Criterion') !== -1)
				numberOfNewCriteria++;
		if (numberOfNewCriteria > 0)
			$scope.modalCriteria.push({label: 'New Criterion (' + numberOfNewCriteria + ')',
										rating: $scope.rubricRating,
										ratingType: 'Inherited',
										isAddition: true});
		else
			$scope.modalCriteria.push({label: 'New Criterion',
										rating: $scope.rubricRating,
										ratingType: 'Inherited',
										isAddition: true});
	}

	$scope.removeAccordionCriterion = function(index) {
		if (!$scope.modalCriteria[index].isAddition) {
			// If the criterion has been previously saved, add its id to 'toRemove' list.
			$scope.criteriaToRemove.push($scope.modalCriteria[index].id);
		}
		$scope.modalCriteria.splice(index, 1);
	}

	$scope.updateRatingType = function(index, type) {
		$scope.modalCriteria[index].ratingType = type;
	}

	$scope.createRubric = function() {
		var rubricReq = {name: $scope.rubricForm.name};
		rubricManagementService.createRubric(rubricReq, $scope.modalCriteria);
		$scope.closeRubricModal();
	}

	$scope.editRubric = function() {
		var rubricReq = {name: $scope.rubricForm.name};
		rubricManagementService.editRubric($scope.rubricId, rubricReq, $scope.modalCriteria, $scope.criteriaToRemove);
		$scope.closeRubricModal();
	}

	$scope.openRubricModal = function(isEdit, rubric) {
		if (isEdit) {
			$scope.rubricModalView = 'edit';
			$scope.rubricForm.name = rubric.name;
			$scope.rubricId = rubric.id;
			$scope.modalCriteria = rubric.criteria;
		} else {
			$scope.rubricModalView = 'create';
			$scope.rubricForm = {};
			$scope.modalCriteria = [];
		}
		$('#rubric-modal').modal('show');
	}

	$scope.closeRubricModal = function() {
		$scope.rubricForm = {};
		$scope.modalCriteria = [];
		$scope.rubricId = null;
		$('#rubric-modal').modal('hide');
	}

	$scope.changeView = function(view) {
		rubricManagementService.changeView(view);
	}
}])

.factory('RubricManagementService', function($q, CurrentUserService, RubricRESTService) {
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
				rubricManagement.createRubricCriteria(resp.id, criteriaReq).then(function(resp) {
					rubricManagement.getRubrics();
				});
				console.log('Successfully created rubric');
			}).catch(function() {
				console.log('Error creating rubric');
			});
		}

		rubricManagement.createRubricCriteria = function(rubricId, criteria) {
			var defer = $q.defer();
			var rubricRESTService = RubricRESTService(authHeader);

			var criteriaPromises = [];
			for (var i = 0; i < criteria.length; i++) {
				criteriaPromises.push(createRubricCriterion(rubricId, criteria[i], rubricRESTService));
			}

			$q.all(criteriaPromises).then(function() {
				defer.resolve();
			}).catch(function() {
				defer.reject();
				console.log('Error creating criteria');
			});

			return defer.promise;

			function createRubricCriterion(rubricId, criterion, rubricRESTService) {
				var defer = $q.defer();
				delete criterion.ratingType;
				rubricRESTService.criteria.create({rubric_id: rubricId}, criterion).$promise.then(function(resp) {
					defer.resolve(resp);
					console.log(resp);
				}).catch(function() {
					defer.reject();
				});

				return defer.promise;
			}
		}

		rubricManagement.editRubric = function(rubricId, rubricReq, criteria, criteriaToRemove) {
			var rubricRESTService = RubricRESTService(authHeader);
			rubricRESTService.rubric.update({id: rubricId}, rubricReq).$promise.then(function(resp) {
				var criteriaToAdd = [];
				for (var i = 0; i < criteria.length; i++) {
					if (criteria[i].isAddition) {
						delete criteria[i].isAddition;
						delete criteria[i].ratingType;
						criteriaToAdd.push(criteria[i]);
					}
				}
				rubricManagement.createRubricCriteria(rubricId, criteriaToAdd).then(function(resp) {
					// todo: make more efficient, right now this edits everything regardless of whether it changed
					rubricManagement.editRubricCriteria(criteria, criteriaToRemove).then(function() {
						rubricManagement.getRubrics();
					}).catch(function() {
						console.log('Error editing rubric criteria');
					});
				}).catch(function() {
					console.log('Error creating rubric criteria');
				});
			}).catch(function() {
				console.log('Error editing rubric');
			});
		}

		rubricManagement.editRubricCriteria = function(criteria, criteriaToRemove) {
			var defer = $q.defer();
			var rubricRESTService = RubricRESTService(authHeader);

			var criteriaPromises = [];
			for (var i = 0; i < criteria.length; i++) {
				criteriaPromises.push(editRubricCriterion(criteria[i], rubricRESTService));
			}
			for (i = 0; i < criteriaToRemove.length; i++) {
				criteriaPromises.push(removeRubricCriterion(criteriaToRemove[i], rubricRESTService));
			}

			$q.all(criteriaPromises).then(function() {
				defer.resolve();
			}).catch(function() {
				defer.reject();
				console.log('Error updating criteria');
			});

			return defer.promise;

			function editRubricCriterion(criterion, rubricRESTService) {
				var defer = $q.defer();
				delete criterion.ratingType;
				rubricRESTService.criterion.update({id: criterion.id}, criterion).$promise.then(function(resp) {
					defer.resolve(resp);
					console.log(resp);
				}).catch(function() {
					defer.reject();
				});

				return defer.promise;
			}

			function removeRubricCriterion(criterionId, rubricRESTService) {
				var defer = $q.defer();
				rubricRESTService.criterion.remove({id: criterionId}).$promise.then(function(resp) {
					defer.resolve(resp);
					console.log(resp);
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
			rubric: $resource('http://api.stevedolan.me/rubrics/:id', {
				id: '@id'
			}, {
				update: {
					method: 'PUT',
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
			}),
			criterion: $resource('http://api.stevedolan.me/criteria/:id', {
				id: '@id'
			}, {
				update: {
					method: 'PUT',
					headers: authHeader
				},
				remove: {
					method: 'DELETE',
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