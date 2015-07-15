'use strict';

angular.module('liveJudgingAdmin.categories', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/categories', {
    templateUrl: 'modules/categories/categories.html',
    controller: 'CategoriesCtrl'
  });
}])

.controller('CategoriesCtrl', ['$q', 'sessionStorage', '$location', '$scope', 'CategoryManagementService', 'CatWatchService',
                               'JudgeManagementService', 'TeamManagementService', 'RubricManagementService',
    function($q, sessionStorage, $location, $scope, CategoryManagementService, CatWatchService, JudgeManagementService,
             TeamManagementService, RubricManagementService) {

        var catWatchService = CatWatchService(sessionStorage, $scope);
        catWatchService.init();

        var categoryManagementService = CategoryManagementService($scope);
        categoryManagementService.getCategories();

        var teamManagementService = TeamManagementService($scope, sessionStorage);
        var judgeManagementService = JudgeManagementService($scope, sessionStorage);
              var rubricManagementService = RubricManagementService($scope, sessionStorage);

        $scope.createNewCategory = function() {
            categoryManagementService.createNewCategory();
        }

        $scope.editSelectedCategory = function() {
            categoryManagementService.editCategory();
        }

        $scope.deleteCategory = function() {
            categoryManagementService.deleteCategory();
        }

        $scope.deleteItem = function(itemId, item) {
            var defer = $q.defer();
            if ($location.path().indexOf('teams') !== -1) {
                var team = teamManagementService.getTeamByID(parseInt(itemId));
                sessionStorage.putObject('selectedTeam', team);
                teamManagementService.deleteTeam().then(function(wasSuccessful) {
                    defer.resolve(wasSuccessful);
                });
            } else if ($location.path().indexOf('judges') !== -1) {
                judgeManagementService.deleteJudge(itemId).then(function(wasSuccessful) {
                    defer.resolve(wasSuccessful);
                });
            }
            return defer.promise;
        }

        $scope.removeItemFromCategory = function(itemId) {
            var categoryId = $scope.selectedCategory.id;
            if ($location.path().indexOf('teams') !== -1) {
              categoryManagementService.removeTeamFromCategory(itemId, categoryId);
            } else if ($location.path().indexOf('judges') !== -1) {
              //
            }
        }

        $scope.changeCategoryModalView = function(view, event, category) {
            $scope.categoryModalView = view;
            $scope.openCategoryModal();
            if (view === 'edit') {
                $scope.updateStoredCategory(category);
                $scope.populateCategoryModal(category);
                event.stopPropagation();
            }
        }

        $scope.populateCategoryModal = function(category) {
            $scope.categoryID = category.id;
            $scope.categoryName = category.label;
            $scope.categoryDesc = category.description;
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
        }

        $scope.updateStoredCategory = function(category) {
            if (category) {
                sessionStorage.putObject('selectedCategory', category);
            } else {
                sessionStorage.remove('selectedCategory');
            }
        }

        $scope.transferItemToCategory = function(categoryId, itemId) {
            if ($location.path().indexOf('teams') !== -1) {
                categoryManagementService.transferTeamToCategory(categoryId, itemId);
            } else if ($location.path().indexOf('judges') !== -1) {
                judgeManagementService.openAssignByCatModal(categoryId, itemId);
            }
        }

        $scope.viewCategoryDetails = function(cat) {
            $scope.updateStoredCategory(cat);
            if ($location.path().indexOf('teams') !== -1) {
                teamManagementService.changeView('selectedCategory');
            } else if ($location.path().indexOf('judges') !== -1) {
                judgeManagementService.changeView('selectedCategory');
            } else if ($location.path().indexOf('rubrics') !== -1) {
                rubricManagementService.changeView('selectedCategory');
            }
        }
    }
])

