'use strict';

angular.module('liveJudgingAdmin.teams', ['ngRoute', 'liveJudgingAdmin.login'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/teams', {
    templateUrl: 'modules/teams/teams.html',
    controller: 'TeamsCtrl'
  });
}])

.controller('TeamsCtrl', ['$scope', 'sessionStorage', 'TeamInitService', 'CategoryManagementService', 'ScopeInitService', 'TeamManagementService',
	function($scope, sessionStorage, TeamInitService, CategoryManagementService, ScopeInitService, TeamManagementService) {

		sessionStorage.remove('selectedCategory');

		/*
		 * Automatic synchronization between scope and cookies
		 */

	 	var scopeInitService = ScopeInitService($scope, sessionStorage);
		scopeInitService.init();

		var teamInitService = TeamInitService($scope, sessionStorage);
		teamInitService.initDefaultCookies();

		var categoryManagementService = CategoryManagementService($scope, sessionStorage);

		var teamManagementService = TeamManagementService($scope, sessionStorage);
		teamManagementService.getTeams();
		$scope.teamNumberOptions = teamManagementService.getTeamNumberOptions();

		/*
		 * Team Management Functionality
		 */

		$scope.createNewTeam = function() {
			teamManagementService.createNewTeam();
		}

		$scope.editSelectedTeam = function() {
			teamManagementService.editTeam();
		}

		$scope.deleteTeam = function() {
			teamManagementService.deleteTeam();
		}

		$scope.isTeamAlreadyInCategory = function(categoryName, teamName) {
			var team = teamManagementService.getTeamByName(teamName);
			// Need a cat->team mapping.
			return team !== null;
		}

		/*
		 * Change Category View
		 */

		$scope.changeView = function(view) {
			teamManagementService.changeView(view);
		}

		/*
		 * Change Team View
		 */

		$scope.changeTeamModalView = function(view, team) {
			$scope.teamModalView = view;
			$scope.openTeamModal();
			if (view === 'edit') {
				$scope.populateTeamModal(team);
				sessionStorage.putObject('selectedTeam', team);
			}
		}

		$scope.populateTeamModal = function(team) {
			$scope.teamID = team.id;
			$scope.teamName = team.name;
			$scope.teamNumber = team.number;
			$scope.teamLogo = team.logo;
			$scope.teamDesc = team.desc;
		}

		$scope.openTeamModal = function() {
			$('#team-modal').modal('show');
		}

		$scope.closeTeamModal = function() {
			$scope.teamName = '';
			$scope.teamNumber = '';
			$scope.teamLogo = '';
			$scope.teamDesc = '';
			$('#team-modal').modal('hide');
			sessionStorage.remove('selectedTeam');
		}

}])

.factory('TeamInitService', ['$q', '$log', '$rootScope', 'CategoryRESTService', 'TeamRESTService',
		'CategoryManagementService', 'CurrentUserService', 'sessionStorage',
	function($q, $log, $rootScope, CategoryRESTService, TeamRESTService,
		CategoryManagementService, CurrentUserService, sessionStorage) {
	return function($scope, sessionStorage) {
		var teamInitService = {};
		var selectedEvent = sessionStorage.getObject('selected_event');
		var categoryManagementService = CategoryManagementService($scope, sessionStorage);

		teamInitService.initDefaultCookies = function() {
			sessionStorage.put('teamView', 'default');
			sessionStorage.categoryTime = Date();
		}

		return teamInitService;
	}
}])

.factory('ScopeInitService', function(sessionStorage) {
	return function($scope, sessionStorage) {
		var initService = {};

		initService.init = function() {
			$scope.$watch(function() {
				return sessionStorage.getObject('selectedCategory');
			}, function(newValue) {
				$scope.selectedCategory = newValue;
			}, true);

			$scope.$watch(function() {
				return sessionStorage.getObject('selectedTeam');
			}, function(newValue) {
				$scope.selectedTeam = newValue;
			}, true);

			$scope.$watch(function() {
				return sessionStorage.get('teamView');
			}, function(newValue) {
				$scope.teamView = newValue;
			});

			$scope.$watch(function() {
				return sessionStorage.getObject('teams');
			}, function(newValue) {
				$scope.teams = newValue;
			}, true);

			$scope.$watch(function() {
				return sessionStorage.getObject('categories');
			}, function(newValue) {
				$scope.categories = newValue;
			}, true);

			$scope.selectedEvent = sessionStorage.getObject('selected_event');
		}

		return initService;
	}
})


