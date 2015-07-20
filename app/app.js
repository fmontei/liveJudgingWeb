'use strict';

// Declare app level module which depends on views, and components
angular.module('liveJudgingAdmin', [
  'base64',
  'ngResource',
  'ngRoute',
  'ui.bootstrap',
  'liveJudgingAdmin.login',
  'liveJudgingAdmin.event',
  'liveJudgingAdmin.teams',
  'liveJudgingAdmin.judges',
  'liveJudgingAdmin.rubrics',
  'liveJudgingAdmin.categories',
  'liveJudgingAdmin.settings',
  'liveJudgingAdmin.notifications'
])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.otherwise({redirectTo: '/login'});
}])

.run(function($rootScope, $location, CurrentUserService) {
  $rootScope.$on('routeChangeStart', function() {
    console.log(CurrentUserService.isLoggedIn());
    if (CurrentUserService.isLoggedIn()) {
      $location.path('/event');
    }
  });
  
  $rootScope.hints = new Object();
  $rootScope.hints['beginEvent'] = {'content': 'Click to begin event. <u>Important:</u> Event end time & date must not be expired.', 'placement': 'bottom', 'enabled': false};
  $rootScope.hints['mainHeading'] = {'content': 'Default view. Click category to see category view, then click here to return to default view.', 'placement': 'bottom', 'enabled': false};
  $rootScope.hints['catHeading'] = {'content': 'Category View. Click here to return to default view.', 'placement': 'bottom', 'enabled': false};
  $rootScope.hints['addTeam'] = {'content': '1) Click here to add a team to this event.', 'placement': 'right', 'enabled': false};
  $rootScope.hints['addTeamCategory'] = {'content': '1) Click here to add a team to this category.', 'placement': 'right', 'enabled': false};
  $rootScope.hints['addJudge'] = {'content': '1) Click here to add a judge to this event.', 'placement': 'right', 'enabled': false};
  $rootScope.hints['addJudgeCategory'] = {'content': '1) Click here to add a judge to this category.', 'placement': 'right', 'enabled': false};
  $rootScope.hints['addRubric'] = {'content': '1) Click here to add a rubric to this event.', 'placement': 'right', 'enabled': false};
  $rootScope.hints['addRubricCategory'] = {'content': '1) Click here to add a rubric to this category.', 'placement': 'right', 'enabled': false};
  $rootScope.hints['addCategory'] = {'content': '2) Click here to add a category to this event.', 'placement': 'bottom', 'enabled': false};
  $rootScope.hints['dragItem'] = {'content': '3) Drag these items over to the right &rarr;', 'placement': 'bottom', 'enabled': false};
  $rootScope.hints['destroyItem'] = {'content': '4a) Drop item here to permanently delete it from this event.', 'placement': 'bottom', 'enabled': false};
  $rootScope.hints['removeItem'] = {'content': '4b) Drop item here to remove it from selected category.', 'placement': 'bottom', 'enabled': false};
  $rootScope.hints['uncategorized'] = {'content': 'Uncategorized items. Cannot interact with.', 'placement': 'bottom', 'enabled': false};
  $rootScope.hints['category'] = {'content': '5) Drop item here to add to category. Click to see details. Click cog to edit.', 'placement': 'bottom', 'enabled': false};
  $rootScope.hints['organize'] = {'content': 'Organize out-of-place items.', 'placement': 'bottom', 'enabled': false};
  $rootScope.hints['notify'] = {'content': 'Send notification to judges.', 'placement': 'right', 'enabled': false};
  $rootScope.enableButtonText = 'Enable Hints';
  $rootScope.enableHints = function() {
    angular.forEach($rootScope.hints, function(hint) {
      hint.enabled = !hint.enabled;
    });
    if ($rootScope.enableButtonText === 'Enable Hints')
      $rootScope.enableButtonText = 'Disable Hints';
    else if ($rootScope.enableButtonText === 'Disable Hints')
      $rootScope.enableButtonText = 'Enable Hints';
  }
  $rootScope.disableHints = function() {
    angular.forEach($rootScope.hints, function(hint) {
      hint.enabled = false;
    });
    $rootScope.enableButtonText = 'Enable Hints';
  }
})

.controller('MainCtrl', ['sessionStorage',
                         '$location',
                         '$rootScope',
                         '$route',
                         '$routeParams',
                         '$scope',
                         'CurrentUserService',
                         'LogoutService',
    function(sessionStorage, $location, $rootScope, $route, $routeParams, $scope, CurrentUserService, LogoutService) {
        $scope.$on('$routeChangeSuccess', function() {
            $scope.currentPath = $location.path();
        });

    $scope.$on('$locationChangeStart', function(event, next, current) {
      if ($location.path() !== '/login' && !sessionStorage.getObject('current_user')) {
        event.preventDefault();
        // Occassionally preventDefault() would
        // still allow part of the page to load.
        $location.path('/login');
      }
    });

    // Used to determine if the sidebar should be hidden.
    $scope.isDashboard = function() {
      if ($scope.currentPath === '/login' || $scope.currentPath === '/eventSelect' || !sessionStorage.get('selected_event')) {
        return false;
      }
      return true;
    }

    $scope.$on('loggedIn', function() {
      $scope.user = CurrentUserService.getCurrentUser();
    });

    $scope.$watch(function() {
      return CurrentUserService.getCurrentUser();
    }, function(newVal, oldVal) {
      $scope.user = newVal;
    });

    $scope.logout = CurrentUserService.logout;
}])