.factory('CatWatchService', ['$location', 'CategoryManagementService', 
				 function($location, CategoryManagementService) {
    return function(sessionStorage, $scope) {
        var categoryManagementService = CategoryManagementService($scope);
        var service = {};

        service.init = function() {
            var defaultColorList = categoryManagementService.getDefaultColors();
            sessionStorage.putObject('colorList', defaultColorList);
            sessionStorage.putObject('defaultColorList', defaultColorList);

            $scope.$watch(function() {
                return sessionStorage.getObject('categories');
            }, function(newValue) {
                $scope.categories = newValue;
            }, true);

            $scope.$watch(function() {
                return sessionStorage.getObject('uncategorized');
            }, function(newValue) {
                $scope.uncategorized = newValue;
            }, true);

            $scope.$watch(function() {
                if ($location.path().indexOf('teams') !== -1) {
                    return sessionStorage.get('teamView');
                } else if ($location.path().indexOf('judges') !== -1) {
                    return sessionStorage.get('judgeView');
                } else if ($location.path().indexOf('rubrics') !== -1) {
                    return sessionStorage.get('rubricView');
                }
            }, function(newValue) {
                $scope.currentView = newValue;
            }, true);

            $scope.$watch(function() {
                return sessionStorage.getObject('colorList');
            }, function(newValue) {
                $scope.colorList = JSON.stringify(newValue);
            }, true);
        };

        return service;
    }
}])

