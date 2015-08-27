'use strict';

angular.module('liveJudgingAdmin.teams', ['ngRoute', 'liveJudgingAdmin.login'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/teams', {
	templateUrl: 'modules/teams/teams.html',
	controller: 'TeamsCtrl'
  });
}])

.controller('TeamsCtrl', ['$scope', 'sessionStorage', 'TeamInitService', 'CategoryManagementService', 'ScopeInitService', 'TeamManagementService',
	function($scope, sessionStorage, TeamInitService, CategoryManagementService, ScopeInitService, TeamManagementService) {

		sessionStorage.remove('selectedCategory');

		/*
		 * Automatic synchronization between scope and cookies
		 */

		var scopeInitService = ScopeInitService($scope, sessionStorage);
		scopeInitService.init();

		var teamInitService = TeamInitService($scope, sessionStorage);
		teamInitService.initDefaultCookies();

		var categoryManagementService = CategoryManagementService($scope, sessionStorage);

		var teamManagementService = TeamManagementService($scope, sessionStorage);
		teamManagementService.getTeamsAndTheirCategories().then(function(resp) {
			
		});
		$scope.teamNumberOptions = teamManagementService.getTeamNumberOptions();

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

		$scope.isTeamAlreadyInCategory = function(categoryName, teamName) {
			var team = teamManagementService.getTeamByName(teamName);
			// Need a cat->team mapping.
			return team !== null;
		}

		/*
		 * Change Category View
		 */

		$scope.changeView = function(view) {
			teamManagementService.changeView(view);
		}

		/*
		 * Change Team View
		 */

		$scope.changeTeamModalView = function(view, team) {
			$scope.teamModalView = view;
			if (view === 'edit') {
				$scope.populateTeamModal(team);
				sessionStorage.putObject('selectedTeam', team);
			}
      $scope.openTeamModal();
		}

		$scope.populateTeamModal = function(team) {
			$scope.teamID = team.id;
			$scope.teamName = team.name;
			$scope.teamNumber = team.number;
			$scope.teamLogo = team.logo;
      $scope.teamThumbnail = team.logo;
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
      $('#preview-image-create').hide();
      $('#preview-image-edit').hide();
      $('#file-name-text').val('');
			sessionStorage.remove('selectedTeam');
		}

}])

.factory('TeamInitService', ['$q', '$log', '$rootScope', 'CategoryRESTService', 'TeamRESTService',
		'CategoryManagementService', 'CurrentUserService', 'sessionStorage',
	function($q, $log, $rootScope, CategoryRESTService, TeamRESTService,
		CategoryManagementService, CurrentUserService, sessionStorage) {
	return function($scope, sessionStorage) {
		var teamInitService = {};
		var selectedEvent = sessionStorage.getObject('selected_event');
		var categoryManagementService = CategoryManagementService($scope, sessionStorage);

		teamInitService.initDefaultCookies = function() {
			sessionStorage.put('teamView', 'default');
			sessionStorage.categoryTime = Date();
		}

		return teamInitService;
	}
}])

.factory('ScopeInitService', function(sessionStorage) {
	return function($scope, sessionStorage) {
		var initService = {};

		initService.init = function() {
			$scope.$watch(function() {
				return sessionStorage.getObject('selectedCategory');
			}, function(newValue) {
				$scope.selectedCategory = newValue;
			}, true);

			$scope.$watch(function() {
				return sessionStorage.getObject('selectedTeam');
			}, function(newValue) {
				$scope.selectedTeam = newValue;
			}, true);

			$scope.$watch(function() {
				return sessionStorage.get('teamView');
			}, function(newValue) {
				$scope.teamView = newValue;
			});

			$scope.$watch(function() {
				return sessionStorage.getObject('teams');
			}, function(newValue) {
				$scope.teams = newValue;
			}, true);

			$scope.$watch(function() {
				return sessionStorage.getObject('categories');
			}, function(newValue) {
				$scope.categories = newValue;
			}, true);

			$scope.selectedEvent = sessionStorage.getObject('selected_event');
	  $scope.imageUploadError = null;
		}

		return initService;
	}
})

