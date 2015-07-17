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
            console.log('Successfully retrieved events from server.');
            $scope.eventList = resp;
        }).catch(function(error) {
            sessionStorage.putObject('generalErrorMessage', 'Error getting events from server.');
            console.log('Error getting events from server.');
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
                    sessionStorage.putObject('selected_event', resp);
                    EventUtilService.setEventView(EventUtilService.views.EVENT_READY_VIEW);
                    $location.path('/event');
                }).catch(function() {
                    $scope.errorMessage = 'Error creating event.';
                    console.log($scope.errorMessage);
                });
            } else {
                var eventId = sessionStorage.getObject('selected_event').id;
                EventService(CurrentUserService.getAuthHeader()).event.update({id: eventId}, eventReq).$promise.then(function(resp) {
                    sessionStorage.putObject('selected_event', resp);
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
				
				$scope.recipientList = []; // Contains list of judges to be notified
        
        $scope.initRecipientList = function(judgeObj) {
					$scope.$broadcast('firstRecipientAdded', judgeObj.judge.name);
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

.factory('TeamStandingService', ['$q', 'sessionStorage', 'CategoryManagementService', 'CurrentUserService', 'JudgeManagementService', 'JudgmentRESTService', 'TeamManagementService',
	function($q, sessionStorage, CategoryManagementService, CurrentUserService, JudgeManagementService, JudgmentRESTService, TeamManagmentService) {
	return function($scope) {
      var authHeader = CurrentUserService.getAuthHeader();

		  var service = {};

		  service.init =  function() {
      var authHeader = CurrentUserService.getAuthHeader();
      var eventId = sessionStorage.getObject('selected_event').id;

			var categoryManagementService = CategoryManagementService($scope);
			categoryManagementService.getCategories();

      var teamManagmentService = TeamManagmentService($scope, sessionStorage);
      teamManagmentService.getTeams().then(function() {
          service.getJudgmentsOfAllTeams();
      });

      var judgeManagementService = JudgeManagementService($scope, sessionStorage);
      judgeManagementService.getJudges().then(function() {
          service.getJudgmentsByAllJudges();
      });

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

			$scope.$watch(function() {
					return sessionStorage.getObject('selected_event');
			}, function(newValue) {
					$scope.selectedEvent = newValue;
			}, true);

			sessionStorage.put('categoryInc', '0');
		}

        service.getJudgmentsByAllJudges = function() {
            var defer = $q.defer();

            var judges = sessionStorage.getObject('judges');
            var eventId = sessionStorage.getObject('selected_event').id;
            var promises = [];
            for (var i = 0; i < judges.length; i++) {
                promises.push(service.getJudgmentsByJudge(eventId, judges[i].id));
            }

            $q.all(promises).then(function(resp) {
                defer.resolve(resp);
            }).catch(function() {
                defer.reject();
                console.log('Error getting judgments by judge ids');
            });

            return defer.promise;
        }

        service.getJudgmentsByJudge = function(eventId, judgeId) {
            var defer = $q.defer();
            JudgmentRESTService(authHeader).judgments.getByJudge({event_id: eventId, judge_id: judgeId}).$promise.then(function(resp) {
                defer.resolve(resp);
            }).catch(function() {
                defer.reject();
            });

            return defer.promise;
        }

        service.getJudgmentsOfAllTeams = function() {
            var defer = $q.defer();

            var teams = sessionStorage.getObject('teams');
            var eventId = sessionStorage.getObject('selected_event').id;
            var promises = [];
            for (var i = 0; i < teams.length; i++) {
                promises.push(service.getJudgmentsOfTeam(eventId, teams[i].id));
            }

            $q.all(promises).then(function(resp) {
                defer.resolve(resp);
            }).catch(function() {
                defer.reject();
                console.log('Error getting judgments by team ids');
            });

            return defer.promise;
        }

        service.getJudgmentsOfTeam = function(eventId, teamId) {
            var defer = $q.defer();
            JudgmentRESTService(authHeader).judgments.getByTeam({event_id: eventId, team_id: teamId}).$promise.then(function(resp) {
                defer.resolve(resp);
            }).catch(function() {
                defer.reject();
            });

            return defer.promise;
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
										isArray: true,
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

.factory('JudgmentRESTService', function($resource) {
    return function(authHeader) {
        return {
            judgments: $resource('http://api.stevedolan.me/events/:event_id/judgments', {
                event_id: '@id'
            }, {
                get: {
                    method: 'GET',
                    isArray: true,
                    headers: authHeader
                },
                getByJudge: {
                    method: 'GET',
                    params: {judge_id: '@judgeId'},
                    isArray: true,
                    headers: authHeader
                },
                getByTeam: {
                    method: 'GET',
                    params: {team_id: '@teamId'},
                    isArray: true,
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

.directive('notificationModal', ['sessionStorage', function(sessionStorage) {

    var link = function(scope, elem, attrs) {
        /*
         * Initialize the Autocomplete Object for the Notification Modal
         */
        scope.$watch(function() {
          return sessionStorage.getObject('judges');   
        }, function(newJudgeList) {
          if (newJudgeList) { 
						scope.judges = newJudgeList;
            updateAutoComplete();
					}
        }, true);
			
				scope.$on('firstRecipientAdded', function (event, data) {
					if (data)
						create_new_judge_notification_object(data);
				});

        var updateAutoComplete = function() {
					var input = $('#judge-search');
          var judgeNames = parseJudgeNames();
					
					if (input.data('ui-autocomplete') === undefined) {
						input.autocomplete({
								source: judgeNames,
								select: function(event, ui) {
										var recipient_name = ui.item.value;
										if (jQuery.inArray(recipient_name, scope.recipientList) === -1) {
												create_new_judge_notification_object(recipient_name);
										}
										$(this).val(''); // Clear input after selecting judge
										event.preventDefault();
								}
						});
					} else {
						input.autocomplete('option', 'source', judgeNames); // Update autocomplete source	
					}
        }
        
        var parseJudgeNames = function() {
          var judgeNames = [];
          angular.forEach(scope.judges, function(judgeObj) {
            judgeNames.push(judgeObj.judge.name);
          });
          return judgeNames;
        }

        /*
         * Append an interactive DOM object above the Autocomplete Search Bar
         */
        function create_new_judge_notification_object(name) {
						scope.recipientList.push(name);
            var recipient_div = $("#recipients-div");
            recipient_div.append("<div class='recipient'>" + name +
                "&nbsp;&nbsp;<span class='glyphicon glyphicon-remove'></span></div>");
            clear_all_checkbox.attr("checked", false);
            /* Add listener to dynamically created HTML element */
            $(".recipient .glyphicon.glyphicon-remove").click(function() {
                if ($(this).parent().html().indexOf(name) >= 0) {
                    /* Remove recipient from list if 'x' is clicked */
                    scope.recipientList = scope.recipientList.filter(function(elem) {
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
            for (var i = 0; i < scope.judges.length; i++) {
                var name = scope.judges[i].judge.name;
                if (jQuery.inArray(name, scope.recipientList) === -1)
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
            scope.recipientList.length = 0; // Clear recipient list
            send_all_checkbox.attr("checked", false);
        });
				
				// Clear recipient objects upon modal close
				elem.find('#cancel-notification-btn').click(function() {
					clear_all_checkbox.click();
					scope.recipientList = [];
				});
    }

  return {
    restrict: 'A',
		scope: {
			recipientList: '='
		},
    link: link
  };
}])

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



