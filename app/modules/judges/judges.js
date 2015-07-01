'use strict';

angular.module('liveJudgingAdmin.judges', ['ngRoute', 'ngCookies'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/judges', {
    templateUrl: 'modules/judges/judges.html',
    controller: 'JudgesCtrl'
  });
}])

.controller('JudgesCtrl', ['$scope', '$cookies', '$log', 'filterFilter', 'sessionStorage',
	function($scope, $cookies, $log, filterFilter, sessionStorage) {
	
	$scope.tabs = [
    { title:'Teams Judging', content:'Dynamic content 1' , active: true, view: 'teams' },
    { title:'Criteria Rules', content:'Dynamic content 2', view: 'criteria' }
  ];
	$scope.judgeModalView = 'teams';
	$scope.selectedTeams = [];
	$scope.modalSortType = '+name';

  $scope.$watch(function() {
    return sessionStorage.getObject('teams');
  }, function(newValue) {
  	$scope.teams = newValue;
  	$scope.filteredTeams = newValue;
  }, true);

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
	
	$scope.$watch('selectedTeam', function(newValue) {	
		$scope.filterTeams(newValue);
	});
	
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

.factory('JudgeRESTService'), ['$resource', function($resource) {
	return function(authHeader) {
		return {
			judges: $resource('http://api.stevedolan.me/events/:event_id/judges', {
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
}];

