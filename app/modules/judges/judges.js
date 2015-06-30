'use strict';

angular.module('liveJudgingAdmin.judges', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/judges', {
    templateUrl: 'modules/judges/judges.html',
    controller: 'JudgesCtrl'
  });
}])

.controller('JudgesCtrl', ['$rootScope', '$scope', '$log', 'filterFilter', function($rootScope, $scope, $log, filterFilter) {
	
	$scope.tabs = [
    { title:'Teams Judging', content:'Dynamic content 1' , active: true, view: 'teams' },
    { title:'Criteria Rules', content:'Dynamic content 2', view: 'criteria' }
  ];
  $scope.teams = $rootScope.teams; 
	$scope.getTeam = function(attr, value) {
		for (var i = 0; i < $scope.teams.length; i++)
			if ($scope.teams[i][attr] === value)
				return $scope.teams[i];
	}
	$scope.color = 'green';
	$scope.judgeModalView = 'teams';
	$scope.filteredTeams = $scope.teams;
	$scope.selectedTeams = [];
	$scope.modalSortType = '+name';
	
	$scope.selectedTeams.toString = function() {
		var string = '';
		for (var i = 0; i < $scope.selectedTeams.length; i++) {
			if (i < $scope.selectedTeams.length - 1)
				string += $scope.selectedTeams[i] + '; ';
			else
				string += $scope.selectedTeams[i];
		}
		return string;
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

.filter('getAllCategories', function() {
	return function(team) {
		var categoryLabels = '';
		for (var i = 0; i < team.categories.length; i++) {
			if (team.categories[i].label !== 'Uncategorized')
				categoryLabels += team.categories[i].label + ', ';
		}
		return categoryLabels.slice(0, -2);
	}
});