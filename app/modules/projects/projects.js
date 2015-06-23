'use strict';

angular.module('liveJudgingAdmin.projects', ['ngRoute', 'ngCookies', 'liveJudgingAdmin.login'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/projects', {
    templateUrl: 'modules/projects/projects.html',
    controller: 'ProjectsCtrl'
  });
}])

.controller('ProjectsCtrl', ['$scope', '$cookies', 'CookieInitService', 'ScopeInitService', 'CategoryManagementService', 'TeamManagementService',
	function($scope, $cookies, CookieInitService, ScopeInitService, CategoryManagementService, TeamManagementService) {

		/*
		 * Automatic synchronization between scope and cookies
		 */

		var cookieInitService = CookieInitService($scope, $cookies);
		cookieInitService.initDefaultCookies();
		cookieInitService.initCategories();
		cookieInitService.initTeams();

		var scopeInitService = ScopeInitService($scope, $cookies);
		scopeInitService.init();

		var categoryManagementService = CategoryManagementService($scope, $cookies);
		var teamManagementService = TeamManagementService($scope, $cookies);
		$scope.projectNumberOptions = teamManagementService.getProjectNumberOptions();

		/*
		 * Category Management Functionality
		 */

		$scope.createNewCategory = function() {
			categoryManagementService.createNewCategory();
		}

		$scope.editSelectedCategory = function() {
			categoryManagementService.editCategory();
		}

		/*
		 * Project Management Functionality
		 */ 
		$scope.createNewProject = function() {
			teamManagementService.createNewTeam();
		}

		$scope.editSelectedProject = function() {
			teamManagementService.editTeam();
		}

		$scope.transferTeamToCategory = function(categoryName, projectName) {
			teamManagementService.transferTeamToCategory(categoryName, projectName);
		}

		/*
		 * Change Category View
		 */

		$scope.changeView = function(view) {
			$cookies.currentView = view;
		}

		$scope.updateSelectedCategory = function(category) {
			if (typeof category === 'object') // Category is an object
				$cookies.selectedCategory = category;
			else if (typeof category === 'string') // Category is a name
				$cookies.selectedCategory = $cookies.categories.getByName(category);
		}

		$scope.viewCategoryDetails = function(event) {
			if (event === 'uncategorized') {
				$scope.updateSelectedCategory($cookies.uncategorized);
			} else {
				var category = $(event.currentTarget);
				var categoryName = category.parent().attr('category-name');
				$scope.updateSelectedCategory(categoryName);
			}
			$scope.changeView('selectedCategory');
		}

		$scope.changeCategoryModalView = function(view, event, category) {
			$scope.categoryModalView = view;
			$scope.openCategoryModal();
			if (view === 'edit') {
				$scope.updateSelectedCategory(category);
				$scope.populateCategoryModal(category);
				event.stopPropagation();
			}
		}

		$scope.populateCategoryModal = function(category) {
			$scope.categoryID = category.id;
			$scope.categoryName = category.name;
			$scope.categoryDesc = category.desc;
			$scope.categoryTime = category.time;
			$scope.categoryColor = category.color; 
		}

		$scope.openCategoryModal = function() {
			$('#category-modal').modal('show');
		}

		$scope.closeCategoryModal = function() {
			$scope.categoryID = '';
			$scope.categoryName = '';
			$scope.categoryDesc = '';
			$scope.categoryTime = '';
			$scope.categoryColor = 'FFFFFF'; 
			$('#category-modal').modal('hide');
			$scope.updateSelectedCategory($cookies.uncategorized);
		}

		/*
		 * Change Project View
		 */

		$scope.changeProjectModalView = function(view, project) {
			$scope.projectModalView = view;
			$scope.openProjectModal();
			if (view === 'edit') {
				$scope.populateProjectModal(project);
				$cookies.selectedProject = $scope.getProjectByName(project.name);
			}
		}

		$scope.populateProjectModal = function(project) {
			$scope.projectName = project.name;
			$scope.projectNumber = project.number;
			$scope.projectLogo = project.logo;
			$scope.projectDesc = project.desc;
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

		$scope.getProjectByName = function(projectName) {
			for (var i = 0; i < $cookies.selectedCategory.projects.length; i++) {
				if ($cookies.selectedCategory.projects[i].name === projectName) {
					return $cookies.selectedCategory.projects[i];
				}
			}
		}

}])

.factory('CookieInitService', ['$log', 'CategoryRESTService', 'TeamRESTService', 'CurrentUserService', 
	function($log, CategoryRESTService, TeamRESTService, CurrentUserService) {
	return function($scope, $cookies) {
		var cookieInitService = {};
		var selectedEvent = $cookies.getObject('selected_event') || {id: 0};
		$cookies.categories = {
			list: [],
			getByName: function(name) {
				for (var i = 0; i < this.list.length; i++)
					if (this.list[i].name === name)
						return this.list[i];
			},
			getByID: function(id) {
				for (var i = 0; i < this.list.length; i++)
					if (this.list[i].id === id)
						return this.list[i];
			}
		};

		cookieInitService.initDefaultCookies = function() {
			$cookies.currentView = 'default';
			$cookies.categoryTime = Date();
		}

		cookieInitService.initCategories = function() {
			var connection = CategoryRESTService(CurrentUserService.getAuthHeader(), selectedEvent.id);
			connection.categories.get().$promise.then(function(resp) {
				initCategoryList(resp.event_categories);
			}).catch(function() {
				var errorMessage = 'Error getting categories from server.';
				$log.log(errorMessage);
			});
		}

		var initCategoryList = function(serverCategories) {
			angular.forEach(serverCategories, function(serverCategory) {
				var category = {
					id: serverCategory.id,
					name: serverCategory.label,
					desc: serverCategory.description,
					time: serverCategory.due_at,
					color: convertColorToHex(serverCategory.color),
					projects: [],
					judges: []
				}
				$cookies.categories.list.push(category);
			});
			$cookies.uncategorized = $cookies.categories.list[0];
			$cookies.selectedCategory = $cookies.categories.list[0];
		}

		var convertColorToHex = function(decimalColor) {
			return '#' + decimalColor.toString(16);
		}

		cookieInitService.initTeams = function() {
			var connection = TeamRESTService(CurrentUserService.getAuthHeader(), selectedEvent.id);
			connection.teams.get().$promise.then(function(resp) {
				initTeamList(resp.event_teams);
			}).catch(function() {
				var errorMessage = 'Error getting teams from server.';
				$log.log(errorMessage);
			});
		}

		var initTeamList = function(eventTeams) {
			angular.forEach(eventTeams, function(eventTeam) {
				var teamID = eventTeam.id;
				getEveryCategoryByTeamID(teamID, eventTeam.name);
			});
		}

		var getEveryCategoryByTeamID = function(teamID, teamName) {
			var connection = TeamRESTService(CurrentUserService.getAuthHeader(), teamID);
			connection.team_categories.get().$promise.then(function(resp) {
				angular.forEach(resp.team_categories, function(team_category) {
					var categoryID = team_category.category.id;
					var category = $cookies.categories.getByID(categoryID);
					category.projects.push(team_category.team);
				});
			}).catch(function() {
				var errorMessage = 'Error getting team categories from server.';
				$log.log(errorMessage);
			});
		}

		return cookieInitService;
	}
}])

.factory('ScopeInitService', function() {
	return function($scope, $cookies) {
		var initService = {};

		initService.init = function() {
			$scope.$watchCollection(function() {
				return $cookies.categories.list;
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

			$scope.selectedEvent = $cookies.getObject('selected_event');
		}

		return initService;
	}
})

.factory('CategoryManagementService', ['$log', 'CategoryRESTService', 'CurrentUserService',
	function($log, CategoryRESTService, CurrentUserService) {
		return function($scope, $cookies) {
			var categoryManagement = {};

			categoryManagement.createNewCategory = function() {
				var newCategory = {
					name: $scope.categoryName,
					desc: $scope.categoryDesc,
					time: $scope.categoryTime,
					color: $scope.categoryColor,
					projects: [],
					judges: []
				}
				var categoryReq = {
					label: newCategory.name,
					description: newCategory.desc,
					due_at: newCategory.time,
					color: convertColorToDecimal(newCategory.color)
				}
				var connection = CategoryRESTService(CurrentUserService.getAuthHeader(), $scope.selectedEvent.id);
				connection.new_category.create(categoryReq).$promise.then(function(resp) {
					$cookies.categories.list.push(newCategory);
					$scope.closeCategoryModal();
					$log.log("New category created: " + JSON.stringify(newCategory));
					$log.log("Category list updated: " + $cookies.categories.list.length);
				}).catch(function() {
					$scope.closeCategoryModal();
					$scope.errorMessage = 'Error creating category on server.';
					$log.log($scope.errorMessage);
				});
			}

			categoryManagement.editCategory = function() {
				var updatedCategory = {
					id: $scope.categoryID,
					name: $scope.categoryName,
					desc: $scope.categoryDesc,
					time: $scope.categoryTime,
					color: $scope.categoryColor,
					projects: $scope.selectedCategory.projects, // Projects have not changed
					judges: $scope.selectedCategory.judges // Judges have not changed
				}
				var categoryReq = {
					label: updatedCategory.name,
					description: updatedCategory.desc,
					due_at: updatedCategory.time,
					color: convertColorToDecimal(updatedCategory.color)
				}
				var connection = CategoryRESTService(CurrentUserService.getAuthHeader(), updatedCategory.id);
				connection.category.update(categoryReq).$promise.then(function(resp) {
					editCurrentCategoryCookie($scope.selectedCategory.name, updatedCategory);
					$scope.closeCategoryModal();
					$log.log("Category successfully edited: " + JSON.stringify(updatedCategory));
				}).catch(function() {
					$scope.closeCategoryModal();
					$scope.errorMessage = 'Error editing category on server.';
					$log.log($scope.errorMessage);
				});
			}

			var convertColorToDecimal = function(hexColor) {
				hexColor = hexColor.substring(1, hexColor.length);
				return parseInt(hexColor, 16);
			}

			var editCurrentCategoryCookie = function(value, newObject) {
				for (var i = 0; i < $cookies.categories.list.length; i++) {
					if ($cookies.categories.list[i].name === value) {
						$cookies.categories.list[i] = newObject;
						return;
					}
				}
			}

			return categoryManagement;
	}
}])


.factory('TeamManagementService', ['$log', 'CurrentUserService', 'TeamRESTService', 
	function($log, CurrentUserService, TeamRESTService) {
	return function($scope, $cookies) {
		var teamManagement = {};
		var authHeader = CurrentUserService.getAuthHeader();

		teamManagement.createNewTeam = function() {	
			var newTeam = {
				name: $scope.projectName,
				number: $scope.projectNumber,
				logo: $scope.projectLogo,
				desc: $scope.projectDesc
			};
			var teamReq = {
				name: newTeam.name,
				logo: newTeam.logo
			};
			createTeamOnServer(newTeam, teamReq);
		}

		var createTeamOnServer = function(newTeam, teamReq) {
			var createTeamConnection = TeamRESTService(authHeader, $scope.selectedEvent.id);
			createTeamConnection.teams.create(teamReq).$promise.then(function(resp) {
				var returnedTeamID = resp.event_team.id;
				addNewTeamToUncategorized(newTeam, returnedTeamID);
			}).catch(function() {
				$scope.errorMessage = 'Error creating new team.';
				$log.log($scope.errorMessage);
			});
		}

		var addNewTeamToUncategorized = function(newTeam, teamID) {
			var teamCategoryConnection = TeamRESTService(authHeader, teamID);
			var teamCategoryResp = {category_id: $cookies.uncategorized.id};
			teamCategoryConnection.team_categories.add_team(teamCategoryResp).$promise.then(function(resp) {
				if ($scope.currentView === 'default') {
					$cookies.uncategorized.projects.push(newTeam);
				} else if ($scope.currentView === 'selectedCategory') {
					$cookies.selectedCategory.projects.push(newTeam);
				}
				$scope.closeProjectModal();
				$log.log("New project created: " + JSON.stringify(newTeam));
			}).catch(function() {
				$scope.errorMessage = 'Error adding team to uncategorized.';
				$log.log($scope.errorMessage);
			});
		}

		teamManagement.editTeam = function() {
			$cookies.selectedProject.name = $scope.projectName;
			$cookies.selectedProject.number = $scope.projectNumber;
			$cookies.selectedProject.logo = $scope.projectLogo;
			$cookies.selectedProject.desc = $scope.projectDesc;
			$scope.closeProjectModal();
			$log.log("Project edited: " + JSON.stringify($cookies.selectedProject));
			$log.log(JSON.stringify($cookies.uncategorized));
		}

		teamManagement.transferTeamToCategory = function(categoryName, projectName) {
			var category = $cookies.categories.getByName(categoryName);
			var projectInfo = $.grep($cookies.uncategorized, function(project) {return program.name === projectName});
			var projectIndex = projectInfo.index, project = projectInfo.project;
			category.projects.push(project);
			//$cookies.uncategorized.projects.splice(projectInfo.index, projectInfo.index + 1); // TODO: remove to support teams being in multiple categories
			$scope.$apply(); // Reflect increased project length in UI
			$log.log("Added " + projectName + " to " + categoryName + ".");
		}

		teamManagement.getProjectNumberOptions = function() { // TODO: remove numbers that are unavailable
			var numbers = [];
			for (var i = 10; i < 100; i++) numbers.push(i);
			return numbers;
		}

		return teamManagement;
	}
}])

.factory('CategoryRESTService', function($resource, CurrentUserService) {
	return function(authHeader, id) {
		return {
			categories: $resource('http://api.stevedolan.me/events/:event_id/categories', {
				event_id: id
			}, {
				get: {
					method: 'GET',
					headers: authHeader
				}
			}),
			new_category: $resource('http://api.stevedolan.me/events/:event_id/categories', {
				event_id: id
			}, {
				create: {
					method: 'POST',
					headers: authHeader
				}
			}),
			category: $resource('http://api.stevedolan.me/categories/:id', {
				id: id
			}, {
				get: {
					method: 'GET',
					headers: authHeader
				},
				update: {
					method: 'PUT',
					headers: authHeader
				},
				delete: {
					method: 'DELETE',
					headers: authHeader
				}
			})
		}
	}
})

.factory('TeamRESTService', function($resource, CurrentUserService) {
	return function(authHeader, id) {
		return {
			teams: $resource('http://api.stevedolan.me/events/:event_id/teams', {
				event_id: id
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
			team_categories: $resource('http://api.stevedolan.me/teams/:team_id/categories', {
				team_id: id
			}, {
				get: {
					method: 'GET',
					headers: authHeader
				},
				add_team: {
					method: 'POST',
					headers: authHeader
				}
			})
		}
	}
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
				  elem.data('originalPosition', elem.offset());
				}	
			});

			var cog = elem.find('.glyphicon-cog');

			elem.bind('mouseenter', function() {
				cog.show();
			});

			elem.bind('mouseleave', function() {
				cog.hide();
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
					var originalPosition = droppedProject.data('originalPosition');
					var leftDifference = droppedProject.offset().left - originalPosition.left;
					leftDifference = (leftDifference < 0) ? leftDifference * -1 : leftDifference;
					var leftDecrement = '-=' + leftDifference;
					var topDifference = droppedProject.offset().top - originalPosition.top;
					topDifference = (topDifference < 0) ? topDifference * -1 : topDifference;
					var topDecrement = '-=' + topDifference;
		    	droppedProject.animate({
		    		'left': leftDecrement,
		    		'top': topDecrement
		    	}, 500);
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

		var category = elem.find('.btn'), cog = elem.find('.glyphicon-cog');

		category.mouseenter(function() {
			cog.show();
		});

		category.mouseleave(function() {
			cog.hide();
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

.directive('cngCategoryAccordion', function() {
	return {
		restrict: 'A',
		scope: {
			categoryName: '@',
			color: '@',
			changeCategory: '&'
		},
		link: function(scope, elem, attrs) {
			elem.css('border-color', scope.color);
			elem.find('.panel-heading').css('border-color', scope.color).css('background-color', scope.color);
			elem.bind('mouseenter', function() {
				scope.changeCategory({category: scope.categoryName});
			});
		}
	}
})

.directive('cngCategorySpecificProject', function() {
	return {
		restrict: 'A',
		scope: {
			cog: '@'
		},
		link: function(scope, elem, attrs) {
			var cog = elem.find(scope.cog);
			elem.bind('mouseenter', function() {
				cog.show();
			});
			elem.bind('mouseleave', function() {
				cog.hide();
			});
		}
	}
})

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