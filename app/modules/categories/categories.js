'use strict';

angular.module('liveJudgingAdmin.categories', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/categories', {
    templateUrl: 'modules/categories/categories.html',
    controller: 'CategoriesCtrl'
  });
}])

.controller('CategoriesCtrl', ['$cookies', '$location', '$scope', 'CategoryManagementService', 'CatWatchService', 'JudgeManagementService', 'TeamManagementService',
    function($cookies, $location, $scope, CategoryManagementService, CatWatchService, JudgeManagementService, TeamManagementService) {

        var catWatchService = CatWatchService($cookies, $scope);
        catWatchService.init();

        var categoryManagementService = CategoryManagementService($scope, $cookies);
        categoryManagementService.getCategories();

        var teamManagementService = TeamManagementService($scope, $cookies);
        var judgeManagementService = JudgeManagementService($scope, $cookies);

        $scope.createNewCategory = function() {
            categoryManagementService.createNewCategory();
        }

        $scope.editSelectedCategory = function() {
            categoryManagementService.editCategory();       
        }

        $scope.deleteCategory = function() {
            categoryManagementService.deleteCategory();
        }

        $scope.deleteItem = function(itemId, itemType) {
            if ($location.path().includes('teams')) {
                var team = teamManagementService.getTeamByID(parseInt(itemId));
                $cookies.putObject('selectedTeam', team);
                teamManagementService.deleteTeam();
            } else if ($location.path().includes('judges')) {
                //
            }
        }

        $scope.removeTeamFromCategory = function(itemId) {
            var categoryId = $scope.selectedCategory.id;
            teamManagementService.removeTeamFromCategory(itemId, categoryId);
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
            $scope.categoryName = category.label;
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
            $scope.categoryModalError = null;
            $('#category-modal').modal('hide');
            $scope.updateSelectedCategory(null);
        }

        $scope.updateSelectedCategory = function(category) {
            if ($location.path().includes('teams')) {
                teamManagementService.updateSelectedCategory(category);
            }

            if (category) {
               $cookies.putObject('selectedCategory', category);   
            } else {
                $cookies.remove('selectedCategory');
            }
        }

        $scope.transferItemToCategory = function(categoryId, itemId) {
            if ($location.path().includes('teams')) {
                teamManagementService.transferTeamToCategory(categoryId, itemId);
            } else if ($location.path().includes('judges')) {
                judgeManagementService.openAssignByCatModal(categoryId, itemId);
            }
        }

        $scope.viewCategoryDetails = function(cat) {
            $scope.updateSelectedCategory(cat);

            if ($location.path().includes('teams')) {
                teamManagementService.changeView('selectedCategory');
            } else if ($location.path().includes('judges')) {
				judgeManagementService.changeView('selectedCategory');
						}
            // if ($location.path().includes('rubrics'))
        }
    }
])

.factory('CatWatchService', function() {
    return function($cookies, $scope) {
        var service = {};

        service.init = function() {
            $scope.$watch(function() { 
                return $cookies.getObject('categories');
            }, function(newValue) {
                $scope.categories = newValue;
            }, true);

            $scope.$watch(function() {
                return $cookies.getObject('uncategorized');
            }, function(newValue) {
                $scope.uncategorized = newValue;
            }, true);

            $scope.$watch(function() {
                return $cookies.get('teamView');
            }, function(newValue) {
                $scope.teamView = newValue;
            }, true);
        };

        return service;
    }
})

