'use strict';

angular.module('liveJudgingAdmin.event', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
    $routeProvider.when('/event', {
        templateUrl: 'modules/event/event.html',
        controller: 'EventCtrl'
    }).when('/eventSelect', {
        templateUrl: 'modules/event/eventSelect.html',
        controller: 'EventSelectCtrl'
    }).when('/eventEdit', {
        templateUrl: 'modules/event/eventEdit.html',
        controller: 'EventEditCtrl'
    });
}])

.run(['sessionStorage', function(sessionStorage) {
    sessionStorage.put("event_view", undefined);
}])

.controller('EventSelectCtrl', ['sessionStorage', '$location', '$scope', 'CurrentUserService', 'EventService', 'EventUtilService',
    function(sessionStorage, $location, $scope, CurrentUserService, EventService, EventUtilService) {
        EventService(CurrentUserService.getAuthHeader()).events.get().$promise.then(function(resp) {
            console.log(resp);
            $scope.eventList = resp.events;
        }).catch(function(error) {
            console.log(error);
        });

        $scope.showCreateEventForm = function() {
            sessionStorage.remove('selected_event');
            $location.path('/eventEdit');
        }

        $scope.selectEvent = function(event) {
            sessionStorage.clearAllButUser();
            sessionStorage.putObject('selected_event', event);
            if (EventUtilService.isEventRunning(event)) {
                EventUtilService.setEventView(EventUtilService.views.EVENT_IN_PROGRESS_VIEW);
            } else {
                EventUtilService.setEventView(EventUtilService.views.EVENT_READY_VIEW);
            }
            $location.path('/event');
        };
    }
])

.controller('EventEditCtrl', ['sessionStorage', '$filter', '$location', '$scope', 'CurrentUserService', 'EventService', 'EventUtilService',
    function(sessionStorage, $filter, $location, $scope, CurrentUserService, EventService, EventUtilService) {
        $scope.isCreation = sessionStorage.getObject('selected_event') ? false : true;

        $scope.datePicker = {
            startOpened: false,
            endOpened: false
        };

        $scope.eventForm = {
            startTime: new Date(0, 0, 0, 12, 0),
            endTime: new Date(0, 0, 0, 12, 0)
        };

        $scope.saveEvent = function(eventForm) {
            addDateTimesToEvent(eventForm);

            var eventReq = {
                name: eventForm.name,
                location: eventForm.location,
                start_time: eventForm.startDateTime,
                end_time: eventForm.endDateTime
            }

            if ($scope.isCreation) {
                EventService(CurrentUserService.getAuthHeader()).events.create(eventReq).$promise.then(function(resp) {
                    sessionStorage.putObject('selected_event', resp.event);
                    EventUtilService.setEventView(EventUtilService.views.EVENT_READY_VIEW);
                    $location.path('/event');
                }).catch(function() {
                    $scope.errorMessage = 'Error creating event.';
                    console.log($scope.errorMessage);
                });
            } else {
                var eventId = sessionStorage.getObject('selected_event').id;
                EventService(CurrentUserService.getAuthHeader()).event.update({id: eventId}, eventReq).$promise.then(function(resp) {
                    sessionStorage.putObject('selected_event', resp.event);
                    $location.path('/event');
                }).catch(function() {
                    $scope.errorMessage = 'Error updating event.';
                    console.log($scope.errorMessage);
                });
            }
        };

        $scope.cancel = function() {
            if ($scope.isCreation) {
                $location.path('/eventSelect');
            } else {
                $location.path('/event');
            }
        };

        var resetEventForm = function(event) {
            $scope.eventForm = null;
            $scope.eventForm = {
                startTime: new Date(0, 0, 0, 12, 0),
                endTime: new Date(0, 0, 0, 12, 0)
            };
        };

        var loadEventForm = function(event) {
            $scope.eventForm = {
                name: event.name,
                location: event.location,
            };
            addDateTimesToForm(event);
        };

        // Takes the event JSON times (returned by the server) and
        // puts them into the event edit form controls.
        var addDateTimesToForm = function(event) {
            var start = new Date(Date.parse(event.start_time));
            var end = new Date(Date.parse(event.end_time));

            $scope.eventForm.startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
            $scope.eventForm.endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());

            if ($scope.eventForm.startDate != $scope.eventForm.endDate) {
                $scope.eventForm.isMultiDay = true;
            }

            $scope.eventForm.startTime = new Date(0, 0, 0, start.getHours(), start.getMinutes(), 0);
            $scope.eventForm.endTime = new Date(0, 0, 0, end.getHours(), end.getMinutes(), 0);
        };

        // Takes the data in event edit form controls
        // and translates them to a format that the server read.
        var addDateTimesToEvent = function(eventForm) {
            var startDate = eventForm.startDate;
            var endDate = (eventForm.isMultiDay && eventForm.endDate) ? eventForm.endDate : startDate;
            var startTime = eventForm.startTime;
            var endTime = eventForm.endTime;

            var startDateTime = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(),
                                         startTime.getHours(), startTime.getMinutes(), startTime.getSeconds());
            var endDateTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(),
                                       endTime.getHours(), endTime.getMinutes(), endTime.getSeconds());

            eventForm.startDateTime = $filter('date')(startDateTime, 'yyyy-MM-dd HH:mm:ss');
            eventForm.endDateTime = $filter('date')(endDateTime, 'yyyy-MM-dd HH:mm:ss');
        };

        $scope.toggleDatePicker = function($event, picker) {
            $event.preventDefault();
            $event.stopPropagation();

            if (picker === 'start') {
                $scope.datePicker.startOpened = !$scope.datePicker.startOpened;
            } else if (picker === 'end') {
                $scope.datePicker.endOpened = !$scope.datePicker.endOpened;
            }
            console.log($scope.eventForm);
        }

        if ($scope.isCreation) {
            resetEventForm();
        } else {
            loadEventForm(sessionStorage.getObject('selected_event'));
        }
    }
])

