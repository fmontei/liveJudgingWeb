'use strict';

angular.module('liveJudgingAdmin.projects', ['ngRoute', 'ngCookies', 'liveJudgingAdmin.login'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/projects', {
    templateUrl: 'modules/projects/projects.html',
    controller: 'ProjectsCtrl'
  });
}])

.run(['$cookies', function($cookies) {

	/* 
	 * Initial values 
	 */ 

	$cookies.categoryList = [{
			'name': "Uncategorized",
			'desc': "Sample description for Uncategorized",
			'time': "1915-06-20T11:13:00.000Z",
			'color': "#f0ad4e",
			'projects': ["Tiger"],
			'judges': []
		}, 
		{
			'name': "Cat A.",
			'desc': "Sample description for Cat A.",
			'time': "1915-07-20T12:14:00.000Z",
			'color': "#5bc0de",
			'projects': ["Lemur"], 
		  'judges': ["Batman"]
		},
		{
			'name': "Cat B.",
			'desc': "Sample description for Cat B.",
			'time': "1915-08-20T13:15:00.000Z",
			'color': "#d9534f",
			'projects': ["Lion", "Monkey"], 
			'judges': ["Superman", "Hulk"]
		}];
		$cookies.projectList = ["Lemur", "Turtle", "Fish", "Cheetah", "Bear"];
		$cookies.currentView = "default";
		$cookies.categoryTime = Date();
}])

.controller('ProjectsCtrl', ['$scope', '$cookies', 'CategoryManagementService', 'ProjectManagementService',
	function($scope, $cookies, CategoryManagementService, ProjectManagementService) {

		$scope.projectNumberOptions = ProjectManagementService.getProjectNumberOptions();

		/*
		 * Automatic synchronization between scope and cookies
		 */

		$scope.$watchCollection(function() {
			return $cookies.categoryList;
		}, function(newValue) {
			$scope.categoryList = newValue;
		});

		$scope.$watchCollection(function() {
			return $cookies.projectList;
		}, function(newValue) {
			$scope.projectList = newValue;
		});

		$scope.$watch(function() {
			return $cookies.selectedCategory;
		}, function(newValue) {
			$scope.selectedCategory = newValue;
		});

		$scope.$watch(function() {
			return $cookies.currentView;
		}, function(newValue) {
			$scope.currentView = newValue;
		});

		$scope.$watch(function() { 
			return $cookies.categoryTime;
		}, function(newValue) {
			$scope.categoryTime = newValue;
		});

		/*
		 * Category Cookie Management
		 */

		$scope.addProjectToCategoryCookie = function(categoryName, projectName) {
			var category = $scope.getCategoryByName(categoryName);
			category.projects.push(projectName);
			$scope.$apply(); // Reflect increased project length in UI
			console.log("Added " + projectName + " to " + "category " + categoryName + ": " + category.projects);
		}

		$scope.editCurrentCategoryCookie = function(value, newObject) {
			for (var i = 0; i < $cookies.categoryList.length; i++) {
				if ($cookies.categoryList[i].name === value) {
					$cookies.categoryList[i] = newObject;
					return;
				}
			}
		}

		$scope.getCategoryByName = function(value) {
			for (var i = 0; i < $cookies.categoryList.length; i++) {
				if ($cookies.categoryList[i].name == value) return $cookies.categoryList[i];
			}
		}

		/*
		 * Category Management Functionality
		 */

		$scope.createNewCategory = function() {
			CategoryManagementService.createNewCategory($scope, $cookies);
		}

		$scope.editSelectedCategory = function() {
			CategoryManagementService.editCategory($scope, $cookies);
		}

		/*
		 * Change View Functionality
		 */

		$scope.changeView = function(view) {
			$cookies.currentView = view;
		}

		$scope.viewCategoryDetails = function(event) {
			var category = $(event.currentTarget);
			var categoryName = category.parent().attr('category-name');
			$cookies.selectedCategory = $scope.getCategoryByName(categoryName);
			$scope.changeView('selectedCategory');
		}

		$scope.changeCategoryModalViewToCreate = function() {
			$scope.categoryModalView = 'create';
			$('#category-modal').modal('show');
		}

		$scope.changeCategoryModalViewToEdit = function(event, category) {
			$cookies.selectedCategory = category;

			$scope.categoryModalView = 'edit';
			$scope.categoryName = category.name;
			$scope.categoryDesc = category.desc;
			$scope.categoryTime = category.time;
			$scope.categoryColor = category.color; 

			event.stopPropagation(); // Prevent button behind it from redirecting the page
			$('#category-modal').modal('show'); // Show the modal
		}

		$scope.closeCategoryModal = function() {
			// Create 'blank slate' every time add category button is clicked
			$scope.categoryName = '';
			$scope.categoryDesc = '';
			$scope.categoryTime = '';
			$scope.categoryPeriod = '';
			$scope.categoryColor = ''; 

			$('#category-modal').modal('hide');
		}

		$scope.openCategoryModal = function() {
			$('#project-modal').modal('show');
		}

}])

