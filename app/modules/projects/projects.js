'use strict';

angular.module('domInitApp', [])

.service('domInitService', function() {
	var service = this;
	
	service.instantiateAmPmSwitch = function(identifier) {
		$(identifier).bootstrapSwitch({
			onText: 'am',
			offText: 'pm'
		});
	}
	
	service.getTimeOptions = function() {
		service.times = [];
		for (var i = 1; i <= 12; i++) {
			for (var j = 0; j <= 45; j += 15) {
				if (j == 0) service.times.push(i + ":" + j + j);
				else service.times.push(i + ":" + j);
			}
		}
		return service.times;
	}
	
	service.initializeColorPicker = function(identifier) {
		$(identifier).colorpicker();
	}

	service.initializeSortable = function(identifier) {
		$(identifier).sortable({
			axis: 'y',
			containment: 'parent',
			cursor: 'grab',
			cursorAt: { left: 5 },
			handle: 'button',
			cancel: ''
		});
		$(identifier).droppable({
			drop: function(event, ui) {
				var droppedProject = ui.draggable;
				if (droppedProject.hasClass('ui-sortable-helper')) return;
				droppedProject.animate({
		        opacity: 0.25
		    }, 500);
		    droppedProject.fadeOut();
			}
		});
	}
	
	return service;
})

angular.module('liveJudgingAdmin.projects', ['ngRoute', 'domInitApp'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/projects', {
    templateUrl: 'modules/projects/projects.html',
    controller: 'ProjectsCtrl'
  });
}])

.controller('ProjectsCtrl', ['$scope', 'domInitService',
	function($scope, domInitService) {
		
		$scope.createAmPmSwitch = function(identifier) {
			domInitService.instantiateAmPmSwitch(identifier);
		}
		
		$scope.createColorPicker = function(identifier) {
			domInitService.initializeColorPicker(identifier);
		}
		
		$scope.createSortableCategories = function(identifier) {
			domInitService.initializeSortable(identifier);
		} 

		$scope.changeView = function(view) {
			$scope.currentView = view;
		}

		$scope.createAmPmSwitch('#am-pm-switch');
		$scope.createColorPicker("#color-picker");
		$scope.createSortableCategories("#sortable-category-list");
		$scope.timeOptions = domInitService.getTimeOptions();
		$scope.currentView = "default";

		$scope.projectList = ["Lemur", "Turtle", "Fish", "Cheetah", "Bear"];
}])

.directive('draggable', function() { // Directive needed to work inside ng-when block
	return {
		link: function(scope, elem, attrs) {
			$(".draggable-project").draggable({
				cursor: "grab",
				start: function(event, ui) { 
				  $(this).draggable("option", "cursorAt", {
				    left: Math.floor(ui.helper.width() / 2),
				    top: Math.floor(ui.helper.height() / 2)
				  }); 
				}
			});
		}
	}
});