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
			'color': "#bbbbbb",
			'projects': [],
			'judges': []
		}, 
		{
			'name': "Cat A.",
			'desc': "Sample description for Cat A.",
			'time': "1915-07-20T12:14:00.000Z",
			'color': "#5bc0de",
			'projects': [], 
		  'judges': ["Batman"]
		},
		{
			'name': "Cat B.",
			'desc': "Sample description for Cat B.",
			'time': "1915-08-20T13:15:00.000Z",
			'color': "#d9534f",
			'projects': [], 
			'judges': ["Superman", "Hulk"]
		}];
		$cookies.categoryList[0].projects = [{name: 'Lemur', number: '11', logo: 'none', desc: 'Desc'}, {name: 'Tiger', number: '12', logo: 'none',desc: 'Desc'}];
		$cookies.categoryList[1].projects = [{name: 'Shark', number: '76', logo: 'none', desc: 'Desc'}, {name: 'Kangaroo', number: '54', logo: 'none',desc: 'Desc'}];
		$cookies.categoryList[2].projects = [{name: 'Rabbit', number: '45', logo: 'none', desc: 'Desc'}];
		$cookies.currentView = "default";
		$cookies.categoryTime = Date();
		$cookies.uncategorized = $cookies.categoryList[0];
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
			return $cookies.uncategorized;
		}, function(newValue) {
			$scope.uncategorized = newValue;
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
			var projectInfo = $scope.getProjectFromUncategorized(projectName);
			var projectIndex = projectInfo.index, project = projectInfo.project;
			category.projects.push(project);
			$cookies.uncategorized.projects.splice(projectInfo.index, projectInfo.index + 1);
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
				if ($cookies.categoryList[i].name == value) {
					return $cookies.categoryList[i];
				}
			}
		}

		$scope.getProjectFromUncategorized = function(value) {
			for (var i = 0; i < $cookies.uncategorized.projects.length; i++) {
				if ($cookies.uncategorized.projects[i].name == value) { 
					return {
						index: i,
						project: $cookies.uncategorized.projects[i]
					}
				}
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
		 * Project Management Functionality
		 */ 
		 $scope.createNewProject = function() {
		 	ProjectManagementService.createNewProject($scope, $cookies);
		 }

		/*
		 * Change Category View
		 */

		$scope.changeView = function(view) {
			$cookies.currentView = view;
		}

		$scope.viewCategoryDetails = function(event) {
			if (event === 'uncategorized') {
				$cookies.selectedCategory = $cookies.uncategorized;
			} else {
				var category = $(event.currentTarget);
				var categoryName = category.parent().attr('category-name');
				$cookies.selectedCategory = $scope.getCategoryByName(categoryName);
			}
			$scope.changeView('selectedCategory');
		}

		$scope.changeCategoryModalView = function(view, event, category) {
			$scope.categoryModalView = view;
			$scope.openCategoryModal();
			if (view === 'edit') {
				$scope.populateCategoryModal(category);
				event.stopPropagation();
			}
		}

		$scope.populateCategoryModal = function(category) {
			$cookies.selectedCategory = category;
			$scope.categoryName = category.name;
			$scope.categoryDesc = category.desc;
			$scope.categoryTime = category.time;
			$scope.categoryColor = category.color; 
		}

		$scope.openCategoryModal = function() {
			$('#category-modal').modal('show');
		}

		$scope.closeCategoryModal = function() {
			$scope.categoryName = '';
			$scope.categoryDesc = '';
			$scope.categoryTime = '';
			$scope.categoryColor = 'FFFFFF'; 
			$('#category-modal').modal('hide');
		}

		/*
		 * Change Project View
		 */

		$scope.changeProjectModalView = function(view) {
			$scope.projectModalView = view;
			$scope.openProjectModal();
		}

		$scope.openProjectModal = function() {
			$('#project-modal').modal('show');
		}

		$scope.closeProjectModal = function() {
			$scope.projectName = '';
			$scope.projectNumber = '';
			$scope.projectLogo = '';
			$scope.projectDesc = '';
			$('#project-modal').modal('hide');
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

.factory('ProjectManagementService', ['$log', function($log) {
	var projectManagement = {};

	projectManagement.createNewProject = function($scope, $cookies) {	
		var newProject = {
			name: $scope.projectName,
			number: $scope.projectNumber,
			logo: $scope.projectLogo,
			desc: $scope.projectDesc
		}
		if ($scope.currentView === 'default') {
			$cookies.uncategorized.projects.push(newProject);
			$log.log("New project created: " + JSON.stringify(newProject));
			$log.log("Project list updated: " + $cookies.uncategorized.projects.length);
		} else if ($scope.currentView === 'selectedCategory') {
			$cookies.selectedCategory.projects.push(newProject);
			$log.log("New project created: " + JSON.stringify(newProject));
			$log.log("Project added to " + $cookies.selectedCategory.name + ": " + $cookies.selectedCategory.projects.length);
			$log.log("Project list updated: " + $cookies.uncategorized.projects.length);
		}
		$scope.closeProjectModal();
	}

	projectManagement.editProject = function($scope, $cookies) {

	}

	projectManagement.getProjectNumberOptions = function() { // TODO: remove numbers that are unavailable
		var numbers = [];
		for (var i = 10; i < 100; i++) numbers.push(i);
		return numbers;
	}

	return projectManagement;
}])

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

					var projectName = droppedProject.attr('projectName').trim();
					scope.callback({categoryName: scope.categoryName.trim(), projectName: projectName});
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
			color: '@color'
		},
		link: link
	};

});