.factory('CategoryManagementService', ['$log', function($log) {
	var categoryManagement = {};

	categoryManagement.createNewCategory = function($scope, $cookies) {
		var newCategory = {
			name: $scope.categoryName,
			desc: $scope.categoryDesc,
			time: $scope.categoryTime,
			color: $scope.categoryColor,
			projects: [],
			judges: []
		}
		$cookies.categoryList.push(newCategory);
		$scope.closeCategoryModal();
		$log.log("New category created: " + JSON.stringify(newCategory));
		$log.log("Category list updated: " + $cookies.categoryList.length);
	}

	categoryManagement.editCategory = function($scope, $cookies) {
		var updatedCategory = {
			name: $scope.categoryName,
			desc: $scope.categoryDesc,
			time: $scope.categoryTime,
			color: $scope.categoryColor,
			projects: $scope.selectedCategory.projects, // Projects have not changed
			judges: $scope.selectedCategory.judges // Judges have not changed
		}
		$scope.closeCategoryModal();
		$scope.editCurrentCategoryCookie($scope.selectedCategory.name, updatedCategory);
		$log.log("Category edited: " + JSON.stringify(updatedCategory));
	}

	return categoryManagement;
}])

.factory('ProjectManagementService', function() {
	var projectManagement = {};

	projectManagement.getProjectNumberOptions = function() { // TODO: remove numbers that are unavailable
		var numbers = [];
		for (var i = 10; i < 100; i++) numbers.push(i);
		return numbers;
	}

	return projectManagement;
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

.directive('cngDraggableProject', [function() { 

	return {
		restrict: 'A',
		link: function(scope, elem, attrs) {
			elem.draggable({
				cursor: 'grab',
				start: function(event, ui) { 
				  $(this).draggable('option', 'cursorAt', {
				    left: Math.floor(ui.helper.width() / 2),
				    top: Math.floor(ui.helper.height() / 2)
				  }); 
				}
			});
		}
	};

}])

.directive('cngDroppableCategory', ['$cookies', function($cookies) {

	var link = function(scope, elem, attrs) {
		elem.droppable({
			drop: function(event, ui) {
				var droppedProject = ui.draggable;
				if (droppedProject.is('[cng-draggable-project]')) {

		    	droppedProject.fadeOut(400);
		    	var categoryContainer = $(event.target).find('a');
		    	var originalColor = categoryContainer.css('backgroundColor');
					categoryContainer.animate({
	          backgroundColor: "#fff"
					}, 400);
					categoryContainer.animate({
	          backgroundColor: originalColor
					}, 400);

					var projectName = droppedProject.attr('projectName');
					scope.callback({categoryName: scope.categoryName, projectName: projectName});
		  	}
			}
		});

		var category = elem.find('.btn'), cog = elem.find('.glyphicon-cog'),
			sort = elem.find('.glyphicon-sort');

		category.mouseenter(function() {
			cog.show();
			sort.show();
		});

		category.mouseleave(function() {
			cog.hide();
			sort.hide();
		});
	}

	return {
		restrict: 'A',
		scope: {
			callback: '&',
			categoryName: '@'
		},
		link: link	
	};

}])

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
			color: '@text'
		},
		link: link
	};

});