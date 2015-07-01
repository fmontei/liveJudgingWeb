'use strict';

angular.module('liveJudgingAdmin.judges', ['ngRoute', 'ngCookies'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/judges', {
    templateUrl: 'modules/judges/judges.html',
    controller: 'JudgesCtrl'
  });
}])

.controller('JudgesCtrl', ['$scope', '$cookies', '$log', 'filterFilter', 'JudgeManagementService', 'JudgeWatchService', 'sessionStorage',
	function($scope, $cookies, $log, filterFilter, JudgeManagementService, JudgeWatchService, sessionStorage) {
	
	var judgeWatchService = JudgeWatchService($scope, $cookies);
	judgeWatchService.init();

	$scope.tabs = [
    	{ title:'Teams Judging', content:'Dynamic content 1' , active: true, view: 'teams' },
    	{ title:'Criteria Rules', content:'Dynamic content 2', view: 'criteria' }
  	];

	$scope.judgeModalView = 'teams';
	$scope.selectedTeams = [];
	$scope.modalSortType = '+name';

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
		$('#judge-modal').modal('hide');
	}
	
	$scope.filterTeams = function(filterText) {
		if (undefined === filterText) 
			return;
		var teams = filterFilter($scope.teams, filterText);
		$scope.filteredTeams = [];
		angular.forEach(teams, function(team) {
			$scope.filteredTeams.push(team);
		});
	};
	
	$scope.selectSingleFilteredTeam = function(teamName) {
		if (false === $scope.isTeamSelected(teamName)) {
			$scope.selectFilteredTeam(teamName); 
		} else {
			$scope.deselectFilteredTeam(teamName);
		}
	}
	
	$scope.selectAllFilteredTeams = function() {
		if (false === $scope.areAllTeamsSelected()) {
			angular.forEach($scope.filteredTeams, function(team) {
				$scope.selectFilteredTeam(team.name);
			});
		} else {
			angular.forEach($scope.filteredTeams, function(team) {
				$scope.deselectFilteredTeam(team.name);
			});
		}
	};
	
	$scope.selectFilteredTeam = function(teamName) {
		if ($scope.selectedTeams.indexOf(teamName) === -1) {
			$scope.selectedTeams.push(teamName);
		}
	}
	
	$scope.deselectFilteredTeam = function(teamName) {
		var length = $scope.selectedTeams.length;
		$scope.selectedTeams.splice($scope.selectedTeams.indexOf(teamName), 1); 
	}
	
	$scope.isTeamSelected = function(teamName) {
		return $scope.selectedTeams.indexOf(teamName) !== -1;
	}
	
	$scope.areAllTeamsSelected = function() {
		for (var i = 0; i < $scope.filteredTeams.length; i++) {
			var teamName = $scope.filteredTeams[i].name;
			if ($scope.selectedTeams.indexOf(teamName) === -1) {
				return false;
			}
		}
		return true;
	}

	$scope.addJudge = function() {
		var judgeFormData = {
			email: $scope.judgeEmail,
			first_name: $scope.judgeFirstName,
			last_name: $scope.judgeLastName
		};

		JudgeManagementService.addJudge(judgeFormData).then(function() {
			$scope.closeJudgeModal();
		});
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
				string += selectedTeams[i] + '; ';
			else
				string += selectedTeams[i];
		}
		return string.replace(',', ', ');
	}
})

.factory('JudgeManagementService', ['$cookies', '$q', 'CurrentUserService', 'JudgeRESTService', 'UserRESTService',
	function($cookies, $q, CurrentUserService, JudgeRESTService, UserRESTService) {

		var judgeManagement = {};

		judgeManagement.addJudge = function(judgeFormData) {
			var defer = $q.defer();

			// Todo: Check if a user with the email already exists (once that's in the API).

			var judgeReq = judgeFormData;
			var randomPass = judgeManagement.generatePassword();
			judgeReq.password = randomPass;
			judgeReq.password_confirmation = randomPass;

			// Register judge as a user & adds them to the event.
			UserRESTService.register(judgeReq).$promise.then(function(resp) {
				var judgeRESTService = JudgeRESTService(CurrentUserService.getAuthHeader());
				var eventId = $cookies.getObject('selected_event').id;
				judgeRESTService.judges.addToEvent({event_id: eventId}, {judge_id: resp.user.id}).$promise.then(function(resp) {
					// Todo: Because the resp just has judge id and event id, there will have to be another call
					// to get the judge user by id. Then, add the new judge to session storage.
				}).catch(function() {
					console.log('Error adding judge to event');
				});
			}).catch(function() {
				console.log('Error registering judge user');
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

		return judgeManagement;
	}
])

.factory('JudgeWatchService', function(sessionStorage) {
	return function($scope, $cookies) {
		var service = {};

		service.init = function() {
			$scope.$watch(function() {
    			return sessionStorage.getObject('teams');
  			}, function(newValue) {
  				$scope.teams = newValue;
  				$scope.filteredTeams = newValue;
  			}, true);

			$scope.$watch(function() {
				return $cookies.getObject('selectedTeam');
			}, function(newValue) {	
				$scope.filterTeams(newValue);
			}, true);
		}

		return service;
	}
})

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
					header: authHeader
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
					header: authHeader
				},
				remove: {
					method: 'DELETE',
					url: 'http://api.stevedolan.me/judges/:judge_id/teams/:id',
					header: authHeader
				}
			})
		}
	}
});