.factory('TeamManagementService', ['$log', '$q', 'CategoryManagementService', 'CurrentUserService', 'TeamInitService', 'TeamRESTService', 'sessionStorage',
	function($log, $q, CategoryManagementService, CurrentUserService, TeamInitService, TeamRESTService, sessionStorage) {
	return function($scope, sessionStorage) {
		var teamManagement = {};
		var authHeader = CurrentUserService.getAuthHeader();
		var selectedEvent = sessionStorage.getObject('selected_event');
		var categoryManagementService = CategoryManagementService($scope, sessionStorage);
		var teamInitService = TeamInitService($scope, sessionStorage);

		teamManagement.getTeams = function() {
			var defer = $q.defer();

			var connection = TeamRESTService(authHeader);
			connection.teams.get({event_id: selectedEvent.id}).$promise.then(function(resp) {
				return getCategoriesForEachTeam(resp.event_teams);
			}).then(function(filledTeams) {
				sessionStorage.putObject('teams', filledTeams);
				defer.resolve('Successfully got teams.');
			}).catch(function() {
				sessionStorage.put('generalErrorMessage', 'Error getting teams from server.');
				defer.reject('Error getting teams.');
				$log.log('Error getting teams from server.');
			});

			return defer.promise;
		}

		var getCategoriesForEachTeam = function(eventTeams) {
			var deferred = $q.defer();
			var filledTeams = [], promises = [];
			var connection = TeamRESTService(authHeader);

			function promiseCategories(team) {
				var innerDeferred = $q.defer();
				team.categories = [];
				connection.team_categories.get({team_id: team.id}).$promise.then(function(resp) {
					angular.forEach(resp.team_categories, function(team_category) {
						team.categories.push(team_category.category);
					});
					$q.all(team.categories).then(function() {
						innerDeferred.resolve(team);
					});
				});
				return innerDeferred.promise;
			}

			angular.forEach(eventTeams, function(team) {
				var promise = promiseCategories(team).then(function(filledTeam) {
					filledTeams.push(filledTeam);
				});
				promises.push(promise);
			});

			$q.all(promises).then(function() {
				deferred.resolve(filledTeams);
			});
			return deferred.promise;
		}

		teamManagement.createNewTeam = function() {
			if (!validateForm(false))
				return;
			var newTeam = {
				name: $scope.teamName,
				number: $scope.teamNumber,
				logo: $scope.teamLogo,
				desc: $scope.teamDesc
			};
			var teamReq = {
				name: newTeam.name,
				logo: newTeam.logo
			};
			createTeamOnServer(newTeam, teamReq);
		}

		var createTeamOnServer = function(newTeam, teamReq) {
			var eventId = sessionStorage.getObject('selected_event').id;
			var connection = TeamRESTService(authHeader);
			connection.teams.create({event_id: eventId}, teamReq).$promise.then(function(resp) {

				// Add new team to uncategorized (or to the selected category if there is one).
				var returnedTeamID = resp.event_team.id;
				var catId;
				if (sessionStorage.getObject('selectedCategory')) {
					catId = sessionStorage.getObject('selectedCategory').id;
				} else {
					catId = sessionStorage.getObject('uncategorized').id;
				}
				categoryManagementService.transferTeamToCategory(catId, returnedTeamID, false);

				var teams = sessionStorage.getObject('teams');
				if (teams) {
					teams.push(resp.event_team);
					sessionStorage.putObject('teams', teams);
				} else {
					sessionStorage.putObject('teams', resp.event_team);
				}
				// Todo: Update uncategorized to reflect changes.
			}).catch(function() {
				sessionStorage.put('generalErrorMessage', 'Error creating new team.');
				$log.log('Error creating new team.');
			});
		}

		teamManagement.editTeam = function() {
			if (!validateForm(true))
				return;
			var updatedTeam = {
				id: $scope.teamID,
				name: $scope.teamName,
				number: $scope.teamNumber,
				logo: $scope.teamLogo,
				desc: $scope.teamDesc
			};
			var req = {
				name: updatedTeam.name
			};
			// Server returns a 500 if a null logo is passed in.
			if (updatedTeam.logo) {
				req.logo = updatedTeam.logo;
			}
			var connection = TeamRESTService(authHeader);
			connection.team.update({id: updatedTeam.id}, req).$promise.then(function(resp) {
				// Todo: call API to update category->team mappings (once that's in the API).
				updateTeam(updatedTeam);
				$scope.closeTeamModal();
				$log.log("Team edited: " + resp.event_team.name);
			}).catch(function() {
				sessionStorage.put('generalErrorMessage', 'Error editing team.');
				$log.log('Error editing team.');
			});
		}

		var updateTeam = function(newTeam) {
			var teams = sessionStorage.getObject('teams');
			var teamToUpdate = null;
			for (var i = 0; i < teams.length; i++) {
				if (newTeam.id === teams[i].id) {
					teamToUpdate = teams[i];
					break;
				}
			}
			newTeam.categories = teamToUpdate.categories;
			teams[teams.indexOf(teamToUpdate)] = newTeam;
			sessionStorage.putObject('teams', teams);
		}

		teamManagement.deleteTeam = function() {
			var defer = $q.defer();
			var connection = TeamRESTService(authHeader);
			connection.team.delete({id: sessionStorage.getObject('selectedTeam').id}).$promise.then(function(resp) {
				categoryManagementService.getCategories();
				var teams = sessionStorage.getObject('teams');
				for (var i = 0; i < teams.length; i++) {
					if (teams[i].id == sessionStorage.getObject('selectedTeam').id) {
						teams.splice(i, 1);
						break;
					}
				}
				sessionStorage.putObject('teams', teams);
				$scope.closeTeamModal();
				$log.log('Successfully deleted team.');
				defer.resolve(true);
				// Todo: update categories' team lists to reflect changes.
			}).catch(function() {
				sessionStorage.put('generalErrorMessage', 'Error deleting team.');
				$log.log('Error deleting team.');
				defer.resolve(false);
			});
			return defer.promise;
		}

		teamManagement.updateStoredCategory = function(category) {
			sessionStorage.putObject('selectedCategory', category);
		}

		teamManagement.getTeamNumberOptions = function() { // TODO: remove numbers that are unavailable
			var numbers = [];
			for (var i = 10; i < 100; i++) numbers.push(i);
			return numbers;
		}

		teamManagement.getTeamByName = function(teamName) {
			var retVal = null;
			var teams = sessionStorage.getObject('teams');
			angular.forEach(teams, function(team) {
				if (team.name === teamName) {
					retVal = team;
				}
			});
			return retVal;
		}

		teamManagement.getTeamByID = function(teamId) {
			var teams = sessionStorage.getObject('teams');
			for (var i = 0; i < teams.length; i++) {
				if (teams[i].id == teamId) {
					return teams[i];
				}
			}
			return null;
		}

		teamManagement.isTeamAlreadyInCategory = function(teamId, categoryId) {
			var defer = $q.defer();

			categoryManagementService.getTeamsInCategory(categoryId).then(function(teamsInCat) {
				for (var i = 0; i < teamsInCat.length; i++) {
					if (teamId == teamsInCat[i].id) {
						defer.resolve(true);
					}
				}
				defer.resolve(false);
			}).catch(function() {
				sessionStorage.put('generalErrorMessage', 'Error getting teams in category.');
				defer.reject('Error getting teams in category');
			});

			return defer.promise;
		}

		teamManagement.changeView = function(view) {
			sessionStorage.put('teamView', view);
			if (view == 'default') {
				sessionStorage.remove('selectedCategory');
			}
		}

		var validateForm = function(isEdit) {
			var name = $scope.teamName;
			$scope.teamModalError = undefined;
			if (isEmpty(name))
				$scope.teamModalError = 'Team name is required.';
			else if (!isEdit && isTeamNameTaken(name))
				$scope.teamModalError = 'Team name already taken.';
			return $scope.teamModalError === undefined;
		}

		var isTeamNameTaken = function(name) {
			return teamManagement.getTeamByName(name) !== null;
		}

		var isEmpty = function(str) {
	    return (!str || 0 === str.length);
		}

		return teamManagement;
	}
}])

