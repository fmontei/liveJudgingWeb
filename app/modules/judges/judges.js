'use strict';

angular.module('liveJudgingAdmin.judges', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/judges', {
    templateUrl: 'modules/judges/judges.html',
    controller: 'JudgesCtrl'
  });
}])

.controller('JudgesCtrl', ['$scope', 'sessionStorage', '$log', 'filterFilter', 'JudgeManagementService', 'JudgeWatchService',
	function($scope, sessionStorage, $log, filterFilter, JudgeManagementService, JudgeWatchService) {
	
	var judgeWatchService = JudgeWatchService($scope, sessionStorage);
	judgeWatchService.init();

	var judgeManagementService = JudgeManagementService($scope, sessionStorage);
	judgeManagementService.getJudges();

	$scope.tabs = [
		{ title: 'Teams Judging', active: true, view: 'teams' },
		{ title: 'Criteria Rules', view: 'criteria' }
	];

	$scope.judgeModalView = 'teams';
	$scope.selectedTeams = [];
	$scope.modalSortType = '+name';
	
	$scope.changeView = function(view) {
		judgeManagementService.changeView(view);
	}

	$scope.getTeam = function(attr, value) {
		for (var i = 0; i < $scope.teams.length; i++)
			if ($scope.teams[i][attr] === value)
				return $scope.teams[i];
	}
	
	$scope.changeModalTab = function(view) {
		$scope.judgeModalView = view;
	}
	
	$scope.changeModalSortType = function(type) {
		if (type === 'name' || type === 'id')
			$scope.modalSortType = '+' + type;
	}

	$scope.closeJudgeModal = function() {
		$scope.judgeFirstName = '';
		$scope.judgeLastName = '';
		$scope.judgeEmail = '';
		$scope.judgeAffliation = '';
		$scope.judgeErrorMessage = undefined;
		$('#judge-modal').modal('hide');
	}

	$scope.closeAssignByCatModal = function() {
		$('#judge-cat-assignment-modal').modal('hide');
	}

	$scope.openAssignByCatModal = function() {
		$('#judge-cat-assignment-modal').modal();
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
		if (false === $scope.areAllTeamsSelected()) {
			angular.forEach($scope.filteredTeams, function(team) {
				$scope.selectFilteredTeam(team);
			});
		} else {
			angular.forEach($scope.filteredTeams, function(team) {
				$scope.deselectFilteredTeam(team);
			});
		}
	};
	
	$scope.selectFilteredTeam = function(team) {
		if ($scope.selectedTeams.indexOf(team) === -1) {
			$scope.selectedTeams.push(team);
		}
	}
	
	$scope.deselectFilteredTeam = function(team) {
		var length = $scope.selectedTeams.length;
		$scope.selectedTeams.splice($scope.selectedTeams.indexOf(team), 1); 
	}
	
	$scope.isTeamSelected = function(team) {
		return $scope.selectedTeams.indexOf(team) !== -1;
	}
	
	$scope.areAllTeamsSelected = function() {
		for (var i = 0; i < $scope.filteredTeams.length; i++) {
			var team = $scope.filteredTeams[i];
			if ($scope.selectedTeams.indexOf(team) === -1) {
				return false;
			}
		}
		return true;
	}

	$scope.addJudge = function() {
		var judgeFormData = {
			email: $scope.judgeEmail.trim(),
			first_name: $scope.judgeFirstName.trim(),
			last_name: $scope.judgeLastName.trim(),
			teams: $scope.selectedTeams
		};
		judgeManagementService.addJudge(judgeFormData).then(function() {
			// Refresh judge objects
			judgeManagementService.getJudges();
			$scope.closeJudgeModal();
		}).catch(function(error) {
			$scope.judgeErrorMessage = error;
		});
	}

	$scope.assignTeamsToJudge = function() {
		var teamsToAdd = [];
		for (var i = 0; i < $scope.teamsInDropCat.length; i++) {
			if ($scope.teamsInDropCat[i].checked) {
				teamsToAdd.push($scope.teamsInDropCat[i]);
			}
		}
		if (teamsToAdd.length > 0) {
			judgeManagementService.assignTeamsToJudge(teamsToAdd);
		}
		$scope.closeAssignByCatModal();
	}
}])

