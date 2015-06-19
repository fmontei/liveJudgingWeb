'use strict';

angular.module('liveJudgingAdmin.projects', ['ngRoute', 'ngCookies', 'liveJudgingAdmin.login'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/projects', {
    templateUrl: 'modules/projects/projects.html',
    controller: 'ProjectsCtrl'
  });
}])

.run(['$cookies', function($cookies) {
	// Populate cookies with data from server
	$cookies.categoryList = [{
			'name': "Uncategorized",
			'desc': "Sample description for Uncategorized",
			'time': "1:00am",
			'color': "#f0ad4e",
			'projects': ["Tiger"],
			'judges': []
		}, 
		{
			'name': "Cat A.",
			'desc': "Sample description for Cat A.",
			'time': "2:00pm",
			'color': "#5bc0de",
			'projects': ["Lemur"], 
		  'judges': ["Batman"]
		},
		{
			'name': "Cat B.",
			'desc': "Sample description for Cat B.",
			'time': "3:00pm",
			'color': "#d9534f",
			'projects': ["Lion", "Monkey"], 
			'judges': ["Superman", "Hulk"]
		}];
		$cookies.projectList = ["Lemur", "Turtle", "Fish", "Cheetah", "Bear"];
		$cookies.currentView = "default";
}])

.controller('ProjectsCtrl', ['$scope', '$cookies', 'CurrentUserService', function($scope, 
																																									$cookies, 
																																									CurrentUserService) {

		// Constants
		$scope.categoryModalID = '#category-modal';
		$scope.projectModalID = '#project-modal';
		
		//===========================================================//
		// Automatically synchronize scope and cookies via listeners //
		//===========================================================//
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
		
		$scope.getTimeOptions = function() {
			var times = [];
			var i = 12;
			// 12 goes first
			for (var j = 0; j <= 45; j += 15) {
				if (j == 0) times.push(i + ":" + j + j);
				else times.push(i + ":" + j);
			}
			for (var i = 1; i < 12; i++) {
				for (var j = 0; j <= 45; j += 15) {
					if (j == 0) times.push(i + ":" + j + j);
					else times.push(i + ":" + j);
				}
			}
			return times;
		}

		$scope.getProjectNumberOptions = function() { // TODO: remove numbers that are unavailable
			var numbers = [];
			for (var i = 10; i < 100; i++) numbers.push(i);
			return numbers;
		}

		$scope.timeOptions = $scope.getTimeOptions();
		$scope.projectNumberOptions = $scope.getProjectNumberOptions();

		$scope.changeView = function(view) {
			$cookies.currentView = view;
		}

		/*
		 * Create Category Functionality
		 */

		$scope.createNewCategory = function() {
			var categoryPeriod = ($scope.categoryPeriod === true) ? 'am' : 'pm';
			var newCategory = {
				name: $scope.categoryName,
				desc: $scope.categoryDesc,
				time: $scope.categoryTime + categoryPeriod,
				color: $scope.categoryColor,
				projects: [],
				judges: []
			}
			$cookies.categoryList.push(newCategory);
			$scope.closeCategoryModal();
			console.log("New category created: " + JSON.stringify(newCategory));
			console.log("Category list updated: " + $cookies.categoryList.length);
		}

		$scope.changeCategoryModalViewToCreate = function() {
			$scope.categoryModalView = 'create';
			$($scope.categoryModalID).modal('show');
		}

		/*
		 * Edit Category Functionality
		 */

		$scope.editSelectedCategory = function() {
			var categoryPeriod = ($scope.categoryPeriod === true) ? 'am' : 'pm';
			var updatedCategory = {
				name: $scope.categoryName,
				desc: $scope.categoryDesc,
				time: $scope.categoryTime + categoryPeriod,
				color: $scope.categoryColor,
				projects: $scope.selectedCategory.projects, // Projects have not changed
				judges: $scope.selectedCategory.judges // Judges have not changed
			}
			$scope.closeCategoryModal();
			$scope.editCurrentCategoryCookie($scope.selectedCategory.name, updatedCategory);
			console.log("Category edited: " + JSON.stringify(updatedCategory));
		}

		$scope.changeCategoryModalViewToEdit = function(event, category) {
			$scope.categoryModalView = 'edit';
			$cookies.selectedCategory = category;

			var time, period;
			if (category.time.search('a') !== -1) {
				period = true; // true == am
				time = category.time.split('a')[0];
			} else {
				period = false; // false == pm
				time = category.time.split('p')[0];
			}
			
			$scope.categoryName = category.name;
			$scope.categoryDesc = category.desc;
			$scope.categoryTime = time;
			$scope.categoryPeriod = period;
			$scope.categoryColor = category.color; 

			event.stopPropagation(); // Prevent button behind it from redirecting the page
			$($scope.categoryModalID).modal('show'); // Show the modal
		}

		/*
		 * Detailed Category Functionality
		 */

		$scope.seeCategoryDetails = function(event) {
			var category = $(event.currentTarget);
			var categoryName = category.parent().attr('category-name');
			$cookies.selectedCategory = $scope.getCategoryByName(categoryName);
			$scope.changeView('selectedCategory');
		}

		/*
		 * Category Helper Methods
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

		$scope.closeCategoryModal = function() {
			// Create 'blank slate' every time add category button is clicked
			$scope.categoryName = '';
			$scope.categoryDesc = '';
			$scope.categoryTime = '';
			$scope.categoryPeriod = '';
			$scope.categoryColor = ''; 

			$($scope.categoryModalID).modal('hide');
		}

		/* 
		 * Project Modal
		 */
		$scope.openCategoryModal = function() {
			$($scope.projectModalID).modal('show');
		}

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