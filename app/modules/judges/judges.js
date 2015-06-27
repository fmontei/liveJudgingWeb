'use strict';

angular.module('liveJudgingAdmin.judges', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/judges', {
    templateUrl: 'modules/judges/judges.html',
    controller: 'JudgesCtrl'
  });
}])

.controller('JudgesCtrl', ['$scope', '$log', 'filterFilter', function($scope, $log, filterFilter) {
	$scope.$watch('thingy', function(newValue) {
			console.log(newValue);
		});
	
	$scope.tabs = [
    { title:'Projects Judging', content:'Dynamic content 1' , active: true},
    { title:'Criteria Rules', content:'Dynamic content 2'}
  ];
	
  $scope.teams = ['Alabama', 'Alaska', 'Arizona'];
	$scope.filteredTeams = [];
	$scope.selectedTeams = '';
	
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
		angular.forEach($scope.filteredTeams, function(team) {
			if (-1 === $scope.selectedTeams.indexOf(team))
			$scope.selectedTeams += (team + ', ');
		});
	}
}]);