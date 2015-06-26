'use strict';

angular.module('liveJudgingAdmin.projects', ['ngRoute', 'ngCookies', 'liveJudgingAdmin.login'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/projects', {
    templateUrl: 'modules/projects/projects.html',
    controller: 'TeamsCtrl'
  });
}])

.controller('TeamsCtrl', ['$scope', '$cookies', 'CookieInitService', 'ScopeInitService', 'CategoryManagementService', 'TeamManagementService',
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
		$scope.teamNumberOptions = teamManagementService.getTeamNumberOptions();

		/*
		 * Category Management Functionality
		 */

		$scope.createNewCategory = function() {
			categoryManagementService.createNewCategory();
		}

		$scope.editSelectedCategory = function() {
			categoryManagementService.editCategory();
		}

		$scope.deleteCategory = function() {
			categoryManagementService.deleteCategory();
		}

		/*
		 * Team Management Functionality
		 */ 

		$scope.createNewTeam = function() {
			teamManagementService.createNewTeam();
		}

		$scope.editSelectedTeam = function() {
			teamManagementService.editTeam();
		}

		$scope.deleteTeam = function() {
			teamManagementService.deleteTeam();
		}

		$scope.transferTeamToCategory = function(categoryName, teamName) {
			teamManagementService.transferTeamToCategory(categoryName, teamName);
		}

		$scope.isTeamAlreadyInCategory = function(categoryName, teamName) {
			var team = $cookies.categories.getTeamByName(categoryName, teamName);
			return team !== undefined;
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
		 * Change Team View
		 */

		$scope.changeTeamModalView = function(view, category, team) {
			$scope.teamModalView = view;
			$scope.openTeamModal();
			if (view === 'edit') {
				$scope.populateTeamModal(team);
				$cookies.selectedTeam = $cookies.categories.getTeamByName(category.name, team.name);
			}
		}

		$scope.populateTeamModal = function(team) {
			$scope.teamID = team.id;
			$scope.teamName = team.name;
			$scope.teamNumber = team.number;
			$scope.teamLogo = team.logo;
			$scope.teamDesc = team.desc;
		}

		$scope.openTeamModal = function() {
			$('#team-modal').modal('show');
		}

		$scope.closeTeamModal = function() {
			$scope.teamName = '';
			$scope.teamNumber = '';
			$scope.teamLogo = '';
			$scope.teamDesc = '';
			$('#team-modal').modal('hide');
		}

}])