.factory('TeamManagementService', ['$log', '$q', 'CategoryManagementService', 'CurrentUserService', 'TeamRESTService', 'sessionStorage',
	function($log, $q, CategoryManagementService, CurrentUserService, TeamRESTService, sessionStorage) {
	return function($scope, sessionStorage) {
		var teamManagement = {};
		var authHeader = CurrentUserService.getAuthHeader();
		var selectedEvent = sessionStorage.getObject('selected_event');
		var categoryManagementService = CategoryManagementService($scope, sessionStorage);
    
    /*
     * Returns all teams, and each teams contains an array of categories it is in
     */
    
    teamManagement.getTeamsAndTheirCategories = function() {
			var defer = $q.defer();

			var connection = TeamRESTService(authHeader);
			connection.teams.get({event_id: selectedEvent.id}).$promise.then(function(resp) {
				return getCategoriesForEachTeam(resp);
			}).then(function(filledTeams) {
				sessionStorage.putObject('teams', filledTeams);
				defer.resolve(filledTeams);
			}).catch(function() {
				sessionStorage.put('generalErrorMessage', 'Error getting teams from server.');
				defer.reject('Error getting teams.');
				$log.log('Error getting teams from server.');
			});

			return defer.promise;
		}
    
    var getCategoriesForEachTeam = function(eventTeams) {
			var deferred = $q.defer();
			var filledTeams = [], promises = [];
			var connection = TeamRESTService(authHeader);

			function promiseCategories(team) {
				var innerDeferred = $q.defer();
				team.categories = [];
				connection.team_categories.get({team_id: team.id}).$promise.then(function(resp) {
					angular.forEach(resp, function(team_category) {
						team.categories.push(team_category.category);
					});
					$q.all(team.categories).then(function() {
						innerDeferred.resolve(team);
					});
				});
				return innerDeferred.promise;
			}

			angular.forEach(eventTeams, function(team) {
				var promise = promiseCategories(team).then(function(filledTeam) {
					filledTeams.push(filledTeam);
				});
				promises.push(promise);
			});

			$q.all(promises).then(function() {
				deferred.resolve(filledTeams);
			});
			return deferred.promise;
		}
    
    /*
     * Returns an array of team-category pairings: each array entry contains
     * a pairing between a team and category, with a unqiue team-category id
     */

		teamManagement.getTeamCategories = function() {
			var defer = $q.defer();

			var connection = TeamRESTService(authHeader);
			connection.teams.get({event_id: selectedEvent.id}).$promise.then(function(resp) {
				return getAllTeamCategories(resp);
			}).then(function(filledTeams) {
				sessionStorage.putObject('teams', filledTeams);
				defer.resolve(filledTeams);
			}).catch(function() {
				sessionStorage.put('generalErrorMessage', 'Error getting teams from server.');
				defer.reject('Error getting teams.');
				$log.log('Error getting teams from server.');
			});

			return defer.promise;
		}
    
    teamManagement.getTeamCategory = function(team_category_id) {
      var defer = $q.defer();
      
      TeamRESTService(authHeader).team_category.get({id: team_category_id})
        .$promise.then(function(teamCategory) {
        defer.resolve(teamCategory);
      }).catch(function(error) {
        defer.reject();
      });
      
      return defer.promise;
    }

		// Gets the team_category ids
		var getAllTeamCategories = function(teams) {
			var defer = $q.defer();

			var promises = [];
			for (var i = 0; i < teams.length; i++) {
				promises.push(getTeamCategories(teams[i].id));
			}

			$q.all(promises).then(function(resp) {
				defer.resolve(resp);
        console.log('Successfully retrieved teams with their respective categories.');
			}).catch(function() {
				defer.reject();
			});	

			function getTeamCategories(teamId) {
				var defer = $q.defer();

				TeamRESTService(authHeader).team_categories.get({team_id: teamId}).$promise.then(function(resp) {
					defer.resolve(resp);
				}).catch(function() {
					defer.reject();
				});

				return defer.promise;
			}
      
      return defer.promise;
		}

		teamManagement.createNewTeam = function() {
			if (!validateForm(false))
				return;
			var newTeam = {
				name: $scope.teamName,
				number: $scope.teamNumber,
				logo: $scope.teamLogo,
				desc: $scope.teamDesc
			};
			var teamReq = {
				name: newTeam.name,
				logo_base64: newTeam.logo
			};
			createTeamOnServer(newTeam, teamReq);
		}

		var createTeamOnServer = function(newTeam, teamReq) {
			var eventId = sessionStorage.getObject('selected_event').id;
			var connection = TeamRESTService(authHeader);
      
			connection.teams.create({event_id: eventId}, teamReq).$promise.then(function(resp) {
				// Add new team to uncategorized (or to the selected category if there is one).
				var returnedTeamID = resp.id;
				var catId;
				if (sessionStorage.getObject('selectedCategory')) {
					catId = sessionStorage.getObject('selectedCategory').id;
				} else {
					catId = sessionStorage.getObject('uncategorized').id;
				}
				categoryManagementService.transferTeamToCategory(catId, returnedTeamID, false);

				var teams = sessionStorage.getObject('teams');
				if (teams) {
					teams.push(resp);
					sessionStorage.putObject('teams', teams);
				} else {
					sessionStorage.putObject('teams', resp);
				}
				// Todo: Update uncategorized to reflect changes.
			}).catch(function() {
				sessionStorage.put('generalErrorMessage', 'Error creating new team.');
				$log.log('Error creating new team.');
			});
		}

		teamManagement.editTeam = function() {
			if (!validateForm(true))
				return;
			var updatedTeam = {
				id: $scope.teamID,
				name: $scope.teamName,
				number: $scope.teamNumber,
				logo: $scope.teamLogo,
				desc: $scope.teamDesc
			};
			var req = {
				name: updatedTeam.name
			};
			// Server returns a 500 if a null logo is passed in.
			if (updatedTeam.logo) {
				req.logo_base64 = updatedTeam.logo;
			}
			var connection = TeamRESTService(authHeader);
			connection.team.update({id: updatedTeam.id}, req).$promise.then(function(resp) {
				// Todo: call API to update category->team mappings (once that's in the API).
				updateTeam(updatedTeam);
				$scope.closeTeamModal();
				$log.log("Team edited: " + resp.name);
			}).catch(function() {
				sessionStorage.put('generalErrorMessage', 'Error editing team.');
				$log.log('Error editing team.');
			});
		}

		var updateTeam = function(newTeam) {
			var teams = sessionStorage.getObject('teams');
			var teamToUpdate = null;
			for (var i = 0; i < teams.length; i++) {
				if (newTeam.id === teams[i].id) {
					teamToUpdate = teams[i];
					break;
				}
			}
			newTeam.categories = teamToUpdate.categories;
			teams[teams.indexOf(teamToUpdate)] = newTeam;
			sessionStorage.putObject('teams', teams);
		}

		teamManagement.deleteTeam = function() {
			var defer = $q.defer();
			var connection = TeamRESTService(authHeader);
			connection.team.delete({id: sessionStorage.getObject('selectedTeam').id}).$promise.then(function(resp) {
				categoryManagementService.getCategories();
				var teams = sessionStorage.getObject('teams');
				for (var i = 0; i < teams.length; i++) {
					if (teams[i].id == sessionStorage.getObject('selectedTeam').id) {
						teams.splice(i, 1);
						break;
					}
				}
				sessionStorage.putObject('teams', teams);
				$scope.closeTeamModal();
				$log.log('Successfully deleted team.');
				defer.resolve(true);
				// Todo: update categories' team lists to reflect changes.
			}).catch(function() {
				sessionStorage.put('generalErrorMessage', 'Error deleting team.');
				$log.log('Error deleting team.');
				defer.resolve(false);
			});
			return defer.promise;
		}

		teamManagement.updateStoredCategory = function(category) {
			sessionStorage.putObject('selectedCategory', category);
		}

		teamManagement.getTeamNumberOptions = function() { // TODO: remove numbers that are unavailable
			var numbers = [];
			for (var i = 10; i < 100; i++) numbers.push(i);
			return numbers;
		}

		teamManagement.getTeamByName = function(teamName) {
			var retVal = null;
			var teams = sessionStorage.getObject('teams');
			angular.forEach(teams, function(team) {
				if (team.name === teamName) {
					retVal = team;
				}
			});
			return retVal;
		}

		teamManagement.getTeamByID = function(teamId) {
			var teams = sessionStorage.getObject('teams');
			for (var i = 0; i < teams.length; i++) {
				if (teams[i].id == teamId) {
					return teams[i];
				}
			}
			return null;
		}

		teamManagement.isTeamAlreadyInCategory = function(teamId, categoryId) {
			var defer = $q.defer();

			categoryManagementService.getTeamsInCategory(categoryId).then(function(teamsInCat) {
				for (var i = 0; i < teamsInCat.length; i++) {
					if (teamId == teamsInCat[i].id) {
						defer.resolve(true);
					}
				}
				defer.resolve(false);
			}).catch(function() {
				sessionStorage.put('generalErrorMessage', 'Error getting teams in category.');
				defer.reject('Error getting teams in category');
			});

			return defer.promise;
		}

		teamManagement.changeView = function(view) {
			sessionStorage.put('teamView', view);
			if (view == 'default') {
				sessionStorage.remove('selectedCategory');
			}
		}

		var validateForm = function(isEdit) {
			var name = $scope.teamName;
			$scope.teamModalError = undefined;
			if (isEmpty(name))
				$scope.teamModalError = 'Team name is required.';
			else if (!isEdit && isTeamNameTaken(name))
				$scope.teamModalError = 'Team name already taken.';
			return $scope.teamModalError === undefined;
		}

		var isTeamNameTaken = function(name) {
			return teamManagement.getTeamByName(name) !== null;
		}

		var isEmpty = function(str) {
		  return (!str || 0 === str.length);
		}

		return teamManagement;
	}
}])

