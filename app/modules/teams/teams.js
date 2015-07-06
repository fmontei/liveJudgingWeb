'use strict';

angular.module('liveJudgingAdmin.teams', ['ngRoute', 'ngCookies', 'liveJudgingAdmin.login'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/teams', {
    templateUrl: 'modules/teams/teams.html',
    controller: 'TeamsCtrl'
  });
}])

.controller('TeamsCtrl', ['$scope', '$cookies', 'TeamInitService', 'CategoryManagementService', 'ScopeInitService', 'TeamManagementService',
	function($scope, $cookies, TeamInitService, CategoryManagementService, ScopeInitService, TeamManagementService) {

		/*
		 * Automatic synchronization between scope and cookies
		 */

	 	var scopeInitService = ScopeInitService($scope, $cookies);
		scopeInitService.init();

		var teamInitService = TeamInitService($scope, $cookies);
		teamInitService.initDefaultCookies();
		teamInitService.initTeams();

		var categoryManagementService = CategoryManagementService($scope, $cookies);		

		var teamManagementService = TeamManagementService($scope, $cookies);
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
				$cookies.putObject('selectedTeam', team);
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
			$cookies.remove('selectedTeam');
		}

}])

.factory('TeamInitService', ['$q', '$log', '$rootScope', 'CategoryRESTService', 'TeamRESTService', 
		'CategoryManagementService', 'CurrentUserService', 'sessionStorage',
	function($q, $log, $rootScope, CategoryRESTService, TeamRESTService, 
		CategoryManagementService, CurrentUserService, sessionStorage) {
	return function($scope, $cookies) {
		var teamInitService = {};
		var selectedEvent = $cookies.getObject('selected_event');
		var categoryManagementService = CategoryManagementService($scope, $cookies);	

		teamInitService.initDefaultCookies = function() {
			$cookies.put('teamView', 'default');
			$cookies.categoryTime = Date();
		}	

		teamInitService.initTeams = function() {
			var connection = TeamRESTService(CurrentUserService.getAuthHeader());
			connection.teams.get({event_id: selectedEvent.id}).$promise.then(function(resp) {
				return getCategoriesForEachTeam(resp.event_teams);
			}).then(function(filledTeams) {
				sessionStorage.putObject('teams', filledTeams);
			}).catch(function() {
				var errorMessage = 'Error getting teams from server.';
				$log.log(errorMessage);
			});
		}
		
		var getCategoriesForEachTeam = function(eventTeams) {
			var deferred = $q.defer();
			var filledTeams = [], promises = [];
			var connection = TeamRESTService(CurrentUserService.getAuthHeader());
			
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

		return teamInitService;
	}
}])

.factory('ScopeInitService', function(sessionStorage) {
	return function($scope, $cookies) {
		var initService = {};

		initService.init = function() {
			$scope.$watch(function() {
				return $cookies.getObject('selectedCategory');
			}, function(newValue) {
				$scope.selectedCategory = newValue;
			}, true);

			$scope.$watch(function() {
				return $cookies.getObject('selectedTeam');
			}, function(newValue) {
				$scope.selectedTeam = newValue;
			}, true);

			$scope.$watch(function() {
				return $cookies.get('teamView');
			}, function(newValue) {
				$scope.teamView = newValue;
			});

			$scope.$watch(function() {
				return sessionStorage.getObject('teams');
			}, function(newValue) {
				$scope.teams = newValue;
			}, true);

			$scope.selectedEvent = $cookies.getObject('selected_event');
		}

		return initService;
	}
})


.factory('TeamManagementService', ['$log', 'CategoryManagementService', 'CurrentUserService', 'TeamRESTService', 'sessionStorage',
	function($log, CategoryManagementService, CurrentUserService, TeamRESTService, sessionStorage) {
	return function($scope, $cookies) {
		var teamManagement = {};
		var authHeader = CurrentUserService.getAuthHeader();
		var categoryManagementService = CategoryManagementService($scope, $cookies);

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
			var eventId = $cookies.getObject('selected_event').id;
			var connection = TeamRESTService(authHeader);
			connection.teams.create({event_id: eventId}, teamReq).$promise.then(function(resp) {

				// Add new team to uncategorized (or to the selected category if there is one).
				var returnedTeamID = resp.event_team.id;
				var catId;
				if ($cookies.getObject('selectedCategory')) {
					catId = $cookies.getObject('selectedCategory').id;
				} else {
					catId = $cookies.getObject('uncategorized').id;
				}
				teamManagement.transferTeamToCategory(catId, returnedTeamID, false);

				var teams = sessionStorage.getObject('teams');
				if (teams) {
					teams.push(resp.event_team);
					sessionStorage.putObject('teams', teams);
				} else { 
					sessionStorage.putObject('teams', resp.event_team);
				}
				// Todo: Update uncategorized to reflect changes.
			}).catch(function() {
				$scope.errorMessage = 'Error creating new team.';
				$log.log($scope.errorMessage);
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
				$scope.errorMessage = 'Error editing team.';
				$log.log($scope.errorMessage);
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
			var connection = TeamRESTService(authHeader);
			connection.team.delete({id: $cookies.getObject('selectedTeam').id}).$promise.then(function(resp) {
				var teams = sessionStorage.getObject('teams');
				for (var i = 0; i < teams.length; i++) {
					if (teams[i].id == $cookies.getObject('selectedTeam').id) {
						teams.splice(i, 1);
						break;
					}
				}
				sessionStorage.putObject('teams', teams);
				$scope.closeTeamModal();
				console.log('Successfully deleted team.');
				// Todo: update categories' team lists to reflect changes.
			}).catch(function() {
				$scope.errorMessage = 'Error deleting team.';
				$log.log($scope.errorMessage);
			});
		}

		teamManagement.transferTeamToCategory = function(categoryId, teamId, isDragNDrop) {
			// If isDrapNDrop is false, that means we don't have to
			// worry about closing a modal.
			var connection = TeamRESTService(authHeader);
			var req = {category_id: categoryId};
			connection.team_categories.add_team({team_id: teamId}, req).$promise.then(function(resp) {
				// Update the category view
				categoryManagementService.getCategories();
				if (!isDragNDrop) {
					$scope.closeTeamModal();
				}
				$log.log("Added team# " + teamId + " to category " + resp.team_category.category.label + ".");
			}).catch(function() {
				$scope.error = 'Error transferring team to category.'
			});
		}

		teamManagement.removeTeamFromCategory = function(teamId, categoryId) {
			var connection = TeamRESTService(authHeader);
			connection.team_categories_remove.remove_team({team_id: teamId, category_id: categoryId}).$promise.then(function(resp) {
				// TODO: update category in cookies
				var category = $cookies.getObject('selectedCategory');
				for (var i = 0; i < category.teams.length; i++) {
					if (category.teams[i].id === parseInt(teamId)) {
						category.teams.splice(i, 1);
						break;
					}
				}
				teamManagement.updateSelectedCategory(category);
			});
		}

		teamManagement.updateSelectedCategory = function(category) {
			$cookies.putObject('selectedCategory', category);
			$cookies.put('teamView', 'selectedCategory');
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
			var retVal = null;
			var teams = sessionStorage.getObject('teams');
			angular.forEach(teams, function(team) {
				if (team.id === teamId) {
					retVal = team;
				}
			});
			return retVal;
		}

		teamManagement.changeView = function(view) {
			$cookies.put('teamView', view);
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
				team_id: '@id'
			}, {
				get: {
					method: 'GET',
					headers: authHeader
				},
				add_team: {
					method: 'POST',
					headers: authHeader
				},
			}),
			team_categories_remove: $resource('http://api.stevedolan.me/teams/:team_id/categories/:category_id', {
				team_id: '@team_id', category_id: '@category_id'
			}, {
				remove_team: {
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
})

.directive('cngColorPicker', function() {

	var link = function(scope, elem, attrs) {
		elem.colorPicker({colors: ["FF0000", "FFFF00", "00FF00", "00FFFF", "FF00FF", "FF6347", "C0C0C0", "A0522D", 
			"FA8072", "FFA500", "FFE4C4", "FFFFFF", "F0E68C", "B00000", "A0522D", "DDA0DD", "EEDD82", "8470FF"]});

		scope.$watch('color', function(value) {
			elem.val(value);
			elem.change();
		});
	}

	return {
		restrict: 'A',
		require: '^ngModel',
		scope: {
			color: '@color'
		},
		link: link
	};

});
