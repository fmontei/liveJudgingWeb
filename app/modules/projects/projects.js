'use strict';

angular.module('liveJudgingAdmin.projects', ['ngRoute', 'ngCookies'])

.constant('DRAGGABLE', 'draggable-project')

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/projects', {
    templateUrl: 'modules/projects/projects.html',
    controller: 'ProjectsCtrl'
  });
}])

.controller('ProjectsCtrl', ['$scope', '$cookies', 'DRAGGABLE', function($scope, $cookies, DRAGGABLE) {

		$scope.getTimeOptions = function() {
			var times = [];
			for (var i = 1; i <= 12; i++) {
				for (var j = 0; j <= 45; j += 15) {
					if (j == 0) times.push(i + ":" + j + j);
					else	times.push(i + ":" + j);
				}
			}
			return times;
		}
		
		$scope.createAmPmSwitch = function(identifier) {
			$(identifier).bootstrapSwitch({
				onText: 'am',
				offText: 'pm'
			});
		}
		
		$scope.createColorPicker = function(identifier) {
			$(identifier).colorpicker();
		}
		
		$scope.createSortableCategories = function(identifier) {
			$(identifier).sortable({
				axis: 'y',
				containment: 'parent',
				cursor: 'grab',
				cursorAt: { left: 5 },
				handle: 'button',
				cancel: ''
			});
		} 

		$scope.changeView = function(view) {
			$scope.currentView = view;
		}
		
		$scope.createAmPmSwitch('#am-pm-switch');
		$scope.createColorPicker("#color-picker");
		$scope.createSortableCategories("#sortable-category-list");
		$scope.timeOptions = $scope.getTimeOptions();
		$scope.currentView = "default";

		$cookies.categoryList = [{
			name: "Uncategorized",
			color: "grey",
			projects: ["Tiger"],
			judges: []
		}, 
		{
			name: "Cat A.",
			color: "red",
			projects: ["Lemur"], 
			judges: ["Batman"]
		}, 
		{
			name: "Cat B.",
			color: "green",
			projects: ["Lion", "Monkey"], 
			judges: ["Superman", "Hulk"]
		}];
		$scope.categoryList = $cookies.categoryList;
		$scope.projectList = ["Lemur", "Turtle", "Fish", "Cheetah", "Bear"];

		$scope.getCategoryByName = function(value) {
			for (var i = 0; i < $cookies.categoryList.length; i++) {
				if ($cookies.categoryList[i].name == value) return $cookies.categoryList[i];
			}
		}
}])

.directive('draggable', ['DRAGGABLE', function(DRAGGABLE) { // Directive needed to work inside ng-when block
	return {
		link: function(scope, elem, attrs) {
			$('.' + DRAGGABLE).draggable({
				cursor: 'grab',
				start: function(event, ui) { 
				  $(this).draggable('option', 'cursorAt', {
				    left: Math.floor(ui.helper.width() / 2),
				    top: Math.floor(ui.helper.height() / 2)
				  }); 
				}
			});
		}
	}
}])

.directive('droppable', ['DRAGGABLE', function(DRAGGABLE) {
	var link = function(scope, elem, attrs) {
		$('.sortable-category').droppable({
			drop: function(event, ui) {
				var droppedProject = ui.draggable;
				if (droppedProject.hasClass(DRAGGABLE)) {
		    	droppedProject.fadeOut(400);
		    	var categoryContainer = $(event.target).find('button');
		    	var originalColor = categoryContainer.css('backgroundColor');
					categoryContainer.animate({
	          backgroundColor: "#fff"
					}, 400);
					categoryContainer.animate({
	          backgroundColor: originalColor
					}, 400);
		    	var categoryName = $(event.target).find('.sortable-category-header').text().trim();
		    	var projectName = droppedProject.find('.draggable-project-name').text().trim();
		    	droppedProjectCallback(scope, categoryName, projectName);
		  	}
			}
		});
	}

	var droppedProjectCallback = function(scope, categoryName, projectName) {
		var category = scope.getCategoryByName(categoryName);
		category.projects.push(projectName);
		scope.$apply();
	}

	return {
		link: link	
	}
}]);