.factory('TeamRESTService', function($resource, CurrentUserService) {
	return function(authHeader) {
		return {
			team: $resource('http://api.stevedolan.me/teams/:id', {
				id: '@id'
			}, {
				get: {
					method: 'GET',
					headers: authHeader
				},
				update: {
					method: 'PUT',
					headers: authHeader
				},
				delete: {
					method: 'DELETE',
					headers: authHeader
				}
			}),
			teams: $resource('http://api.stevedolan.me/events/:event_id/teams', {
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
			}),
			team_categories: $resource('http://api.stevedolan.me/teams/:team_id/categories', {
				team_id: '@id', category_id: '@category_id'
			}, {
				get: {
					method: 'GET',
					headers: authHeader
				},
				add_team: {
					method: 'POST',
					headers: authHeader
				},
				remove_team: {
					url: 'http://api.stevedolan.me/teams/:team_id/categories/:category_id',
					method: 'DELETE',
					headers: authHeader
				}
			})
		}
	}
})

.factory('TimeParseTool', ['$filter', function($filter) {
	var timeParseTool = {};

	timeParseTool.parseTimeModel = function(timeString) {
		var timeObject = new Date(timeString);
		var shortDate = $filter('date')(timeObject, 'shortDate');
		var shortTime = $filter('date')(timeObject, 'shortTime');
		return shortDate.toString() + ' ' + shortTime.toString();
	}

	return timeParseTool;
}])

.directive('cngCategoryAccordion', function() {
	return {
		restrict: 'A',
		scope: {
			categoryName: '@',
			color: '@',
			changeCategory: '&'
		},
		link: function(scope, elem, attrs) {
			elem.css('border-color', scope.color);
			elem.find('.panel-heading').css('border-color', scope.color).css('background-color', scope.color);
			elem.bind('mouseenter', function() {
				scope.changeCategory({category: scope.categoryName});
			});
		}
	}
});
