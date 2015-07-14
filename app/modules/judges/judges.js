'use strict';

angular.module('liveJudgingAdmin.judges', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/judges', {
    templateUrl: 'modules/judges/judges.html',
    controller: 'JudgesCtrl'
  });
}])

.controller('JudgesCtrl', ['$q', '$scope', 'sessionStorage', '$log', 'filterFilter', 'JudgeManagementService', 'JudgeWatchService',
	function($q, $scope, sessionStorage, $log, filterFilter, JudgeManagementService, JudgeWatchService) {

	var judgeWatchService = JudgeWatchService($scope, sessionStorage);
	judgeWatchService.init();

	var judgeManagementService = JudgeManagementService($scope, sessionStorage);
	judgeManagementService.getJudges();

	/* Judge Modal Variables */
	$scope.judgeModalView = 'create';
	$scope.judgeModalTab = 'judgeInfo';
	$scope.modalSortType = '+name';
	$scope.teamFilterText = '';

	$scope.judgeId;
	$scope.judgeInfoForm = {};

	$scope.teamsToAdd = []; // Teams added in the form (not yet saved)
	$scope.teamsToRemove = []; // *Ids* of teams removed in the form (not yet saved)
	$scope.assignedTeams = []; // Teams actually assigned
	$scope.selectedTeams = []; // Teams that are checked in the form
	/* end */

	$scope.tabs = [
		{ title: 'Judge Information', active: true, view: 'judgeInfo' },
		{ title: 'Assigned Teams', view: 'teams' },
		{ title: 'Criteria Rules', view: 'criteria' }
	];

	$scope.changeView = function(view) {
		judgeManagementService.changeView(view);
	}

	$scope.getTeam = function(attr, value) {
		for (var i = 0; i < $scope.teams.length; i++)
			if ($scope.teams[i][attr] === value)
				return $scope.teams[i];
	}

	$scope.changeModalTab = function(tab) {
		$scope.judgeModalTab = tab;
	}

	$scope.changeModalSortType = function(type) {
		if (type === 'name' || type === 'id')
			$scope.modalSortType = '+' + type;
	}

	$scope.changeJudgeModalView = function(action, judge, teams) {
		if (action === 'create') {
			$scope.judgeModalView = 'create';
			$scope.tabs[0].active = true;
		} else if (action === 'edit') {
			$scope.judgeModalView = 'edit';
			$scope.judgeId = judge.id;
			$scope.judgeInfoForm.judgeFirstName = judge.first_name;
			$scope.judgeInfoForm.judgeLastName = judge.last_name;
			$scope.judgeInfoForm.judgeEmail = judge.email;
			$scope.judgeInfoForm.judgeAffliation = judge.affiliation;
			// Hardcoding these for the time being
			$scope.assignedTeams = [{id: 1, name: 'team1'}, {id: 2, name: 'team2'}, {id: 3, name: 'team3'}];

			sessionStorage.putObject('assignedTeams', teams);
		}
	}

	$scope.closeJudgeModal = function() {
		$scope.judgeInfoForm = {};
		$('#judge-modal').modal('hide');
	}

	$scope.closeAssignByCatModal = function() {
		$('#judge-cat-assignment-modal').modal('hide');
		sessionStorage.remove('teamsInDropCat');
	}

	$scope.openAssignByCatModal = function() {
		setUpTeams().then(function() {
			$('#judge-cat-assignment-modal').modal();
		});

		function setUpTeams() {
			var defer = $q.defer();

			var teams = sessionStorage.getObject('teamsInDropCat');
			for (var i = 0; i < teams.length; i++) {
				teams[i].checked = true;
			}
			sessionStorage.putObject('teamsInDropCat', teams);
			defer.resolve();

			return defer.promise;
		}
	}

	$scope.filterTeams = function(filterText) {
		if (undefined === filterText)
			return;
		var teams = filterFilter($scope.teams, filterText);
		$scope.filteredTeams = [];
		angular.forEach(teams, function(team) {
			$scope.filteredTeams.push(team);
		});
	}

	$scope.selectSingleFilteredTeam = function(team) {
		if (false === $scope.isTeamSelected(team)) {
			$scope.selectFilteredTeam(team);
		} else {
			$scope.deselectFilteredTeam(team);
		}
	}

	$scope.selectAllFilteredTeams = function() {
		angular.forEach($scope.filteredTeams, function(team) {
			$scope.selectFilteredTeam(team);
		});
	};

	$scope.deselectAllFilteredTeams = function() {
		angular.forEach($scope.filteredTeams, function(team) {
			$scope.deselectFilteredTeam(team);
		});
	}

	$scope.selectFilteredTeam = function(team) {
		team.selected = true;
	}

	$scope.deselectFilteredTeam = function(team) {
		team.selected = false;
	}

	$scope.isTeamSelected = function(team) {
		return $scope.selectedTeams.indexOf(team) !== -1;
	}

	$scope.areAllTeamsSelected = function() {
		for (var i = 0; i < $scope.filteredTeams.length; i++) {
			var team = $scope.filteredTeams[i];
			if (!team.selected) {
				return false;
			}
		}
		return true;
	}

	$scope.addJudge = function() {
		var judgeFormData = {
			email: $scope.judgeInfoForm.judgeEmail.trim(),
			first_name: $scope.judgeInfoForm.judgeFirstName.trim(),
			last_name: $scope.judgeInfoForm.judgeLastName.trim()
		};
		judgeManagementService.addJudge(judgeFormData).then(function() {
			// Refresh judge objects
			judgeManagementService.getJudges();
			$scope.closeJudgeModal();
		}).catch(function(error) {
			$scope.judgeErrorMessage = error;
		});
	}

	$scope.editJudge = function() {
		// Todo: needs fix
		return;
		var judgeFormData = {
			email: $scope.judgeEmail.trim(),
			first_name: $scope.judgeFirstName.trim(),
			last_name: $scope.judgeLastName.trim()
		};
		var assignedTeams = sessionStorage.getObject('assignedTeams');
		judgeManagementService.editJudge($scope.judgeId, judgeFormData, $scope.teamsToAdd, $scope.teamsToRemove, assignedTeams).then(function() {
			// Refresh judge objects
			judgeManagementService.getJudges();
		}).catch(function(error) {
			$scope.judgeErrorMessage = error;
		});

		$scope.closeJudgeModal();
	}

	$scope.assignTeamsToJudge = function() {
		var teamsToAdd = [];
		for (var i = 0; i < $scope.teamsInDropCat.length; i++) {
			if ($scope.teamsInDropCat[i].checked) {
				teamsToAdd.push($scope.teamsInDropCat[i]);
			}
		}
		if (teamsToAdd.length > 0) {
			judgeManagementService.assignTeamsToJudge(teamsToAdd, true);
		}
		$scope.closeAssignByCatModal();
	}

	$scope.addSelectedTeamsToJudgeModal = function(teams) {
		var isDuplicateTeam;
		for (var i = 0; i < teams.length; i++) {
			isDuplicateTeam = false;
			if (teams[i].selected) {
				for (var j = 0; j < $scope.teamsToAdd.length; j++) {
					if ($scope.teamsToAdd[j].id == teams[i].id) {
						isDuplicateTeam = true;
					}
				}
				if (!isDuplicateTeam) {
					$scope.teamsToAdd.push(teams[i]);
				}
			}
		}
	}

	// Used for modal display.
	$scope.removeTeamFromJudge = function(teamId) {
		$scope.teamsToRemove.push(teamId);
		for (var i = 0; i < $scope.assignedTeams.length; i++) {
			if ($scope.assignedTeams[i].id == teamId) {
				$scope.assignedTeams[i].toRemove = true;
			}
		}
	}

	// Also used for modal display.
	$scope.undoRemoveTeamFromJudge = function(teamId) {
		var index = $scope.teamsToRemove.indexOf(teamId);
		if (index > -1) {
			$scope.teamsToRemove.splice(index, 1);
		}
		for (var i = 0; i < $scope.assignedTeams.length; i++) {
			if ($scope.assignedTeams[i].id == teamId) {
				$scope.assignedTeams[i].toRemove = false;
			}
		}
	}

	// For modal display
	$scope.removeTeamToAdd = function(teamId) {
		for (var i = 0; i < $scope.teamsToAdd.length; i++) {
			if ($scope.teamsToAdd[i].id == teamId) {
				$scope.teamsToAdd.splice(i, 1);
				return;
			}
		}
	}

	$scope.clearTeamsToAdd = function() {
		$scope.teamsToAdd = [];
	}
}])

