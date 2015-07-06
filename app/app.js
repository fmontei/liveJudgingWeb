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
  'liveJudgingAdmin.settings'
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
  })
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
      return JSON.parse(stringValue);
    }

    sessionStorage.get = function(key) {
      return $window.sessionStorage.getItem(key);
    }
		
		sessionStorage.remove = function(key) {
			$window.sessionStorage.removeItem(key);
		}

    sessionStorage.clear = function() {
      return $window.sessionStorage.clear();
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

.directive('cngDraggableItem', [function() { 

	return {
		restrict: 'A',
		scope: {
			cog: '@',
			itemId: '=itemId',
			isTransferable: '@isTransferable'
		},
		link: function(scope, elem, attrs) {
			elem.data('isTransferable', scope.isTransferable === 'true');
			elem.draggable({
				cursor: 'grab',
				start: function(event, ui) {
					$(this).css('zIndex', '100');
					scope.itemId = ui.helper.context.attributes.itemId.nodeValue;
					if (undefined === elem.data('originalPosition')) {
						elem.data('originalPosition', elem.offset());
					}
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
			elem.bind('mouseenter', function() {
				cog.show();
			});

			elem.bind('mouseleave', function() {
				cog.hide();
			});

			$.fn.goBack = function() {
				if ($(this).is('[cng-draggable-item]')) {
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

.directive('cngOrganizeItems', function() {
	return {
		restrict: 'A',
		link: function(scope, elem, attrs) {
			elem.bind('click', function() {
				$('[cng-draggable-item]').each(function() {
					if (undefined !== $(this).data('originalPosition'))
						$(this).goBack();
				});
			});
		}
	}
});
