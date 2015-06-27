'use strict';

angular.module('liveJudgingAdmin.judges', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/judges', {
    templateUrl: 'modules/judges/judges.html',
    controller: 'JudgesCtrl'
  });
}])

.controller('JudgesCtrl', ['$scope', '$log', 'filterFilter', function($scope, $log, filterFilter) {
	
	$scope.tabs = [
    { title:'Teams Judging', content:'Dynamic content 1' , active: true, view: 'teams' },
    { title:'Criteria Rules', content:'Dynamic content 2', view: 'criteria' }
  ];
  $scope.teams = ['Alabama', 'Alaska', 'Arizona', 'Wyoming', 'Nebraska', 'Georgia', 'Florida', 'Apple', 'Anna', 'Another', 'Atlanta', 'Algeria', 'Albania'];
	$scope.judgeModalView = 'teams';
	$scope.filteredTeams = [];
	$scope.selectedTeams = '';
	$scope.selectedTeamCount = 0;
	
	$scope.changeModalTab = function(view) {
		$scope.modalView = view;
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
	
	$scope.addAllFilteredTeams = function() {
		var firstChar = $scope.selectedTeams.trim().slice(-1);
		if (firstChar !== ',' && firstChar !== '')
			$scope.selectedTeams += ', ';
		angular.forEach($scope.filteredTeams, function(team) {
			if (-1 === $scope.selectedTeams.indexOf(team))
				$scope.selectedTeams += (team + ', ');
		});
		$scope.checkModalTextAreaForErrors();
	};
	
	$scope.checkModalTextAreaForErrors = function() {
		$scope.judgeModalTextAreaError = undefined;
		var selectedTeams = $scope.selectedTeams.split(',');
		var teamCount = 0;
		for (var i = 0; i < selectedTeams.length; i++) {
			var team = selectedTeams[i].trim();
			if (-1 === $scope.teams.indexOf(team) && team !== '') {
				$scope.judgeModalTextAreaError = team + ' is not a valid team.';
			} else if (-1 !== $scope.teams.indexOf(team) && team !== '') {
					teamCount++;
			}
		}
		$scope.selectedTeamCount = teamCount;
	}
}]);