.filter('printAllCategories', function() {
	return function(team) {
		if (!team.categories)
			return '';
		var categoryLabels = '';
		for (var i = 0; i < team.categories.length; i++) {
			if (team.categories[i].label !== 'Uncategorized')
				categoryLabels += team.categories[i].label + ', ';
		}
		return categoryLabels.slice(0, -2);
	}
})

.filter('printAllTeams', function() {
	return function(selectedTeams) {
		var string = '';
		for (var i = 0; i < selectedTeams.length; i++) {
			if (i < selectedTeams.length - 1)
				string += selectedTeams[i].name + '; ';
			else
				string += selectedTeams[i].name;
		}
		return string.replace(',', ', ');
	}
})

.factory('JudgeManagementService', ['$q', 'CategoryManagementService', 'CurrentUserService', 'JudgeRESTService',
									'sessionStorage', 'TeamManagementService', 'UserRESTService', '$window',
	function($q, CategoryManagementService, CurrentUserService, JudgeRESTService,
				sessionStorage, TeamManagementService, UserRESTService, $window) {
	return function($scope, sessionStorage) {

		var judgeManagement = {};

		var categoryManagementService = CategoryManagementService($scope, sessionStorage);
		var teamManagementService = TeamManagementService($scope, sessionStorage);

		var judgeRESTService = JudgeRESTService(CurrentUserService.getAuthHeader());
		var eventId = sessionStorage.getObject('selected_event').id;

		judgeManagement.getJudges = function() {
			var defer = $q.defer();

			judgeRESTService.judges.get({event_id: eventId}).$promise.then(function(resp) {
				sessionStorage.putObject('judges', resp.event_judges);
				console.log('Judges successfully retrieved from server.');
			}).then(function() {
				var judges = sessionStorage.getObject('judges');
				judgeManagement.getJudgeTeams(judges).then(function() {
					defer.resolve();
				}).catch(function() {
					defer.reject();
				});
			}).catch(function() {
				defer.reject();
			});

			return defer.promise;
		}

		judgeManagement.getJudgeTeams = function(judges) {
			var defer = $q.defer();

			var judgePromises = [];

			for (var i = 0; i < judges.length; i++) {
				judgePromises.push(getJudgeTeam(judges[i]));
			}

			$q.all(judgePromises).then(function(judgesWithTeams) {
				sessionStorage.putObject('judges', judgesWithTeams);
				defer.resolve();
			}).catch(function() {
				defer.reject('Error getting judge teams.');
			});

			return defer.promise;

			function getJudgeTeam(judge) {
				var defer = $q.defer();

				var judgeId = judge.judge.id;
				judgeRESTService.judgeTeams.get({judge_id: judgeId}).$promise.then(function(resp) {
					judge.teams = resp.judge_teams;
					defer.resolve(judge);
				}).catch(function() {
					defer.reject(judge);
				});

				return defer.promise;
			}
		}

		judgeManagement.addJudge = function(judgeFormData) {
			var defer = $q.defer();

			// Todo: Check if a user with the email already exists (once that's in the API).
			var judgeReq = judgeFormData;
			var judgeId = null;
			var randomPass = judgeManagement.generatePassword();
			judgeReq.password = randomPass;
			judgeReq.password_confirmation = randomPass;

			// Register judge as a user & adds them to the event.
			UserRESTService.register(judgeReq).$promise.then(function(resp) {
				judgeId = resp.user.id;
				judgeRESTService.judges.addToEvent({event_id: eventId}, {judge_id: judgeId}).$promise.then(function(resp) {
					console.log('Judge successfully registered & added to event');
					defer.resolve('Finished addJudge()');
				}).catch(function() {
					sessionStorage.put('generalErrorMessage', 'Error adding judge to event');
					console.log('Error adding judge to event');
				});
			}).catch(function(error) {
				sessionStorage.put('generalErrorMessage', 'Error registering judge user');
				console.log('Error registering judge user');
				if (error.data.email !== undefined) {
					var error = 'Email already exists. Please use another.';
					defer.reject(error);
				}
			});

			return defer.promise;
		}

		judgeManagement.editJudge = function(judgeId, judgeFormData, teamsToAdd, teamsToRemove, assignedTeams) {
			var defer = $q.defer();

			//todo: UserRESTService PUT to update judge user.

			var haveTeamsChanged = false;
			if (oldTeams.length == newTeams.length) {
				for (var i = 0; i < oldTeams.length; i++) {
					if (oldTeams[i].id != newTeams[i].id) {
						haveTeamsChanged = true;
					}
				}
			} else {
				haveTeamsChanged = true;
			}

			if (haveTeamsChanged) {
				judgeManagement.updateJudgeTeams(judgeId, newTeams, oldTeams).then(function() {
					judgeManagement.getJudges();
					defer.resolve();
				}).catch(function() {
					console.log('Error updating judge teams.');
					defer.reject();
				});
			} else {
				defer.resolve();
			}

			return defer.promise;
		}

		judgeManagement.updateJudgeTeams = function(judgeId, newTeams, oldTeams) {
			var defer = $q.defer();

			var newIds = [];
			var oldIds = [];

			for (var i = 0; i < oldTeams.length; i++) {
				oldIds.push(oldTeams[i].id);
			}
			for (i = 0; i < newTeams.length; i++) {
				newIds.push(newTeams[i].id);
			}

			// Find teams in oldTeams, but not in newTeams (ie, the deleted teams).
			var teamsToRemove = [];
			for (i = 0; i < oldIds.length; i++) {
				if (newIds.indexOf(oldIds[i]) == -1) {
					teamsToRemove.push(oldIds[i]);
				}
			}

			// Find teams in newTeams, but not in oldTeams (ie, the added teams).
			var teamsToAdd = [];
			for (i = 0; i < newIds.length; i++) {
				if (oldIds.indexOf(newIds[i]) == -1) {
					teamsToAdd.push(newIds[i]);
				}
			}

			judgeManagement.assignTeamsToJudge(teamsToAdd, false).then(function() {
				defer.resolve();
			}).catch(function() {
				defer.reject();
			});

			return defer.promise;
		}

		judgeManagement.generatePassword = function() {
			// Most certainly should be done on the server (would require a call to make a judge user)
			var pass = "";
				var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

				for(var i = 0; i < 6; i++) {
						pass += possible.charAt(Math.floor(Math.random() * possible.length));
				}

				return pass;
		}

		judgeManagement.changeView = function(view) {
			sessionStorage.put('judgeView', view);
		}

		judgeManagement.assignTeamsToJudge = function(teams, areObjects) {
			var defer = $q.defer();

			var judgeId = sessionStorage.getObject('draggedJudge').id;
			if (areObjects) {
				angular.forEach(teams, function(team) {
					judgeManagement.assignTeamToJudge(team.id, judgeId);
				});
			} else { // Passing in team ids
				angular.forEach(teams, function(teamId) {
					judgeManagement.assignTeamToJudge(teamId, judgeId);
				});
			}

			// Todo: actually wait for all team assigns to finish.
			defer.resolve();
			return defer.promise;
		}

		judgeManagement.assignTeamToJudge = function(teamId, judgeId) {
			if (!judgeId) {
				var judgeId = sessionStorage.getObject('draggedJudge').judge.id;
			}
			judgeRESTService.judgeTeams.assign({judge_id: judgeId}, {team_id: teamId}).$promise.then(function(resp) {
				console.log(resp);
				console.log('Successfully assigned team #' + teamId + ' to judge.');
			}).catch(function() {
				sessionStorage.put('Error assigning team #' + teamId + ' to judge.');
				console.log('Error assigning team #' + teamId + ' to judge.');
			});
		}

		judgeManagement.removeTeamsFromJudge = function(teams, judgeId) {
			// SOON
		}

		judgeManagement.getJudgeByID = function(judgeId) {
			var retVal = null;
			var judges = sessionStorage.getObject('judges');
			for (var i = 0; i < judges.length; i++) {
				if (judges[i].judge.id == judgeId) {
					retVal = judges[i];
				}
			}
			return retVal;
		}

		judgeManagement.openAssignByCatModal = function(categoryId, judgeId) {
			var judge = judgeManagement.getJudgeByID(judgeId);
			sessionStorage.putObject('draggedJudge', judge);

			// Getting a list of teamIds in a category
			categoryManagementService.getTeamsInCategory(categoryId).then(function(teams) {
				sessionStorage.putObject('teamsInDropCat', teams);
				$scope.openAssignByCatModal();
			});
		}

		judgeManagement.deleteJudge = function(judgeId, judge) {
			var defer = $q.defer();
			judgeRESTService.judge.delete({id: judgeId}).$promise.then(function() {
				judgeManagement.getJudges();
				console.log('Successfully deleted judge.');
				defer.resolve(true);
			}).catch(function(error) {
				sessionStorage.put('generalErrorMessage', 'Error deleting judge.');
				console.log('Error deleting judge: ' + JSON.stringify(error));
				defer.resolve(false);
			});
			return defer.promise;
		}

		return judgeManagement;
	}
}])