.controller('EventCtrl', ['sessionStorage', '$filter', '$location', '$rootScope', '$scope', 'CurrentUserService', 'EventService', 'EventUtilService', 'TeamStandingService',
    function(sessionStorage, $filter, $location, $rootScope, $scope, CurrentUserService, EventService, EventUtilService,
						 TeamStandingService) {

				var teamStandingService = TeamStandingService($scope);
				teamStandingService.init();

        $scope.event = {
            EVENT_READY_VIEW: EventUtilService.views.EVENT_READY_VIEW,
            EVENT_IN_PROGRESS_VIEW: EventUtilService.views.EVENT_IN_PROGRESS_VIEW,
            current_view: sessionStorage.get('event_view')
        };

				$scope.eventTabs = [{name: 'Judge Progress', id: 'judge-progress-tab', sectionId: 'judge-progress-section'},
														{name: 'Team Progress', id: 'team-progress-tab', sectionId: 'team-progress-section'},
														{name: 'Category Progress', id: 'category-progress-tab', sectionId: 'category-progress-section'},
														{name: 'Team Standing', id: 'team-standing-tab', sectionId: 'team-standing-section'}];

        $scope.getSelectedEvent = function() {
            return sessionStorage.getObject('selected_event');
        };

        $scope.editEvent = function() {
            $location.path('/eventEdit');
        };

        $scope.beginEvent = function() {
            var view = EventUtilService.views.EVENT_IN_PROGRESS_VIEW;
            sessionStorage.put('event_view', view);
            $scope.event.current_view = view;
            console.log("Event started.");
        };

        $scope.reveal_event_desc = function(desc) {
            $('#event-selection-desc').html('<strong>Event Description:</strong><br />' + desc).show();
        };

				$scope.rankNext3Categories = function() {
					var categoryInc = parseInt(sessionStorage.get('categoryInc')) + 3;
					var numCategories = $scope.categories.length;
					if (categoryInc > numCategories)
						sessionStorage.put('categoryInc', 0);
					else
						sessionStorage.put('categoryInc', categoryInc);
				}

        $scope.judge_list = ["Abe Lincoln", "George Washington", "Thomas Jefferson"]; // Contains names of judges, pulled from server
        $scope.recipient_list = []; // Contains list of judges to be notified
        $scope.project_list = ["Sample Project 1", "Sample Project 2"];

        $scope.times = [];
        for (var i = 1; i <= 12; i++) {
            for (var j = 0; j <= 45; j += 15) {
                if (j == 0) $scope.times.push(i + ":" + j + j);
                else $scope.times.push(i + ":" + j);
            }
        }

        // Decides whether an event is in progress or not whenever /event is hit.
        if (EventUtilService.isEventRunning($scope.getSelectedEvent())) {
            var view = EventUtilService.views.EVENT_IN_PROGRESS_VIEW;
        } else {
            var view = EventUtilService.views.EVENT_READY_VIEW;
        }
        sessionStorage.put('event_view', view);
        $scope.event.current_view = view;
    }
])