.factory('CategoryManagementService', ['$cookies', '$log', '$q', 'CategoryRESTService', 'CurrentUserService',
    function($cookies, $log, $q, CategoryRESTService, CurrentUserService) {
    return function($scope, $cookies) {
        var authHeader = CurrentUserService.getAuthHeader();
        var eventId = $cookies.getObject('selected_event').id;

        var categoryManagement = {};
            
        categoryManagement.getCategories = function() {
            CategoryRESTService(authHeader).categories.get({event_id: eventId}).$promise.then(function(resp) {
                angular.forEach(resp.event_categories, function(category) {
                    if (category.label === 'Uncategorized') {
                        category.color = '#BBBBBB';
                        $cookies.putObject('uncategorized', category);
                    }
                    category.color = categoryManagement.convertColorToHex(category.color);
                });
                $cookies.putObject('categories', resp.event_categories);

            }).catch(function() {
                console.log('Error getting categories.');
            });
        };

        categoryManagement.createNewCategory = function() {
            if (!validateForm(false)) {
                return;
            }
            var newCategory = {
                name: $scope.categoryName,
                desc: $scope.categoryDesc,
                time: $scope.categoryTime,
                color: $scope.categoryColor,
                teams: [],
                judges: []
            };      
            var categoryReq = {
                label: newCategory.name,
                description: newCategory.desc,
                due_at: newCategory.time,
                color: convertColorToDecimal(newCategory.color)
            };
            var connection = CategoryRESTService(authHeader);
            connection.new_category.create({event_id: eventId}, categoryReq).$promise.then(function(resp) {
                var returnedCategoryID = resp.event_category.id;
                newCategory.id = returnedCategoryID;
                resp.event_category.color = categoryManagement.convertColorToHex(resp.event_category.color);
                // Save category objects in cookie.
                var currentCats = $cookies.getObject('categories');
                if (currentCats) {
                    currentCats.push(resp.event_category);
                    $cookies.putObject('categories', currentCats);
                } else {
                    $cookies.putObject('categories', resp.event_category);
                }

                $scope.closeCategoryModal();
                $log.log("New category created: " + JSON.stringify(newCategory));
                $log.log("Category list updated: " + $cookies.getObject('categories').length);
            }).catch(function() {
                $scope.closeCategoryModal();
                $scope.errorMessage = 'Error creating category on server.';
                $log.log($scope.errorMessage);
            });
        }

        categoryManagement.editCategory = function() {
            if (!validateForm(true)) {
                return;
            }
            var updatedCategory = {
                id: $scope.categoryID,
                name: $scope.categoryName,
                desc: $scope.categoryDesc,
                time: $scope.categoryTime,
                color: $scope.categoryColor,
                teams: $scope.selectedCategory.teams // Projects have not changed
                //judges: $scope.selectedCategory.judges // Judges have not changed
            }
            var categoryReq = {
                label: updatedCategory.name,
                description: updatedCategory.desc,
                due_at: updatedCategory.time,
                color: convertColorToDecimal(updatedCategory.color)
            }
            var connection = CategoryRESTService(authHeader);
            connection.category.update({id: updatedCategory.id}, categoryReq).$promise.then(function(resp) {
                categoryManagement.getCategories();
                $scope.closeCategoryModal();
                $log.log('Category successfully edited: ' + JSON.stringify(updatedCategory));
            }).catch(function() {
                $scope.closeCategoryModal();
                $scope.errorMessage = 'Error editing category on server.';
                $log.log($scope.errorMessage);
            });
        }

        categoryManagement.deleteCategory = function() {
            var catId = $cookies.getObject('selectedCategory').id;
            var connection = CategoryRESTService(authHeader);
            connection.category.delete({id: catId}).$promise.then(function(resp) {
                var cats = $cookies.getObject('categories');
                for (var i = 0; i < cats.length; i++) {
                    if (cats[i].id == catId) {
                        cats.splice(i, 1);
                        break;
                    }
                }
                $cookies.putObject('categories', cats);
                $scope.closeCategoryModal();
                $log.log('Successfully deleted category.');
            }).catch(function() {
                $scope.errorMessage = 'Error deleting catgory.';
                $log.log($scope.errorMessage);
            });
        }

        categoryManagement.getTeamsInCategory = function(categoryId) {
            var defer = $q.defer();

            var catRESTService = CategoryRESTService(authHeader);
            catRESTService.category.get({id: categoryId}).$promise.then(function(resp) {
                console.log(resp);
                defer.resolve(resp.event_category.teams);
            }).catch(function() {
                console.log('Error getting teams in category ' + categoryId);
                defer.reject('Error getting teams in category');
            });

            return defer.promise;
        }

        var isEmpty = function(str) {
        return (!str || 0 === str.length);
        }

        var convertColorToDecimal = function(hexColor) {
            hexColor = hexColor.substring(1, hexColor.length);
            return parseInt(hexColor, 16);
        }

        categoryManagement.convertColorToHex = function(decimalColor) {
            var hexColor = decimalColor.toString(16);
            var lengthDiff = 6 - hexColor.length;
            var prefix = '#';
            if (lengthDiff > 0) {
                prefix += Array(lengthDiff + 1).join('0');
            }
            return (hexColor.indexOf('#') === -1) ? prefix + hexColor : hexColor;
        }

        var validateForm = function(isEdit) {
            var name = $scope.categoryName,
                time = $scope.categoryTime,
                color = $scope.categoryColor/*.toLowerCase()*/;
            $scope.categoryModalError = undefined;
            if (isEmpty(name)) {
                $scope.categoryModalError = 'Category name is required.';
            }
            else if (!isEdit && isNameTaken(name)) {
                $scope.categoryModalError = 'Category name already taken.';
            }
            else if (color === '#ffffff' || color === 'ffffff' || isEmpty(color)) {
                $scope.categoryModalError = 'Category color is required.';
            }
            return $scope.categoryModalError === undefined;
        }

        var isNameTaken = function(name) {
            var retVal = false;
            var cats = $cookies.getObject('categories');
            angular.forEach(cats, function(cat) {
                if (cat.label == name) {
                    retVal = true;
                }
            });
            return retVal;
        }

        return categoryManagement;
    }
}])