.factory('CategoryManagementService', ['sessionStorage', '$log', '$q', 'CategoryRESTService', 'CurrentUserService', 'TeamRESTService',
    function(sessionStorage, $log, $q, CategoryRESTService, CurrentUserService, TeamRESTService) {
    return function($scope) {
        var authHeader = CurrentUserService.getAuthHeader();
        var eventId = sessionStorage.getObject('selected_event').id;

        var categoryManagement = {};

        categoryManagement.getCategories = function() {
            var defer = $q.defer();

            CategoryRESTService(authHeader).categories.get({event_id: eventId}).$promise.then(function(resp) {
                var filteredColorList = categoryManagement.getDefaultColors();
                sessionStorage.putObject('defaultColorList', filteredColorList);
                angular.forEach(resp, function(category) {
                    if (category.label === 'Uncategorized') {
                        category.color = '#BBBBBB';
                        sessionStorage.putObject('uncategorized', category);
                    }
                    category.color = convertColorToHex(category.color);
                    filterColorFromList(filteredColorList, category.color);
                });
                sessionStorage.putObject('categories', resp);
                sessionStorage.putObject('colorList', filteredColorList);
                // Updating selected category if there is one.
                if (sessionStorage.getObject('selectedCategory')) {
                    for (var i = 0; i < resp.length; i++) {
                        if (sessionStorage.getObject('selectedCategory').id == resp[i].id) {
                            sessionStorage.putObject('selectedCategory', resp[i]);
                        }
                    }
                }
                defer.resolve();
            }).catch(function() {
                sessionStorage.put('generalErrorMessage', 'Error getting categories.');
                console.log('Error getting categories.');
                defer.reject();
            });

            return defer.promise;
        };

        categoryManagement.createNewCategory = function() {
            if (!validateForm(false)) {
                return;
            }
            var newCategory = {
                name: $scope.categoryName.trim(),
                desc: ($scope.categoryDesc === undefined) ? '' : $scope.categoryDesc.trim(),
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
                var returnedCategoryID = resp.id;
                newCategory.id = returnedCategoryID;
                resp.color = convertColorToHex(resp.color);
                // Save category objects in session storage.
                var currentCats = sessionStorage.getObject('categories');
                if (currentCats) {
                    currentCats.push(resp);
                    sessionStorage.putObject('categories', currentCats);
                } else {
                    sessionStorage.putObject('categories', resp);
                }
                $scope.closeCategoryModal();
                $log.log("New category created: " + JSON.stringify(newCategory));
                $log.log("Category list updated: " + sessionStorage.getObject('categories').length);
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
                sessionStorage.put('generalErrorMessage', 'Error editing category on server.');
                $log.log('Error editing category on server.');
            });
        }

        categoryManagement.deleteCategory = function() {
            var defer = $q.defer();

            var catId = sessionStorage.getObject('selectedCategory').id;
            var connection = CategoryRESTService(authHeader);

            // Get teams currently in category (used to check if any should be
            // put into uncategorized).
            categoryManagement.getTeamsInCategory(catId).then(function(resp) {
                var teamsInCat = resp;

                // THEN delete the category.
                connection.category.delete({id: catId}).$promise.then(function(resp) {
                    var cats = sessionStorage.getObject('categories');
                    for (var i = 0; i < cats.length; i++) {
                        if (cats[i].id == catId) {
                            cats.splice(i, 1);
                            break;
                        }
                    }
                    sessionStorage.putObject('categories', cats);
                    $scope.closeCategoryModal();
                    $log.log('Successfully deleted category.');
                    categoryManagement.checkForUncategorizedTeams(teamsInCat);
                    defer.resolve();
                }).catch(function() {
                    $scope.errorMessage = 'Error deleting category.';
                    $log.log($scope.errorMessage);
                    defer.reject();
                });
            }).catch(function() {
                $scope.errorMessage = 'Error deleting category.';
                console.log($scope.errorMessage);

                defer.reject();
            }).finally(function() {
                sessionStorage.remove('selectedCategory');
            });

            return defer.promise;
        }

        categoryManagement.getTeamsInCategory = function(categoryId) {
            var defer = $q.defer();

            var catRESTService = CategoryRESTService(authHeader);
            catRESTService.category.get({id: categoryId}).$promise.then(function(resp) {
                console.log(resp);
                defer.resolve(resp.teams);
            }).catch(function() {
                console.log('Error getting teams in category ' + categoryId);
                defer.reject('Error getting teams in category');
            });

            return defer.promise;
        }

        categoryManagement.getCategoriesInTeam = function(teamId) {
            var defer = $q.defer();

            var teamRESTService = TeamRESTService(authHeader);
            teamRESTService.team_categories.get({team_id: teamId}).$promise.then(function(resp) {
                defer.resolve(resp);
            }).catch(function() {
                defer.reject('Error getting categories in team.');
            });

            return defer.promise;
        }

        categoryManagement.getCategoryById = function(categoryId) {
            var cats = sessionStorage.getObject('categories');
            for (var i = 0; i < cats.length; i++) {
                if (cats[i].id == categoryId) {
                    return cats[i];
                }
            }
            return null;
        }

        categoryManagement.transferTeamToCategory = function(categoryId, teamId, isDragNDrop) {
            // If isDrapNDrop is false, that means we don't have to
            // worry about closing a modal.
            var connection = TeamRESTService(authHeader);
            var req = {category_id: categoryId};
            connection.team_categories.add_team({team_id: teamId}, req).$promise.then(function(resp) {
                if (sessionStorage.getObject('uncategorized').id != categoryId) {
                    categoryManagement.isTeamAlreadyInCategory(teamId, sessionStorage.getObject('uncategorized').id).then(function(resp) {
                        if (resp) {
                            categoryManagement.removeTeamFromUncategorized(teamId);
                        }
                    });
                }
                // Update the category view
                categoryManagement.getCategories();
                if (!isDragNDrop) {
                    $scope.closeTeamModal();
                }
                $log.log("Added team #" + teamId + " to category " + resp.category.label + ".");
            }).catch(function() {
                sessionStorage.put('generalErrorMessage', 'Error transferring team to category.');
                $scope.error = 'Error transferring team to category.';
            });
        }

        categoryManagement.removeTeamFromUncategorized = function(teamId) {
            var uncatId = sessionStorage.getObject('uncategorized').id;
            categoryManagement.removeTeamFromCategory(teamId, uncatId);
        }

        categoryManagement.addTeamToUncategorized = function(teamId) {
            var uncatId = sessionStorage.getObject('uncategorized').id;
            categoryManagement.transferTeamToCategory(uncatId, teamId, false);
        }

        categoryManagement.removeTeamFromCategory = function(teamId, categoryId) {
            var connection = TeamRESTService(authHeader);
            connection.team_categories.remove_team({team_id: teamId, category_id: categoryId}).$promise.then(function(resp) {
                categoryManagement.getCategories().then(function() {
                    categoryManagement.checkForUncategorizedTeam(teamId);
                });
            });
        }

        categoryManagement.checkForUncategorizedTeam = function(teamId) {
            categoryManagement.getCategoriesInTeam(teamId).then(function(resp) {
                if (resp.length == 0) {
                    categoryManagement.addTeamToUncategorized(teamId);
                }
            });
        }

        categoryManagement.checkForUncategorizedTeams = function(teams) {
            for (var i = 0; i < teams.length; i++) {
                categoryManagement.checkForUncategorizedTeam(teams[i].id);
            }
        }

        categoryManagement.isTeamAlreadyInCategory = function(teamId, categoryId) {
            var defer = $q.defer();

            categoryManagement.getTeamsInCategory(categoryId).then(function(teamsInCat) {
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

        var isEmpty = function(str) {
            return (!str || 0 === str.length);
        }

        var convertColorToDecimal = function(hexColor) {
            hexColor = hexColor.substring(1, hexColor.length);
            return parseInt(hexColor, 16);
        }

        var convertColorToHex = function(decimalColor) {
            var hexColor = decimalColor.toString(16);
            var lengthDiff = 6 - hexColor.length;
            var prefix = '#';
            if (lengthDiff > 0) {
                prefix += Array(lengthDiff + 1).join('0');
            }
            return (hexColor.indexOf('#') === -1) ? prefix + hexColor : hexColor;
        }

        var filterColorFromList = function(list, color) {
            color = color.toUpperCase();
            if (color.indexOf('#') !== -1)
                color = color.slice(color.indexOf('#') + 1);
            if (list.indexOf(color) !== -1)
                list.splice(list.indexOf(color), 1);
        }

        var validateForm = function(isEdit) {
            var name = $scope.categoryName,
                time = $scope.categoryTime,
                color = $scope.categoryColor;
            $scope.categoryModalError = null;
            if (isEmpty(name)) {
                $scope.categoryModalError = 'Category name is required.';
            } else if (isNameTaken(name.trim())) {
                $scope.categoryModalError = 'Category name already taken.';
            } else if (color === '#ffffff' || color === 'ffffff' || isEmpty(color)) {
                $scope.categoryModalError = 'Category color is required.';
            }
            return $scope.categoryModalError === null;
        }

        var isNameTaken = function(name) {
            var retVal = false;
            var cats = sessionStorage.getObject('categories');
            angular.forEach(cats, function(cat) {
                if (cat.label === name && $scope.selectedCategory.label !== cat.label) {
                    retVal = true;
                }
            });
            return retVal;
        }

        categoryManagement.getDefaultColors = function() {
            var defaultColorList = ['EB9F9F', 'D82F32', 'E97F02', 'F8CA00', 'AEE239', '60B99A', '83E874', '4DEBAE',
                'F5634A', 'B38184', 'CCFC8E', 'BB9CF8', 'D2A6E0', '85D7F2', '91A0DB', 'C65DE3', 'E3CCE6', 'FAF7A2', 'CCB397'];
            return defaultColorList;
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
										isArray: true,
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

.directive('cngDroppableCategory', ['sessionStorage', function(sessionStorage) {

    var link = function(scope, elem, attrs) {
        elem.droppable({
            drop: function(event, ui) {
                var droppedItem = ui.draggable;
                var isTransferable = droppedItem.data('isTransferable');
                if (isTransferable === false) {
                    droppedItem.goBack();
                    return;
                }
                scope.itemId = droppedItem.attr('item-id').trim();
                scope.categoryId = event.target.getAttribute('category-id');
                scope.transferItemToCategory(scope.categoryId, scope.itemId);
                droppedItem.goBack();
                var categoryContainer = $(event.target).find('a');
                performFlashAnimation(categoryContainer);
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
                scope.itemId = droppedItem.attr('item-id').trim();
                scope.itemType = droppedItem.attr('item-type').trim();
                if ($(this).hasClass('destroy-special-category')) {
                    var confirm = window.confirm('Are you sure you want to destroy this ' + scope.itemType + '?\n' +
                                                 'The ' + scope.itemType + ' will be deleted and removed from all categories.');
                    if (confirm) {
                        scope.deleteItem({itemId: scope.itemId}).then(function(wasSuccessful) {
                            if (wasSuccessful === false)
                                droppedItem.goBack();
                        });
                    }
                    else
                        droppedItem.goBack();
                }
                else if ($(this).hasClass('remove-special-category')) {
                    var confirm = window.confirm('Are you sure you want to remove this '
                                                 + scope.itemType + ' from current category?');
                    if (confirm)
                        scope.removeItem({itemId: scope.itemId});
                    else
                        droppedItem.goBack();
                }
            }
        });
    }

    return {
        restrict: 'A',
        scope: {
            deleteItem: '&',
            removeItem: '&'
        },
        link: link
    }

})

.directive('cngColorPicker', function() {

    var link = function(scope, elem, attrs) {

        // When colors array changes, update color palette
        scope.$watch(function() {
            return scope.colorList;
        }, function(newValue) {
            $('.colorPicker-picker').remove(); // Delete the old palette
            elem.colorPicker({colors: JSON.parse(newValue)}); // Create a new palette
        });

        scope.$watch('color', function(value) {
            elem.val(value);
            elem.change();
        });
    }

    return {
        restrict: 'A',
        require: '^ngModel',
        scope: {
            color: '@color',
            colorList: '@colorList'
        },
        link: link
    };

});