.factory('TeamRESTService', function($rootScope, $resource, CurrentUserService) {
	return function(authHeader) {
		return {
			team: $resource($rootScope.rootURL + 'teams/:id', {
				id: '@id'
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
			teams: $resource($rootScope.rootURL + 'events/:event_id/teams', {
				event_id: '@id'
			}, {
				get: {
					method: 'GET',
					isArray: true,
					headers: authHeader
				},
				create: {
					method: 'POST',
					headers: authHeader
				}
			}),
      team_category: $resource($rootScope.rootURL + 'team_categories/:id', {
				id: '@id'
			}, {
				get: {
					method: 'GET',
					headers: authHeader
				}
      }),
			team_categories: $resource($rootScope.rootURL + 'teams/:team_id/categories', {
				team_id: '@id', category_id: '@category_id'
			}, {
				get: {
					method: 'GET',
					isArray: true,
					headers: authHeader
				},
				add_team: {
					method: 'POST',
					headers: authHeader
				},
				remove_team: {
					url: $rootScope.rootURL + 'teams/:team_id/categories/:category_id',
					method: 'DELETE',
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

.directive('imageFileInput', function() {
  return {
    restrict: 'A',
    require: 'ngModel',
    scope: {
      previewContainer: '@',
      fileName: '=',
      error: '='
    },
    link: function(scope, elem, attrs, ngModel) {
      elem.change(function() {
        selectAndRenderImage();
      });
      
      function selectAndRenderImage() {
        var file = elem.context.files[0];
        var preview = document.getElementById(scope.previewContainer);
        var previewInfo = elem.find('#' + scope.previewInfoContainer);

        if (!isCorrectFileFormat(file))
          return;

        var reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onloadend = function () {
          scope.fileName = file.name;
          preview.style.display = 'block';
          preview.src = reader.result;
          var imageData = getBase64Image(preview);
          ngModel.$setViewValue(imageData);
        }  
      }
      
      function isCorrectFileFormat(file) { 
        if (!file)
          return false;
        if (!isImage(file)) {
          scope.error = 'Unsupported file type. Supported: |jpg|png|jpeg|bmp|gif|';
          scope.$apply();
          return false;
        }
        scope.error = null;
        return true;
      }
      
      function isImage(file) {
        var type =  '|' + file.type.slice(file.type.lastIndexOf('/') + 1) + '|';
        return '|jpg|png|jpeg|bmp|gif|'.indexOf(type) !== -1;
      }

      function getBase64Image(img) {
          // Create an empty canvas element
          var canvas = document.createElement('canvas');
          canvas.width = 300;
          canvas.height = 200;

          // Copy the image contents to the canvas
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Get the data-URL formatted image
          // Firefox supports PNG and JPEG. You could check img.src to
          // guess the original format, but be aware that using "image/jpg"
          // will re-encode the image.
          var dataURL = canvas.toDataURL('image/png');
          return dataURL;
      }
    }
  }
});