.factory('JudgeWatchService', ['sessionStorage', '$timeout', function (sessionStorage, $timeout) {
	return function($scope, sessionStorage) {
		var service = {};

		service.init = function() {
			sessionStorage.put('judgeView', 'default');

			$scope.$watch(function() {
				return sessionStorage.getObject('judges');
			}, function(newValue) {
				$scope.judges = newValue;
			}, true);

			$scope.$watch(function() {
				return sessionStorage.getObject('teams');
			}, function(newValue) {
				$scope.teams = newValue;
				$scope.filteredTeams = newValue;
			}, true);

			$scope.$watch(function() {
				return sessionStorage.getObject('selectedCategory');
			}, function(newValue) {
				$scope.selectedCategory = newValue;
			}, true);

			$scope.$watch(function() {
				return $scope.filteredTeam;
			}, function(newValue) {
				$scope.filterTeams(newValue);
			}, true);

			$scope.$watch(function() {
				return sessionStorage.get('judgeView');
			}, function(newValue) {
				$scope.judgeView = newValue;
			});

			$scope.$watch(function() {
				return sessionStorage.getObject('teamsInDropCat');
			}, function(newValue) {
				$scope.teamsInDropCat = newValue;
			}, true);
		}

		return service;
	}
}])

.factory('JudgeRESTService', function($resource) {
	return function(authHeader) {
		return {
			judges: $resource('http://api.stevedolan.me/events/:event_id/judges', {
				event_id: '@id'
			}, {
				get: {
					method: 'GET',
					headers: authHeader
				},
				addToEvent: {
					method: 'POST',
					headers: authHeader
				}
			}),
			judge: $resource('http://api.stevedolan.me/judges/:id', {
				id: '@id'
			}, {
				delete: {
					method: 'DELETE',
					headers: authHeader
				}
			}),
			judgeTeams: $resource('http://api.stevedolan.me/judges/:judge_id/teams', {
				judge_id: '@id'
			}, {
				get: {
					method: 'GET',
					headers: authHeader
				},
				assign: {
					method: 'POST',
					headers: authHeader
				},
				remove: {
					method: 'DELETE',
					url: 'http://api.stevedolan.me/judges/:judge_id/teams/:id',
					params: {judge_id: '@judge_id', id: '@team_id'},
					headers: authHeader
				}
			})
		}
	}
});