.factory('CategoryRESTService', function($resource) {
    return function(authHeader) {
        return {
            categories: $resource('http://api.stevedolan.me/events/:event_id/categories', {
                event_id: '@id'
            }, {
                get: {
                    method: 'GET',
                    headers: authHeader
                }
            }),
            new_category: $resource('http://api.stevedolan.me/events/:event_id/categories', {
                event_id: '@id'
            }, {
                create: {
                    method: 'POST',
                    headers: authHeader
                }
            }),
            category: $resource('http://api.stevedolan.me/categories/:id', {
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
            })
        }
    }
})

.directive('cngDroppableCategory', ['$cookies', function($cookies) {

    var link = function(scope, elem, attrs) {
        elem.droppable({
            drop: function(event, ui) {
                var droppedTeam = ui.draggable;
                var isTransferable = droppedTeam.data('isTransferable');
                if (false === isTransferable) {
                    droppedTeam.goBack();
                    return;
                }
                scope.itemId = droppedTeam.attr('itemId').trim();
                // TODO: make the draggables generic (perhaps in another module).
                scope.categoryId = event.target.getAttribute('category-id');
                //var alreadyExists = scope.checkCategory({categoryName: categoryName, teamId: teamId});
                scope.transferItemToCategory(scope.categoryId, scope.itemId);
                droppedTeam.goBack();
                if (/*!alreadyExists*/true) {
                    var categoryContainer = $(event.target).find('a');
                    performFlashAnimation(categoryContainer);
                    //scope.updateCategory({categoryId: categoryId, teamId: teamId});
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
        link: link
    }

}])

.directive('cngSpecialDroppableCategory', function() {

    var link = function(scope, elem, attrs) {
        elem.droppable({
            drop: function(event, ui) {
                var droppedItem = ui.draggable;
                scope.itemId = droppedItem.attr('itemId').trim();
                if ($(this).hasClass('destroy-special-category')) {
                    var confirm = window.confirm('Are you sure you want to destroy this team?');
                    if (confirm)
                        scope.deleteItem(scope.itemId);
                    else
                        droppedItem.goBack();
                }
                else if ($(this).hasClass('remove-special-category')) {
                    var confirm = window.confirm('Are you sure you want to remove this team?');
                    if (confirm)
                        scope.removeTeamFromCategory(scope.itemId);
                    else
                        droppedItem.goBack();
                }
            }
        });
    }

    return {
        restrict: 'A', 
        link: link
    }

});