.factory('CookieInitService', ['$log', 'CategoryRESTService', 'TeamRESTService', 'CurrentUserService', 
	function($log, CategoryRESTService, TeamRESTService, CurrentUserService) {
	return function($scope, $cookies) {
		var cookieInitService = {};
		var selectedEvent = $cookies.getObject('selected_event') || {id: 0};
		$cookies.categories = {
			list: [],
			getByName: function(name) { // Get Category by name
				for (var i = 0; i < this.list.length; i++) {
					if (this.list[i].name === name)
						return this.list[i];
				}
			},
			getByID: function(id) { // Get Category by id
				for (var i = 0; i < this.list.length; i++)
					if (this.list[i].id === id)
						return this.list[i];
			},
			getTeamByName: function(categoryName, teamName) {
				var category = this.getByName(categoryName);
				for (var i = 0; i < category.teams.length; i++) 
					if (category.teams[i].name === teamName)
						return category.teams[i];
			},
			getTeamByID: function(categoryName, teamID) {
				var category = this.getByName(categoryName);
				for (var i = 0; i < category.teams.length; i++) 
					if (category.teams[i].id === teamID)
						return category.teams[i];
			},
			edit: function(oldCategory, newCategory) { // Edit Category
				var index = this.list.indexOf(oldCategory);
				if (-1 !== index)
					this.list[index] = newCategory;
			},
			delete: function(category) { // Delete Category
				if ($.inArray(this.list, category))
					this.list.splice(this.list.indexOf(category), 1);
			},
			deleteTeam: function(team) {
				for (var i = 0; i < this.list.length; i++)
					if ($.inArray(this.list[i].teams, team))
						this.list[i].teams.splice(this.list[i].teams.indexOf(team), 1);
			},
			isTaken: function(categoryName) {
				return undefined !== this.getByName(categoryName) 
					&& $cookies.selectedCategory.name !== categoryName;
			},
			isTeamTaken: function(teamName) {
				if ($cookies.selectedTeam === undefined)
					return undefined !== this.getTeamByName('Uncategorized', teamName) 
				else 
					return undefined !== this.getTeamByName('Uncategorized', teamName) 
						&& $cookies.selectedTeam.name !== teamName;
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
					teams: [],
					judges: []
				}
				$cookies.categories.list.push(category);
			});
			$cookies.uncategorized = $cookies.categories.list[0];
			$cookies.selectedCategory = $cookies.categories.list[0];
		}

		var convertColorToHex = function(decimalColor) {
			var hexColor = decimalColor.toString(16);
			var lengthDiff = 6 - hexColor.length;
			var prefix = '#';
			if (lengthDiff > 0) {
				prefix += Array(lengthDiff + 1).join('0');
			}
			return prefix + hexColor;
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
					category.teams.push(team_category.team);
					console.log(team_category.team);
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
				return $cookies.categories;
			}, function(newValue) {
				$scope.categories = newValue;
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
			var authHeader = CurrentUserService.getAuthHeader();

			categoryManagement.createNewCategory = function() {
				if (!validateForm()) 
					return;
				var newCategory = {
					name: $scope.categoryName,
					desc: $scope.categoryDesc,
					time: $scope.categoryTime,
					color: $scope.categoryColor,
					teams: [],
					judges: []
				}
				var categoryReq = {
					label: newCategory.name,
					description: newCategory.desc,
					due_at: newCategory.time,
					color: convertColorToDecimal(newCategory.color)
				}
				var connection = CategoryRESTService(authHeader, $scope.selectedEvent.id);
				connection.new_category.create(categoryReq).$promise.then(function(resp) {
					var returnedCategoryID = resp.event_category.id;
					newCategory.id = returnedCategoryID;
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
				if (!validateForm()) 
					return;
				var updatedCategory = {
					id: $scope.categoryID,
					name: $scope.categoryName,
					desc: $scope.categoryDesc,
					time: $scope.categoryTime,
					color: $scope.categoryColor,
					teams: $scope.selectedCategory.teams, // Teams have not changed
					judges: $scope.selectedCategory.judges // Judges have not changed
				}
				var categoryReq = {
					label: updatedCategory.name,
					description: updatedCategory.desc,
					due_at: updatedCategory.time,
					color: convertColorToDecimal(updatedCategory.color)
				}
				var connection = CategoryRESTService(authHeader, updatedCategory.id);
				connection.category.update(categoryReq).$promise.then(function(resp) {
					$cookies.categories.edit($cookies.selectedCategory, updatedCategory);
					$scope.closeCategoryModal();
					$log.log('Category successfully edited: ' + JSON.stringify(updatedCategory));
				}).catch(function() {
					$scope.closeCategoryModal();
					$scope.errorMessage = 'Error editing category on server.';
					$log.log($scope.errorMessage);
				});
			}

			var validateForm = function() {
				var name = $scope.categoryName, time = $scope.categoryTime, color = $scope.categoryColor.toLowerCase();
				$scope.categoryModalError = undefined;
				if (isEmpty(name))
					$scope.categoryModalError = 'Category name is required.';
				else if ($cookies.categories.isTaken(name))
					$scope.categoryModalError = 'Category name already taken.';
				else if (color === '#ffffff' || color === 'ffffff' || isEmpty(color))
					$scope.categoryModalError = 'Category color is required.';
				return $scope.categoryModalError === undefined;
			}

			var isEmpty = function(str) {
		    return (!str || 0 === str.length);
			}

			var convertColorToDecimal = function(hexColor) {
				hexColor = hexColor.substring(1, hexColor.length);
				return parseInt(hexColor, 16);
			}

			categoryManagement.deleteCategory = function() {
				var connection = CategoryRESTService(authHeader, $cookies.selectedCategory.id);
				connection.category.delete().$promise.then(function(resp) {
					$cookies.categories.delete($cookies.selectedCategory);
					$scope.closeCategoryModal();
					$log.log('Successfully deleted category.');
				}).catch(function() {
					$scope.errorMessage = 'Error deleting catgory.';
					$log.log($scope.errorMessage);
				});
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
			if (!validateForm()) 
				return;
			var newTeam = {
				name: $scope.teamName,
				number: $scope.teamNumber,
				logo: $scope.teamLogo,
				desc: $scope.teamDesc
			};
			var teamReq = {
				name: newTeam.name,
				logo: newTeam.logo
			};
			createTeamOnServer(newTeam, teamReq);
		}

		var createTeamOnServer = function(newTeam, teamReq) {
			var connection = TeamRESTService(authHeader, $scope.selectedEvent.id);
			connection.teams.create(teamReq).$promise.then(function(resp) {
				var returnedTeamID = resp.event_team.id;
				newTeam.id = returnedTeamID;
				addNewTeamToUncategorized(newTeam, returnedTeamID);
			}).catch(function() {
				$scope.errorMessage = 'Error creating new team.';
				$log.log($scope.errorMessage);
			});
		}

		var addNewTeamToUncategorized = function(newTeam, teamID) {
			var connection = TeamRESTService(authHeader, teamID);
			var teamCategoryReq = {category_id: $cookies.uncategorized.id};
			connection.team_categories.add_team(teamCategoryReq).$promise.then(function(resp) {
				if ($scope.currentView === 'default') {
					$cookies.uncategorized.teams.push(newTeam);
				} else if ($scope.currentView === 'selectedCategory') {
					$cookies.selectedCategory.teams.push(newTeam);
				}
				$scope.closeTeamModal();
				$log.log("New team created: " + JSON.stringify(newTeam));
			}).catch(function() {
				$scope.errorMessage = 'Error adding team to uncategorized.';
				$log.log($scope.errorMessage);
			});
		}

		teamManagement.editTeam = function() { 
			if (!validateForm()) 
				return;
			var updatedTeam = {
				id: $scope.teamID,
				name: $scope.teamName,
				number: $scope.teamNumber,
				logo: $scope.teamLogo,
				desc: $scope.teamDesc
			};
			var req = {
				name: updatedTeam.name,
				logo: updatedTeam.logo
			};
			var connection = TeamRESTService(authHeader, updatedTeam.id);
			connection.team.update(req).$promise.then(function(resp) {
				// Deep-copy the new team for every category that has the team
				angular.forEach($cookies.categories.list, function(category) {
					var team = $cookies.categories.getTeamByID(category.name, updatedTeam.id);
					if (undefined !== team) {
						angular.copy(updatedTeam, team);
					}
				});
				// Clear corresponding jQuery object's draggable data, as editing name can change position
				var jQueryAttribute = '[teamname="' + updatedTeam.name + '"]';
				$(jQueryAttribute).data('originalPosition', undefined);
				$scope.closeTeamModal();
				$log.log("Team edited: " + JSON.stringify($cookies.selectedTeam));
			}).catch(function() {
				$scope.errorMessage = 'Error editing team.';
				$log.log($scope.errorMessage);
			});
		}

		var validateForm = function() {
			var name = $scope.teamName;
			$scope.teamModalError = undefined;
			if (isEmpty(name))
				$scope.teamModalError = 'Team name is required.';
			else if ($cookies.categories.isTeamTaken(name))
				$scope.teamModalError = 'Team name already taken.';
			return $scope.teamModalError === undefined;
		}

		var isEmpty = function(str) {
	    return (!str || 0 === str.length);
		}

		teamManagement.deleteTeam = function() {
			var connection = TeamRESTService(authHeader, $cookies.selectedTeam.id);
			connection.team.delete().$promise.then(function(resp) {
				$cookies.categories.deleteTeam($cookies.selectedTeam);
				$scope.closeTeamModal();
			}).catch(function() {
				$scope.errorMessage = 'Error deleting team.';
				$log.log($scope.errorMessage);
			});
		}


		teamManagement.transferTeamToCategory = function(categoryName, teamName) {
			var category = $cookies.categories.getByName(categoryName);
			var team = $cookies.categories.getTeamByName('Uncategorized', teamName);	
			var connection = TeamRESTService(authHeader, team.id);
			var req = {category_id: category.id};
			connection.team_categories.add_team(req).$promise.then(function(resp) {
				category.teams.push(team);
				$log.log("Added " + teamName + " to " + categoryName + ".");
			}).catch(function() {
				$scope.error = 'Error transferring team to category.'
			});
		}

		teamManagement.getTeamNumberOptions = function() { // TODO: remove numbers that are unavailable
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
			team: $resource('http://api.stevedolan.me/teams/:id', {
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
			}),
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

.directive('cngDraggableTeam', [function() { 

	return {
		restrict: 'A',
		link: function(scope, elem, attrs) {
			elem.draggable({
				cursor: 'grab',
				start: function(event, ui) { 
					if (undefined === elem.data('originalPosition')) {
						elem.data('originalPosition', elem.offset());
					}
				  $(this).draggable('option', 'cursorAt', {
				    left: Math.floor(ui.helper.width() / 2),
				    top: Math.floor(ui.helper.height() / 2)
				  }); 
				}
			});

			var cog = elem.find('.glyphicon-cog');

			elem.bind('mouseenter', function() {
				cog.show();
			});

			elem.bind('mouseleave', function() {
				cog.hide();
			});

			$.fn.goBack = function() {
				if ($(this).is('[cng-draggable-team]')) {
					var originalPosition = $(this).data('originalPosition');
					var leftDifference = $(this).offset().left - originalPosition.left;
					var leftDecrement = '-=' + leftDifference;
					var topDifference = $(this).offset().top - originalPosition.top;
					var topDecrement = '-=' + topDifference;
					$(this).animate({
		    		'left': leftDecrement,
		    		'top': topDecrement
		    	}, 500);
				}
			}
		}
	}

}])

.directive('cngDroppableCategory', ['$cookies', function($cookies) {

	var link = function(scope, elem, attrs) {
		elem.droppable({
			drop: function(event, ui) {
				var droppedTeam = ui.draggable;
				var teamName = droppedTeam.attr('teamName').trim();
				var categoryName = scope.categoryName.trim();
				var alreadyExists = scope.checkCategory({categoryName: categoryName, teamName: teamName});
				droppedTeam.goBack();
				if (!alreadyExists) {
					var categoryContainer = $(event.target).find('a');
					performFlashAnimation(categoryContainer);
					scope.updateCategory({categoryName: categoryName, teamName: teamName});
				}
			}
		});

		var performFlashAnimation = function(categoryContainer) {
    	var originalColor = categoryContainer.css('backgroundColor');
			categoryContainer.animate({
        backgroundColor: "#fff"
			}, 400);
			categoryContainer.animate({
        backgroundColor: originalColor
			}, 400);
		}

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
			checkCategory: '&',
			updateCategory: '&',
			categoryName: '@'
		},
		link: link	
	};

}])

.directive('cngOrganizeTeams', function() {
	return {
		restrict: 'A',
		link: function(scope, elem, attrs) {
			elem.bind('click', function() {
				$('[cng-draggable-team]').each(function() {
					if (undefined !== $(this).data('originalPosition'))
						$(this).goBack();
				});
			});
		}
	}
})

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

.directive('cngCategorySpecificTeam', function() {
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