.filter('printAllCategories', function() {
	return function(team) {
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
																		'sessionStorage', 'TeamManagementService', 'UserRESTService',
	function($q, CategoryManagementService, CurrentUserService, JudgeRESTService, 
					 sessionStorage, TeamManagementService, UserRESTService) {
	return function($scope, sessionStorage) {

		var judgeManagement = {};

		var categoryManagementService = CategoryManagementService($scope, sessionStorage);
		var teamManagementService = TeamManagementService($scope, sessionStorage);

		judgeManagement.getJudges = function() {
			var judgeRESTService = JudgeRESTService(CurrentUserService.getAuthHeader());
			var eventId = sessionStorage.getObject('selected_event').id;
			judgeRESTService.judges.get({event_id: eventId}).$promise.then(function(resp) {
					sessionStorage.putObject('judges', resp.event_judges);
				}).then(function() {
					var judges = sessionStorage.getObject('judges');
					judgeManagement.getJudgeTeams(judges);
				});
			}
			
		judgeManagement.getJudgeTeams = function(judges) {
			angular.forEach(judges, function(judge) {
				getJudgeTeam(judge);
			});
			
			function getJudgeTeam(judge) {
				var judgeRESTService = JudgeRESTService(CurrentUserService.getAuthHeader());
				var judgeId = judge.judge.id;
				judgeRESTService.judgeTeams.get({judge_id: judgeId}).$promise.then(function(resp) {
					//judge.teams = resp;
					console.log(JSON.stringify(resp));
				});
			}
		}

		judgeManagement.addJudge = function(judgeFormData) {
			var defer = $q.defer();

			// Todo: Check if a user with the email already exists (once that's in the API).
			var judgeRESTService = JudgeRESTService(CurrentUserService.getAuthHeader());
			var judgeReq = judgeFormData;
			var judgeId = null;
			var randomPass = judgeManagement.generatePassword();
			judgeReq.password = randomPass;
			judgeReq.password_confirmation = randomPass;

			// Register judge as a user & adds them to the event.
			UserRESTService.register(judgeReq).$promise.then(function(resp) {
				var eventId = sessionStorage.getObject('selected_event').id;
				judgeId = resp.user.id;
				judgeRESTService.judges.addToEvent({event_id: eventId}, {judge_id: judgeId}).$promise.then(function(resp) {
					console.log('Judge successfully registered & added to event');
				}).catch(function() {
					console.log('Error adding judge to event');
				});
			}).then(function() {
				/* Assign judge to every team selected in modal */
				angular.forEach(judgeFormData.teams, function(team) {
					var req = {team_id: team.id};
					judgeRESTService.judgeTeams.assign({judge_id: judgeId}, req).$promise.then(function(resp) {
						console.log('Judge assigned to team.');
					}).catch(function(error) {
						console.log(JSON.stringify(error));
					});
				});
			}).catch(function(error) {
				console.log('Error registering judge user');
				if (error.data.email !== undefined) {
					var error = 'Email already exists. Please use another.';
					defer.reject(error);
				}
			}).finally(function() {
				defer.resolve('Finished addJudge()');
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

		judgeManagement.assignTeamsToJudge = function(teams) {
			var judgeId = sessionStorage.getObject('draggedJudge').id;
			angular.forEach(teams, function(team) {
				judgeManagement.assignTeamToJudge(team.id, judgeId);
			});
		}

		judgeManagement.assignTeamToJudge = function(teamId) {
			var judgeRESTService = JudgeRESTService(CurrentUserService.getAuthHeader());
			var teamName = teamManagementService.getTeamByID(teamId).name;
			var judge = sessionStorage.getObject('draggedJudge').judge;

			judgeRESTService.judgeTeams.assign({judge_id: judge.id}, {team_id: teamId}).$promise.then(function(resp) {
				console.log(resp);
				console.log('Successfully assigned team ' + teamName + ' to judge ' + judge.first_name + ' ' + judge.last_name + '.');
			}).catch(function() {
				console.log('Error assigning team ' + teamName + ' to judge ' + judge.first_name + ' ' + judge.last_name + '.');
			});
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

		return judgeManagement;
	}
}])

.factory('JudgeWatchService', ['sessionStorage', function (sessionStorage) {
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
				return $scope.typeAheadFilter;
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
					headers: authHeader
				}
			})
		}
	}
});