.factory('TeamStandingService', ['sessionStorage', 'CategoryManagementService',
	function(sessionStorage, CategoryManagementService) {
	return function($scope) {
		var service = {};

		service.init =  function() {
			var categoryManagementService = CategoryManagementService($scope);
			categoryManagementService.getCategories();

			$scope.$watch(function() {
				return sessionStorage.getObject('categories');
			}, function(newValue) {
				$scope.categories = newValue;
			}, true);

            $scope.$watch(function() {
                return sessionStorage.getObject('teams');
            }, function(newValue) {
                $scope.teams = newValue;
            }, true);

            $scope.$watch(function() {
                return sessionStorage.getObject('judges');
            }, function(newValue) {
                $scope.judges = newValue;
            }, true);

			sessionStorage.put('categoryInc', '0');
		}

		return service;
	}
}])

.factory('EventUtilService', function(sessionStorage) {
    var service = {
        views: {
            EVENT_EDIT_VIEW: "event_edit_view",
            EVENT_READY_VIEW: "event_ready_view",
            EVENT_IN_PROGRESS_VIEW: "event_in_progress_view",
        },
        getEventView: function() {
            sessionStorage.get('event_view');
        },
        setEventView: function(view) {
            sessionStorage.put('event_view', view);
        },
        isEventRunning: function(event) {
            var startDateTime = new Date(Date.parse(event.start_time));
            if (startDateTime <= Date()) {
                sessionStorage.put("event" + event.id + "_running", "true");
                return true;
            } else {
                return false;
            }
        }
    };

    return service;
})

.factory('EventService', function($resource, CurrentUserService) {
    return function(authHeader) {
        return {
            events: $resource('http://api.stevedolan.me/events', {}, {
                create: {
                    method: 'POST',
                    headers: authHeader
                },
                get: {
                    method: 'GET',
                    headers: authHeader
                }
            }),
            event: $resource('http://api.stevedolan.me/events/:id', {
                id: '@id'
            }, {
                get: {
                    method: 'GET',
                    headers: authHeader
                },
                update: {
                    method: 'PUT',
                    headers: authHeader
                }
            })
        }
    }
})

.filter('formatTab', function() {
	return function(tab) {
		var tabParts = tab.split('-');
		var tabName = tabParts[0] + ' ' + tabParts[1];
		tabName = tabName.toLocaleUpperCase();
		return tabName;
	}
})

.filter('filter3Categories', ['sessionStorage', function(sessionStorage) {
	return function(items) {
		return items.filter(function(element, index, array) {
			var start = parseInt(sessionStorage.get('categoryInc'));
			var end = start + 3;
			return index >= start && index < end;
		});
	}
}])

.directive('cngEventTab', function() {
	var link = function(scope, elem, attrs) {
		elem.bind('click', function() {
			var eventTabs = elem.parent().find('li');
			eventTabs.each(function() {
				if ($(this).hasClass('active')) {
					$(this).removeClass('active');
					var eventSection = '#' + $(this).attr('event-section');
					$(eventSection).hide();
				}
			});
			$(this).addClass('active');
			var eventSection = '#' + scope.eventSection;
			$(eventSection).show();
		});
	}
	return {
		restrict: 'A',
		scope: {
			eventSection: '@'
	  },
		link: link
	};
})

.directive('expandAllAccordions', function() {
  return {
    link: function(scope, elem, attrs) {
      $('.expand-all-accordions.judge').unbind().click(function() {
        $('.accordion-body.judge').collapse('show');
      });
      $('.expand-all-accordions.project').unbind().click(function() {
        $('.accordion-body.project').collapse('show');
      });
      $('.expand-all-accordions.category').unbind().click(function() {
        $('.accordion-body.category').collapse('show');
      });
    }
  }
})