.factory('sessionStorage', ['$window',
  function($window) {
    var sessionStorage = {};

    sessionStorage.putObject = function(key, value) {
      var stringValue = JSON.stringify(value);
      $window.sessionStorage.setItem(key, stringValue);
    }

    sessionStorage.put = function(key, value) {
      $window.sessionStorage.setItem(key, value);
    }

    sessionStorage.getObject = function(key) {
      var stringValue = $window.sessionStorage.getItem(key);
      if (stringValue == "undefined") {
        return undefined;
      }
      return JSON.parse(stringValue);
    }

    sessionStorage.get = function(key) {
      return $window.sessionStorage.getItem(key);
    }

    sessionStorage.remove = function(key) {
      $window.sessionStorage.removeItem(key);
    }

    sessionStorage.clear = function() {
      $window.sessionStorage.clear();
    }

    sessionStorage.clearAllButUser = function() {
        var user = sessionStorage.getObject('current_user');
        sessionStorage.clear();
        sessionStorage.putObject('current_user', user);
    }

    return sessionStorage;
  }
])

.directive('cngWrapWord', function() {
    return {
        restrict: 'A', 
        scope: {
            word: '@word',
            lineWidth: '@lineWidth',
            totalWidth: '@totalWidth'
        },
        link: function(scope, elem, attrs) {
            var wrappedWord = '';
            for (var i = 0; i < scope.word.length; i++) {
                if (i < scope.totalWidth) {
                    wrappedWord += scope.word.charAt(i);
                    if (i !== 0 && i % scope.lineWidth === 0)
                        wrappedWord += '-<br />';
                } else {
                    wrappedWord += '...'; 
                    break;
                }
            }
            elem.html(wrappedWord);
        }
    }
})

.directive('cngDraggableItem', ['$timeout', function($timeout) { 

    return {
        restrict: 'A',
        scope: {
            cog: '@',
            isTransferable: '@isTransferable'
        },
        link: function(scope, elem, attrs) {
            elem.data('isTransferable', scope.isTransferable === 'true');
          
            elem.draggable({
                appendTo: 'body',
								containment: 'document',
                cursor: 'grab',
                start: function(event, ui) {
										$(this).css('zIndex', '100');
										$(this).draggable('option', 'cursorAt', {
											left: Math.floor(ui.helper.width() / 2),
											top: Math.floor(ui.helper.height() / 2)
										}); 
                },
                stop: function(event, ui) {
                  $('[cng-draggable-item]').each(function() {
                    $(this).css('zIndex', '1');
                  });
                  $(this).css('zIndex', '2');
                }
            });

            var cog = elem.find(scope.cog);
            var timeout = null;
          
            elem.bind('mouseenter', function() {
              cog.show();
							elem.data('isDragged', true).trigger('changeDragged'); 
						});
          
						elem.bind('mouseleave', function() {
              cog.hide();
							elem.data('isDragged', false).trigger('changeDragged'); 
						});
          
            elem.on('changeDragged', function() {
              if (!elem.data('isDragged'))
                timeout = setTimeout(function() {elem.goBack()}, 3000);
              else if (elem.data('isDragged') && timeout !== null)
                clearTimeout(timeout);
            });

            $.fn.goBack = function() {
              if ($(this).is('[cng-draggable-item]')) {
                $(this).animate({
                    'left': '0px',
                    'top': '0px'
                }, 500);
              }
            }
        }
    }

}])

.directive('cngOrganizeItems', function() {
    return {
        restrict: 'A',
        link: function(scope, elem, attrs) {
            elem.bind('click', function() {
                $('[cng-draggable-item]').each(function() {
                    $(this).goBack();
                });
            });
        }
    }
})

.directive('generalErrorMessage', ['$timeout', 'sessionStorage', function($timeout, sessionStorage) {
	return {
		restrict: 'A',
		scope: {
			animate: '@animate',
			color: '@color'
		},
		link: function(scope, elem, attrs) {
			elem.css('float', 'right');
			elem.css('color', scope.color);
			scope.$watch(function() {
				return sessionStorage.get('generalErrorMessage');
			}, function(newValue) {
				if (scope.animate == 'true') {
                  if (newValue !== '') {
                    elem.html(newValue);  
                    $timeout(function() {
                      elem.html('');
                      sessionStorage.put('generalErrorMessage', '');
                    }, 5000);
                  }
                } else {
                    elem.html(newValue);	
                }
			}, true);
		}
	}
}])

.directive('customPopover', function() {
  return {
    restrict: 'A',
    scope: {
      popoverContent: '@',
      popoverPlacement: '@',
      popoverToggle: '@',
			popoverLimit: '@'
    },
    link: function(scope, elem, attrs) {
			if (scope.popoverLimit !== undefined && scope.popoverLimit == 'false')
				return;
      elem.popover({
        animation: true,
        content: scope.popoverContent,
        html: true,
        placement: scope.popoverPlacement,
        trigger: 'manual'
      });
      elem.bind('mouseover', function() {
        scope.$apply();
        elem.popover('hide');
      });
      scope.$watch(function() {
        return scope.popoverToggle;
      }, function(newValue) {
        if (newValue == 'true') {
          elem.popover('show');
        } else if (newValue == 'false')
          elem.popover('hide');
      });
    }
  }
});