.directive('collapseAllAccordions', function() {
  return {
    link: function(scope, elem, attrs) {
      $('.collapse-all-accordions.judge').unbind().click(function() {
        $('.accordion-body.judge').collapse('hide');
      });
      $('.collapse-all-accordions.project').unbind().click(function() {
        $('.accordion-body.project').collapse('hide');
      });
      $('.collapse-all-accordions.category').unbind().click(function() {
        $('.accordion-body.category').collapse('hide');
      });
    }
  }
})

.directive('changeAccordionChevron', function() {
  return {
        link: function(scope, elem, attrs) {
            $(".accordion-toggle").unbind().click(function(event) {
                var span = $(this).find("span");
                if (span.hasClass("glyphicon-chevron-right"))
                    span.removeClass("glyphicon-chevron-right").addClass("glyphicon-chevron-down");
                else
                    span.removeClass("glyphicon-chevron-down").addClass("glyphicon-chevron-right");
            });
        }
  };
})

.directive('notificationWidget', function() {

    var link = function(scope, elem, attrs) {
        /*
         * Initialize the Autocomplete Object for the Notification Modal
         */
        $("#judge_search").autocomplete({
            source: scope.judge_list,
            select: function(event, ui) {
                var recipient_name = ui.item.value;
                if (jQuery.inArray(recipient_name, scope.recipient_list) === -1)
                    create_new_judge_notification_object(recipient_name);
                $(this).val(""); // Clear input after selecting judge
                event.preventDefault();
            }
        });

        /*
         * Append an interactive DOM object above the Autocomplete Search Bar
         */
        function create_new_judge_notification_object(name) {
            var recipient_div = $("#recipients-div");
            recipient_div.append("<div class='recipient'>" + name +
                "&nbsp;&nbsp;<span class='glyphicon glyphicon-remove'></span></div>");
            scope.recipient_list.push(name);
            clear_all_checkbox.attr("checked", false);
            /* Add listener to dynamically created HTML element */
            $(".recipient .glyphicon.glyphicon-remove").click(function() {
                if ($(this).parent().html().indexOf(name) >= 0) {
                    /* Remove recipient from list if 'x' is clicked */
                    scope.recipient_list = scope.recipient_list.filter(function(elem) {
                         return elem != name;
                    });
                    /* Destroy HTML element */
                    $(this).parent().remove();
                    send_all_checkbox.attr("checked", false);
                }
            });
        }

        /*
         * Send to all judges Checkbox
         */
        var send_all_checkbox = $("#send-all-checkbox");
        send_all_checkbox.click(function() {
            if (!this.checked) return;
            for (var i = 0; i < scope.judge_list.length; i++) {
                var name = scope.judge_list[i];
                if (jQuery.inArray(name, scope.recipient_list) === -1)
                    create_new_judge_notification_object(name);
            }
            clear_all_checkbox.attr("checked", false);
        });

        /*
         * Clear all judges from receiving notification Checkbox
         */
        var clear_all_checkbox = $("#clear-all-checkbox");
        clear_all_checkbox.click(function() {
            if (!this.checked) return;
            /* Use listener defined in create_new_judge_notification_object() to destroy */
            $(".recipient .glyphicon.glyphicon-remove").click();
            scope.recipient_list.length = 0; // Clear recipient list
            send_all_checkbox.attr("checked", false);
        });
    }

  return {
        link: link
  };
})

.directive('dateWidget', function() {
    return {
        link: function(scope, elm, attrs) {
            $("#datepicker-start").datepicker();
            $("#datepicker-end").datepicker();
        }
  };
})

.directive('amPmWidget', function() {
    return {
        link: function(scope, elm, attrs) {
            $("#am-pm-start").bootstrapSwitch({
                onText: 'am',
                offText: 'pm'
            });
            $("#am-pm-end").bootstrapSwitch({
                onText: 'am',
                offText: 'pm'
            });
        }
  };
})

.directive('multiDayEventWidget', function() {
    return {
        link: function(scope, elem, attrs) {
            $("#multi-day-event-checkbox").click(function() {
                var optional_date_div = $("#end-date-optional");
                if (this.checked) {
                    optional_date_div.show();
                } else {
                    optional_date_div.hide();
                }
            });
        }
    };
});



