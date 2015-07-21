'use strict';

angular.module('liveJudgingAdmin.event', ['ngRoute', 'ngProgress'])

.config(['$routeProvider', function($routeProvider) {
	$routeProvider.when('/eventLoading', {
		templateUrl: 'modules/event/eventLoading.html',
		controller: 'EventLoadingCtrl'
	}).when('/event', {
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

.run(['EventUtilService', 'sessionStorage', function(EventUtilService, sessionStorage) {
	if (EventUtilService.isEventRunning(sessionStorage.getObject('selected_event'))) {
		sessionStorage.put('event_view', EventUtilService.views.EVENT_IN_PROGRESS_VIEW);
	} else {
		sessionStorage.put('event_view', EventUtilService.views.EVENT_READY_VIEW);
	}
}])

.controller('EventSelectCtrl', ['sessionStorage', '$location', '$scope', 'CurrentUserService', 'EventRESTService', 'EventUtilService',
	function(sessionStorage, $location, $scope, CurrentUserService, EventRESTService, EventUtilService) {
		EventRESTService(CurrentUserService.getAuthHeader()).events.get().$promise.then(function(resp) {
			console.log('Events successfully retrieved from server.');
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
	  $location.path('/eventLoading');
		};
	}
])

.controller('EventEditCtrl', ['sessionStorage', '$filter', '$location', '$scope', 'CurrentUserService', 'EventRESTService',
							  'EventUtilService',
	function(sessionStorage, $filter, $location, $scope, CurrentUserService, EventRESTService, EventUtilService) {
		$scope.isCreation = sessionStorage.getObject('selected_event') ? false : true;

		$scope.datePicker = {
			startOpened: false,
			endOpened: false
		};

		$scope.eventForm = {
			startTime: new Date(0, 0, 0, 12, 0),
			endTime: new Date(0, 0, 0, 12, 0),
			minDate: Date.now()
		};

		$scope.eventForm.isMultiDay = false;

		$scope.saveEvent = function(eventForm) {
			addDateTimesToEvent(eventForm);

			var eventReq = {
				name: eventForm.name,
				location: eventForm.location,
				start_time: eventForm.startDateTime,
				end_time: eventForm.endDateTime
			}

			if ($scope.isCreation) {
				EventRESTService(CurrentUserService.getAuthHeader()).events.create(eventReq).$promise.then(function(resp) {
					sessionStorage.putObject('selected_event', resp);
					EventUtilService.setEventView(EventUtilService.views.EVENT_READY_VIEW);
					$location.path('/event');
				}).catch(function() {
					$scope.errorMessage = 'Error creating event.';
					console.log($scope.errorMessage);
				});
			} else {
				var eventId = sessionStorage.getObject('selected_event').id;
				EventRESTService(CurrentUserService.getAuthHeader()).event.update({id: eventId}, eventReq)
		  		.$promise.then(function(resp) {
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
				endTime: new Date(0, 0, 0, 12, 0),
		    minDate: Date.now()
			};
		};

		var loadEventForm = function(event) {
			$scope.eventForm = {
				name: event.name,
				location: event.location,
		    minDate: Date.now()
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
			$scope.eventForm.isMultiDay = false;
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

		$scope.$watch(function() {
		  return $scope.eventForm.startDate;
		}, function(startDate) {
		  if (startDate > $scope.eventForm.endDate || $scope.eventForm.endDate === undefined)
			$scope.eventForm.endDate = startDate;
		  if ($scope.isMultiDay)
			$scope.compareEndTimeAndDateToNow($scope.eventForm.endDate,
									   $scope.eventForm.endTime);
		  else
			$scope.compareEndTimeAndDateToNow($scope.eventForm.startDate,
									   $scope.eventForm.endTime);
		});

		$scope.$watch(function() {
		  return $scope.eventForm.endDate;
		}, function(endDate) {
		  if (endDate < $scope.eventForm.startDate) 
			$scope.eventForm.startDate = endDate;
		  if ($scope.isMultiDay)
			$scope.compareEndTimeAndDateToNow($scope.eventForm.endDate, 
									   $scope.eventForm.endTime);
		  else
			$scope.compareEndTimeAndDateToNow($scope.eventForm.startDate, 
									   $scope.eventForm.endTime);
		});

		$scope.$watch(function() {
		  return $scope.eventForm.startTime;
		}, function(startTime) {
		  if (startTime > $scope.eventForm.endTime) 
			$scope.eventForm.endTime = startTime;
		  if ($scope.isMultiDay)
			$scope.compareEndTimeAndDateToNow($scope.eventForm.endDate, 
									   $scope.eventForm.endTime);
		  else
			$scope.compareEndTimeAndDateToNow($scope.eventForm.startDate, 
									   $scope.eventForm.endTime);
		});

		$scope.$watch(function() {
		  return $scope.eventForm.endTime;
		}, function(endTime) {
		  if (endTime < $scope.eventForm.startTime) 
			$scope.eventForm.startTime = endTime;
		  if ($scope.isMultiDay)
			$scope.compareEndTimeAndDateToNow($scope.eventForm.endDate, 
									   $scope.eventForm.endTime);
		  else
			$scope.compareEndTimeAndDateToNow($scope.eventForm.startDate, 
									   $scope.eventForm.endTime);
		});

		$scope.compareEndTimeAndDateToNow = function(endDate, endTime) {
			if (!endTime) {
				return true;
			}
			if (!endDate) {
				endDate = $scope.eventForm.startDate;
				if (!endDate) {
					return true;
				}
			}
			var endDateTime = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(),
									 endTime.getHours(), endTime.getMinutes(), endTime.getSeconds());
			if (Date.now() > endDateTime)
				return true;
		  	if (!$scope.eventForm.startDate || !$scope.eventForm.startTime || !$scope.eventForm.endTime || !$scope.eventForm.name || !$scope.eventForm.location) {
		  		return true;
		  	}
		  	return false;
		}
	}
])

.controller('EventLoadingCtrl', ['$q', '$scope', '$location', '$timeout', 'sessionStorage', 'JudgeManagementService', 
								 'TeamManagementService', 'TeamStandingService', 'ngProgressFactory',
	function($q, $scope, $location, $timeout, sessionStorage, JudgeManagementService, 
			TeamManagmentService, TeamStandingService, ngProgressFactory) {
  
	var teamManagmentService = TeamManagmentService($scope, sessionStorage);
	var judgeManagementService = JudgeManagementService($scope, sessionStorage);
	var teamStandingService = TeamStandingService($scope);

	$scope.getEverything = function() {
	  var masterDefer = $q.defer();
    
    $scope.progressbar = ngProgressFactory.createInstance();
    $scope.progressbar.setHeight('20px');
    $scope.progressbar.setColor('#3498db');
    $scope.progressbar.start();
	  
	  $timeout(function() {
		  masterDefer.reject();
		  //TODO: raise alert if loading timeout occurs--something went wrong
	  }, 60000);
	  
	  teamStandingService.getDashboardInfo().then(function() {
		  masterDefer.resolve();
      $scope.progressbar.complete();
	  }).catch(function(error) {
		  masterDefer.reject();
	  });

	  return masterDefer.promise;
	}
  
  $scope.getEverything().then(function() {
    $location.path('/event');
  }).catch(function(error) {
    $scope.eventTimeoutError = 'Connection to the server timed out.';
    $location.path('/eventSelect');
  });
}])

.controller('EventCtrl', ['sessionStorage', '$filter', '$location', '$interval', '$rootScope', '$scope', 'CategoryManagementService', 'CurrentUserService', 
                          'EventRESTService', 'EventUtilService', 'TeamRESTService', 'TeamStandingService', 'JudgmentRESTService',
	function(sessionStorage, $filter, $location, $interval, $rootScope, $scope, CategoryManagementService, CurrentUserService, EventRESTService, EventUtilService,
						 TeamRESTService, TeamStandingService, JudgmentRESTService) {
    
		var teamStandingService = TeamStandingService($scope);
		teamStandingService.init();

    var updateDashboardInterval = $interval(function() {
      teamStandingService.getDashboardInfo();
      console.log('Updating dashboard.');
    }, 9000000);
    
    $scope.$on("$destroy", function() {
      $interval.cancel(updateDashboardInterval);
    });

		var categoryManagementService = CategoryManagementService($scope);

		$scope.event = {
			EVENT_READY_VIEW: EventUtilService.views.EVENT_READY_VIEW,
			EVENT_IN_PROGRESS_VIEW: EventUtilService.views.EVENT_IN_PROGRESS_VIEW,
			current_view: sessionStorage.get('event_view')
		};

	$scope.eventTabs = [{name: 'Judge Progress', id: 'judge-progress-tab', sectionId: 'judge-progress-section'},
						{name: 'Team Progress', id: 'team-progress-tab', sectionId: 'team-progress-section'},
						{name: 'Team Standing', id: 'team-standing-tab', sectionId: 'team-standing-section'}];
	
		$scope.getSelectedEvent = function() {
			return sessionStorage.getObject('selected_event');
		};

		$scope.isEventRunning = function() {
			return EventUtilService.isEventRunning();
		};

		$scope.editEvent = function() {
			$location.path('/eventEdit');
		};

		$scope.beginEvent = function() {
			var curEvent = sessionStorage.getObject('selected_event');
			var eventId = curEvent.id;
			var eventDuration = Date.parse(curEvent.end_time) - Date.parse(curEvent.start_time);
			var newStartTime = Date.now();
			var newEndTime = newStartTime + eventDuration;

			var updatedEvent = {
					name: curEvent.name,
					start_time: $filter('date')(newStartTime, 'yyyy-MM-dd HH:mm:ss'),
					end_time: $filter('date')(newEndTime, 'yyyy-MM-dd HH:mm:ss'),
					location: curEvent.location
			};
	  
			EventRESTService(CurrentUserService.getAuthHeader()).event.update({id: eventId}, 
																		updatedEvent)
		.$promise.then(function(resp) {
				sessionStorage.putObject('selected_event', resp);
				var view = EventUtilService.views.EVENT_IN_PROGRESS_VIEW;
				sessionStorage.put('event_view', view);
				$scope.event.current_view = view;
				console.log('Event started.');
			}).catch(function() {
				console.log('Error updating event times.');
			});
		};

		$scope.reveal_event_desc = function(desc) {
			$('#event-selection-desc').html('<strong>Event Description:</strong><br />' + desc).show();
		};

				$scope.rankNext3Categories = function() {
					var categoryInc = parseInt(sessionStorage.get('categoryInc')) + 3;
					var numCategories = $scope.teamStanding.length;
					if (categoryInc > numCategories)
						sessionStorage.put('categoryInc', 0);
					else
						sessionStorage.put('categoryInc', categoryInc);
				}

				$scope.recipientList = []; // Contains list of judges to be notified

		$scope.initRecipientList = function(item, type) {
		  if (type === 'judge') {
			$scope.$broadcast('firstRecipientsAdded', item.judge.name);
		  } else if (type === 'team') {
			var judgeIds = item.judges;
			var judgeObjs = sessionStorage.getObject('judges');
			var judgeNames = [];
			if (judgeObjs) {
			  for (var i = 0; i < judgeIds.length; i++) {
				var judgeId = judgeIds[i].id;
				for (var j = 0; j < judgeObjs.length; j++) {
				  if (judgeObjs[i].id === judgeId) {
					judgeNames.push(judgeObjs[i].judge.name);
					break;
				  }
				}
			  }
			  $scope.$broadcast('firstRecipientsAdded', judgeNames);
			}
		  }
		}

		$scope.$on('$locationChangeStart', function(event, next, current) {
			if ($location.path() !== '/event') {
				// Decides whether an event is in progress or not whenever /event is hit.
				if (EventUtilService.isEventRunning(sessionStorage.getObject('selected_event'))) {
					var view = EventUtilService.views.EVENT_IN_PROGRESS_VIEW;
				} else {
					var view = EventUtilService.views.EVENT_READY_VIEW;
				}
				sessionStorage.put('event_view', view);
				$scope.event.current_view = view;
			}
		});

		/** DASHBOARD RELATED **/
		$scope.judgeOrderReverse = true;
		$scope.judgeAssignmentCount = 0;
		$scope.judgeCompletedCount = 0;

		$scope.orderByCompletion = function(judgeJudgment) {
			return parseInt(judgeJudgment.judge_completion);
		}

		$scope.prettyPercent = function(uglyPercent) {
			uglyPercent *= 100;
			return +uglyPercent.toFixed(2);
		}

		$scope.determineOverallJudgeProgress = function(judgeJudgments) {
			if (!judgeJudgments || judgeJudgments.length === 0) {
				return [0, 0, 0];
			}
			var teamCatCount = 0;
			var completedTeamCatCount = 0;
			for (var i = 0; i < judgeJudgments.length; i++) {
				for (var j = 0; j < judgeJudgments[i].teamCats.length; j++) {
					if (judgeJudgments[i].teamCats[j].completed) {
						completedTeamCatCount++;
					}
				}
				teamCatCount += judgeJudgments[i].teamCats.length;
			}
			$scope.judgeAssignmentCount = teamCatCount;
			$scope.judgeCompletedCount = completedTeamCatCount;
			return [completedTeamCatCount, teamCatCount, Math.floor(completedTeamCatCount/teamCatCount * 100)];
		}

		$scope.convertColorToHex = function(decimalColor) {
			return categoryManagementService.convertColorToHex(decimalColor);
		}
    
    $scope.populateCompletedTeamModal = function(team, judge) {
      var team_category_id = team.team_category_id;
      var authHeader = CurrentUserService.getAuthHeader();
      var eventId = sessionStorage.getObject('selected_event').id;
      
      // The judge Id is not judge.id...must look elsewhere in the string for the actual id
      var judgeString = JSON.stringify(judge);
      var firstIndex = judgeString.indexOf('"judgeId":') + '"judgeId":'.length;
      var firstPart = judgeString.substring(firstIndex);
      var judgeId = firstPart.substring(0, firstPart.indexOf(','));
      
      if (!judgeId || isNaN(judgeId)) 
        return;
      
      $scope.completedTeamModal = {};
      $scope.completedTeamModal.completed = team.completed;
      $scope.completedTeamModal.loading = true;
      $scope.completedTeamModal.team = team.team;
      $scope.completedTeamModal.categoryName = team.category.label;
      $scope.completedTeamModal.overall_score = 0; // Display while loading data
      $('#completed-team-modal').modal('show');
      
      JudgmentRESTService(authHeader).judgments.getByJudge({event_id: eventId, judge_id: judgeId}).$promise.then(function(resp) {
        var filter = filterOutJudgmentsForThisTeam(resp, team_category_id);
        $scope.completedTeamModal.criteria = filter[0];
        $scope.completedTeamModal.overall_score = filter[1];
        $scope.completedTeamModal.loading = false;
        if (isNaN($scope.completedTeamModal.overall_score))
          $scope.completedTeamModal.overall_score = 0;
      }).catch(function() {
        $scope.completedTeamModal.loading = false;
      });
      
      function filterOutJudgmentsForThisTeam(judgeJudgments, team_category_id) {
        var criteria = [], overall_numerator = 0, overall_denominator = 0;
        for (var i = 0; i < judgeJudgments.length; i++) {
          if (judgeJudgments[i].team_category.id === team_category_id) {
            var criterion = { 
              name: judgeJudgments[i].criterion.label,
              denominator: judgeJudgments[i].criterion.max_score,
              numerator: judgeJudgments[i].value
            };
            criteria.push(criterion);
            overall_numerator += judgeJudgments[i].value;
            overall_denominator += judgeJudgments[i].criterion.max_score;
          }
        }
        var overall_score = (overall_denominator !== 0) ? overall_numerator / overall_denominator : 0;
        return [criteria, overall_score];
      }
    }
    
    $scope.closeCompletedTeamModal = function() {
      $scope.completedTeamModal = {};
      $('#completed-team-modal').modal('hide');
    }
    
    $scope.populateTeamStandingModal = function(teamObj, category) {
      var authHeader = CurrentUserService.getAuthHeader(),
          eventId = sessionStorage.getObject('selected_event').id,
          teamId = teamObj.team.id,
          team_category_id = teamObj.team_category_id;
      
      $scope.teamStandingModal = {};
      $scope.teamStandingModal.completed = teamObj.team.completed;
      $scope.teamStandingModal.loading = true;
      $scope.teamStandingModal.team = teamObj.team;
      $scope.teamStandingModal.categoryName = category.label;
      $scope.teamStandingModal.categoryColor = $scope.convertColorToHex(category.color);
      $scope.teamStandingModal.overall_score = 0; // Display while loading data
      $('#team-standing-modal').modal('show');
      
      JudgmentRESTService(authHeader).judgments.getByTeam({event_id: eventId, team_id: teamId}).$promise.then(function(resp) {    
        var filter = filterOutJudgmentsForThisTeam(resp, team_category_id);
        $scope.teamStandingModal.criteria = filter[0];
        $scope.teamStandingModal.overall_score = filter[1];
        $scope.teamStandingModal.loading = false;
        if (isNaN($scope.teamStandingModal.overall_score))
          $scope.teamStandingModal.overall_score = 0;
      }).catch(function() {
        $scope.teamStandingModal.loading = false;
      });
      
      // Because multiple judges are judging, criteria repeat
      function filterOutJudgmentsForThisTeam(judgeJudgments, team_category_id) {
        var criteria = [], overall_numerator = 0, overall_denominator = 0;
        var already_seen = []; // Already seen criteria
        for (var i = 0; i < judgeJudgments.length; i++) {
          if (judgeJudgments[i].team_category.id === team_category_id) {
            var criterion = { 
              name: judgeJudgments[i].criterion.label,
              denominator: judgeJudgments[i].criterion.max_score,
              numerator: judgeJudgments[i].value,
              score_count: 1
            };
            var index = already_seen.indexOf(criterion.name);
            if (index === -1) {
              already_seen.push(criterion.name);
              criteria.push(criterion);
            } else {
              criteria[index].numerator += judgeJudgments[i].value, 
              criteria[index].score_count += 1
            }
            overall_numerator += judgeJudgments[i].value;
            overall_denominator += judgeJudgments[i].criterion.max_score;
          }
        }
        for (var i = 0; i < criteria.length; i++) {
          criteria[i].numerator /= criteria[i].score_count; 
        }
        var overall_score = (overall_denominator !== 0) ? overall_numerator / overall_denominator : 0;
        return [criteria, overall_score];
      }
    }
    
    $scope.closeTeamStandingModal = function() {
      $scope.teamStandingModal = {};
      $('#team-standing-modal').modal('hide');
    }
	}
])

.factory('JudgmentManagementService', ['$q', 'JudgmentRESTService', function($q, JudgmentRESTService) {
  return function($scope, sessionStorage) {
    var service = {};

    var eventId = sessionStorage.getObject('selected_event').id;

    service.getAllJudgments = function(authHeader) {
      var defer = $q.defer();

      JudgmentRESTService(authHeader).judgments.get({event_id: eventId})
        .$promise.then(function(resp) {
        defer.resolve(resp);
        console.log('Successfully retrieved all judgments from server.');
      }).catch(function(error) {
        defer.reject();
        console.log('Error retrieving all judgments from server.');
      });
      
      return defer.promise;
    }

    return service; 
  }
}])

.factory('TeamStandingService', ['$q', 'sessionStorage', 'CategoryManagementService', 'CurrentUserService',
								 'JudgeManagementService', 'JudgeRESTService', 'JudgmentRESTService', 'RubricRESTService',
								 'TeamManagementService', 'TeamRESTService', '$location', 'JudgmentManagementService',
	function($q, sessionStorage, CategoryManagementService, CurrentUserService, JudgeManagementService, JudgeRESTService,
			JudgmentRESTService, RubricRESTService, TeamManagmentService, TeamRESTService, $location, JudgmentManagementService) {
	return function($scope) {
	
		var authHeader = CurrentUserService.getAuthHeader();
    var eventId = sessionStorage.getObject('selected_event').id;

    var categoryManagementService = CategoryManagementService($scope);
    categoryManagementService.getCategories();

    var teamManagmentService = TeamManagmentService($scope, sessionStorage);
    var judgeManagementService = JudgeManagementService($scope, sessionStorage);
    var judgmentManagementService = JudgmentManagementService($scope, sessionStorage);
	
		var service = {};
    
    service.getDashboardInfo = function() {
      var defer = $q.defer();
      
      getAllEventDashboardData().then(function(allData) {
        console.log('~~~~~~~~~~READY TO MERGE~~~~~~~~~~~~~');
        mergeAllEventDashboardData(allData['judges'],
                                   allData['judgeTeams'],
                                   allData['judgments'],
                                   allData['rubrics'],
                                   allData['teams']);
        defer.resolve();
      });
      
      
      return defer.promise;
    }
    
    var getAllEventDashboardData = function() {
      var defer = $q.defer(), promises = [], allData = {};
      
      var teamPromise = teamManagmentService.getTeams()
        .then(function(teams) {
        allData['teams'] = teams;
      });
      
      var judgePromise = judgeManagementService.getJudges()
        .then(function(judges) {
        allData['judges'] = judges;
      });
      
      var judgmentPromise = judgmentManagementService.getAllJudgments(authHeader)
        .then(function(judgments) {
        allData['judgments'] = judgments;
      });
      
      var rubricPromise = RubricRESTService(authHeader).rubrics.get({event_id: eventId})
        .$promise.then(function(rubrics) {
        allData['rubrics'] = rubrics;
      });
      
      promises.push(teamPromise);
      promises.push(judgePromise);
      promises.push(judgmentPromise);
      
      $q.all(promises).then(function() {
        var thesePromises = [];
        var teamCategoryPromise = getTeamCategories(allData['judgments']).then(function(teamCategories) {
          allData['teamCategories'] = teamCategories;   
        });
        var judgeTeamPromise = getJudgeTeams(allData['judges']).then(function(judgeTeams) {
          allData['judgeTeams'] = judgeTeams;       
        });
        thesePromises.push(teamCategoryPromise);
        thesePromises.push(judgeTeamPromise);
        $q.all(thesePromises).then(function() {
          defer.resolve(allData);
        });
      });
      
      function getTeamCategories(judgments) {
        var defer = $q.defer();
        
        var processedTeamCategoryIds = [], teamCategoryPromises = [], teamCategories = [];
        angular.forEach(judgments, function(judgment) {
          var team_category_id = judgment.team_category.id;
          if (processedTeamCategoryIds.indexOf(team_category_id) === -1) {
            processedTeamCategoryIds.push(team_category_id);
            var promise = teamManagmentService.getTeamCategory(team_category_id).then(function(teamCategory) {
              teamCategories.push(teamCategory);                       
            });
            teamCategoryPromises.push(promise);
          }
        });
        
        $q.all(teamCategoryPromises).then(function() {
          defer.resolve(teamCategories);
        });
        
        return defer.promise;
      };
      
      function getJudgeTeams(judges) {
        var defer = $q.defer();
        
        var judgeTeamPromises = [], judgeTeams = [];
        angular.forEach(judges, function(judge) {
          var promise = JudgeRESTService(authHeader).judgeTeams.get({judge_id: judge.id})
            .$promise.then(function(judgeTeam) {
            judgeTeams.push(judgeTeam);                       
          });
          judgeTeamPromises.push(promise);
        });
        
        $q.all(judgeTeamPromises).then(function() {
          defer.resolve(judgeTeams);
        });
        
        return defer.promise;
      };
      
      return defer.promise;
    };
    
    var mergeAllEventDashboardData = function(allJudges,
                                              allJudgeTeams,
                                              allJudgments, 
                                              allRubrics,
                                              allTeamCategories) {

      var mergedJudgeData = [];
      
      //console.log('~~~~~~~~~~allJudgments~~~~~~~~~~' + JSON.stringify(allJudgments));
      //console.log('~~~~~~~~~~allTeams~~~~~~~~~~' + JSON.stringify(allTeams));
      for (var i = 0; i < allJudges.length; i++) {
        var judge = allJudges[i];
        var judgeId = judge.id;
        var judgeJudgments = {
          in_progress: [],
          not_started: [],
          all: []
        }
        for (var j = 0; j < judge.teams.length; j++) {
          var thisTeam = judge.teams[j];
          var thisTeamId = thisTeam.team.id;
          var theseTeamCategories = getAllTeamCategoriesById(allTeamCategories, thisTeamId);
          judgeJudgments.all.push(theseTeamCategories);
        }
        var newJudge = jQuery.extend(true, {}, judge);
        newJudge.judgments = judgeJudgments;
        delete newJudge.event;
        delete newJudge.teams;
        mergedJudgeData.push(newJudge);
      }
    
      //console.log('~~~~~~~~~~mergedJudgeData~~~~~~~~~~' + JSON.stringify(mergedJudgeData));
    
      /* Process in progress judgments */
      for (var i = 0; i < mergedJudgeData.length; i++) {
      
        var allTeamCategories = mergedJudgeData[i].judgments.all;
        var judgeTrue = 0, judgeFalse = 0;
        for (var j = 0; j < allTeamCategories.length; j++) {
          var thisTeamCategory = allTeamCategories[j];
          for (var k = 0; k < thisTeamCategory.length; k++) {
            var teamCategoryId = thisTeamCategory[k].id;
            var theseJudgments = getJudgmentsByTeamCategoryIdAndJudgeId(allJudgments, 
                                                                        teamCategoryId,
                                                                        mergedJudgeData[i].id);
            var newTeamCategory = jQuery.extend(true, {}, thisTeamCategory[k]);
            if (theseJudgments.length > 0) {
              // There are judgments from this judge for this team category: mark as 'in_progress'
              var rubric = theseJudgments[0].rubric, criteria = [], score = 0;
              for (var l = 0; l < theseJudgments.length; l++) {
                var thisCriterion = theseJudgments[l].criterion;
                var thisValue = theseJudgments[l].value; 
                var newCriterion = jQuery.extend(true, {}, thisCriterion);
                newCriterion.judgment = thisValue;
                score = score + (thisValue / thisCriterion.max_score);
                criteria.push(newCriterion);
              } 
              var allRubricData = getObjectById(allRubrics, rubric.id);
              newTeamCategory.criteria = criteria;
              newTeamCategory.rubric = rubric;
              newTeamCategory.submittedCriteria = criteria.length;
              newTeamCategory.totalCriteria = allRubricData.criteria.length;
              
              var percentScore = (score / theseJudgments.length);
              newTeamCategory.percentScore = percentScore;
              console.log(newTeamCategory.percentScore);
              if (newTeamCategory.submittedCriteria == newTeamCategory.totalCriteria) {
                newTeamCategory.completed = true;
                judgeTrue++;
              } else {
                newTeamCategory.completed = false;
                judgeFalse++;
              }
              mergedJudgeData[i].judgments.in_progress.push(newTeamCategory);
            } else {
              // No judgments from this judge for this team category: mark as 'not_started'
              newTeamCategory.completed = false;
              judgeFalse++;
              mergedJudgeData[i].judgments.not_started.push(newTeamCategory);
            }
          } 
        }
        mergedJudgeData[i].judge_completion = prettyPercent(judgeTrue / (judgeTrue + judgeFalse));
        mergedJudgeData[i].numCompletedTeams = judgeTrue;
        mergedJudgeData[i].numAssignedTeams = (judgeTrue + judgeFalse);
        delete mergedJudgeData[i].judgments.all;
      }

      sessionStorage.putObject('judgeJudgments', mergedJudgeData); 
      service.determineTeamStanding(mergedJudgeData);
      
      function getObjectById(objects, id) {
        for (var i = 0; i < objects.length; i++) {
          if (objects[i].id === id)
            return objects[i];
        }
      }
      
      function getAllTeamCategoriesById(teamCategories, id) {
        var results = [];
        for (var i = 0; i < teamCategories.length; i++) {
          var thisTeamCategoryCollection = teamCategories[i];
          for (var j = 0; j < thisTeamCategoryCollection.length; j++) {
            if (thisTeamCategoryCollection[j].team.id === id)
              results.push(thisTeamCategoryCollection[j]);  
          }
        }
        return results;
      }
      
      function getJudgmentsByTeamCategoryIdAndJudgeId(judgments, teamCategoryId, judgeId) {
        var results = [];
        for (var i = 0; i < judgments.length; i++) {
          var thisJudgment = judgments[i];
          if (thisJudgment.team_category.id === teamCategoryId && thisJudgment.judge.id === judgeId) {
            results.push(thisJudgment);
          }
        }
        return results;
      }
      
      function prettyPercent(uglyPercent) {
		    uglyPercent *= 100;
		    return +uglyPercent.toFixed(2);
		  }
    };

		service.init =  function() {
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

				$scope.$watch(function() {
						return sessionStorage.getObject('judgeJudgments');
				}, function(newValue) {
						$scope.judgeJudgments = newValue;
				}, true);

				$scope.$watch(function() {
						return sessionStorage.getObject('teamStanding');
				}, function(newValue) {
						$scope.teamStanding = newValue;
				}, true);

				sessionStorage.put('categoryInc', '0');
		}

		service.determineTeamStanding = function(jJudgments) {
      // jJudgments refers to all the team-category assignments
			// for all judges, whether they are completed, in progress, or unstarted.
			var teamStanding = [];
			var seenCats = [];
			for (var i = 0; i < jJudgments.length; i++) {
        var judgments_in_progress = jJudgments[i].judgments.in_progress;
				for (var j = 0; j < judgments_in_progress.length; j++) {
					var judgment = judgments_in_progress[j];
          console.log(JSON.stringify(judgment));
					// If there's at least submitted criteria, take the 'judgment' into account
					if (seenCats.indexOf(judgment.category.id) == -1) {
						seenCats.push(judgment.category.id);
						teamStanding.push({
							category: judgment.category,
              team_category_id: judgment.id,
							teams: []
						});
						teamStanding[teamStanding.length - 1].teams.push({
							team: judgment.team,
              team_category_id: judgment.id,
							teamPercentScore: judgment.percentScore,
							teamJudgmentsCount: 1
						});
					} else if (seenCats.indexOf(judgment.category.id) != -1) { // We've seen this team-category pairing before, combine it.
						var foundTeam;
						for (var k = 0; k < teamStanding.length; k++) {
							foundTeam = false;
							if (teamStanding[k].category.id == judgment.category.id) {
								for (var l = 0; l < teamStanding[k].teams.length; l++) {
									if (teamStanding[k].teams[l].team.id == judgment.team.id) {
										foundTeam = true;
										teamStanding[k].teams[l].teamPercentScore += judgment.percentScore;
										teamStanding[k].teams[l].teamJudgmentsCount++;
									}
								}
								if (!foundTeam) {
									teamStanding[k].teams.push({
										team: judgment.team,
                    team_category_id: judgment.id,
										teamPercentScore: judgment.percentScore,
										teamJudgmentsCount: 1
                  });
								}
							}
						}
					}
				}
			}
			for (var i = 0; i < teamStanding.length; i++) {
				for (var j = 0; j < teamStanding[i].teams.length; j++) {
					teamStanding[i].teams[j].teamPercentScore = teamStanding[i].teams[j].teamPercentScore / teamStanding[i].teams[j].teamJudgmentsCount;
				}
			}
			sessionStorage.putObject('teamStanding', teamStanding);
	    console.log('Done computing team standing.');
		}
    
    

		service.getJudgmentsByAllJudges = function() {
			var defer = $q.defer();

			var judges = sessionStorage.getObject('judges');
			var eventId = sessionStorage.getObject('selected_event').id;
			var promises = [];
			for (var i = 0; i < judges.length; i++) {
				promises.push(service.getJudgmentsByJudge(eventId, judges[i]));
			}

			$q.all(promises).then(function(resp) {
		    console.log('Judgments successfully retrieved from server.');
        console.log('JUDGMENTS ' + JSON.stringify(resp));
				defer.resolve(resp);
			}).catch(function() {
				defer.reject();
		    var error = 'Error getting judgments by judge Ids.';
		    sessionStorage.put('generalErrorMessage', error);
				console.log('Error getting judgments by judge ids.');
			});

			return defer.promise;
		}

		service.getJudgmentsByJudge = function(eventId, judgeObj) {
			var defer = $q.defer();
			JudgmentRESTService(authHeader).judgments.getByJudge({event_id: eventId, judge_id: judgeObj.id}).$promise.then(function(resp) {
				service.addTeamsToJudgments(resp).then(function(resp2) {
					service.determineCompletedTeamsByJudge(judgeObj.id, resp2).then(function(resp3) { //great variable naming skills
						service.determineUnstartedTeamsByJudge(judgeObj.id, resp3).then(function(resp4) {
							var completedTeamCount = 0;
							for (var i = 0; i < resp4.length; i++) {
								if (resp4[i].completed) {
									completedTeamCount++;
								}
							}
							var assignedTeamsCount = resp4.length;
							var percentCompleted = Math.floor((completedTeamCount / assignedTeamsCount) * 100);
							var judgeJudgments = {
									judge: judgeObj.judge,
									teamCats: resp4,
									completion: isNaN(percentCompleted) ? 0 : percentCompleted,
									numCompletedTeams: completedTeamCount,
									numAssignedTeams: assignedTeamsCount
							};
							defer.resolve(judgeJudgments);
						})
					});
				});
			}).catch(function() {
				defer.reject();
			});

			return defer.promise;
		}

		service.addTeamsToJudgments = function(judgments) {
			var defer = $q.defer();

			if (judgments.length == 0) {
				defer.resolve([]);
			} else {
				var teamCatPromises = [];
				var seenTeamCats = [];

				for (var i = 0; i < judgments.length; i++) {
					teamCatPromises.push(addTeamToJudgment(judgments[i]));
				}

				$q.all(teamCatPromises).then(function(resp) {
					defer.resolve(resp);
				}).catch(function() {
					console.log('Error adding team & cat ids to judgments');
				});
			}

			return defer.promise;

			function addTeamToJudgment(judgment) {
				var defer = $q.defer();

				var judgmentWithTeam = judgment;

				var teamCats = sessionStorage.getObject('teamsCategories');
				for (var i = 0; i < teamCats.length; i++) {
					for (var j = 0; j < teamCats[i].length; j++) {
						if (judgmentWithTeam.team_category.id == teamCats[i][j].id) {
							judgmentWithTeam.team = teamCats[i][j].team;
							judgmentWithTeam.category = teamCats[i][j].category;
							break;
						}
					}
				}
				defer.resolve(judgmentWithTeam);

				return defer.promise;
			}

		}

		service.determineCompletedTeamsByJudge = function(id, judgments) {
			var defer = $q.defer();

			if (judgments.length == 0) {
				defer.resolve([]);
			} else {
				var rubricRESTService = RubricRESTService(authHeader);

				var promises = [];
				// Makes a mapping of rubric Ids to number of criteria in the rubric.
				// Used to determine whether a judge has completed judging a specific team.
				var seenRubrics = [];
				for (var i = 0; i < judgments.length; i++) {
					if (seenRubrics.indexOf(judgments[i].rubric.id) == -1) {
						seenRubrics.push(judgments[i].rubric.id);
						promises.push(getNumCriteriaInRubric(judgments[i].rubric.id));
					}
				}

				$q.all(promises).then(function(rubricNumCriteriaMapping) {
					var teamCatJudgments = [];
					var encounteredTeamCats = [];
					for (var i = 0; i < judgments.length; i++) {
						// Building criteria into complete team-category judgments.
						var index = encounteredTeamCats.indexOf(judgments[i].team_category.id);
						if (index == -1) { // If we haven't seen this team-category pair before, initalize the object for it.
							encounteredTeamCats.push(judgments[i].team_category.id);
							var numCriteria = 0; // Determine the number of criteria in the rubric
							for (var j = 0; j < rubricNumCriteriaMapping.length; j++) {
								if (judgments[i].rubric.id == rubricNumCriteriaMapping[j].rubricId) {
									numCriteria = rubricNumCriteriaMapping[j].numCriteria;
								}
							}
							teamCatJudgments.push({
								completed: false,
								submitedCriteria: 1,
								totalCriteria: numCriteria,
								percentScore: judgments[i].value/judgments[i].criterion.max_score,
								team: judgments[i].team,
								category: judgments[i].category,
								team_category_id: judgments[i].team_category.id,
								judgeId: judgments[i].judge.id
							});
						} else { // We've seen this team-category pairing before, add this criterion judgment to the aggregate judgment.
							for (var j = 0; j < teamCatJudgments.length; j++) { // First, find the index of the team-cat this criterion judgment belongs to.
								if (teamCatJudgments[j].team_category_id == judgments[i].team_category.id) { // Once it's found, and criterion judgment data to it
									teamCatJudgments[j].submitedCriteria++;
									if (teamCatJudgments[j].submitedCriteria == teamCatJudgments[j].totalCriteria) { // If true, this all the criterion for the rubric have been traversed
										teamCatJudgments[j].completed = true;
									}
									// Adding scores as percentages. This means that every criterion is weighted evenly, regardless of how many stars it's out of.
									teamCatJudgments[j].percentScore = (teamCatJudgments[j].percentScore + (judgments[i].value/judgments[i].criterion.max_score));
								}
							}
						}
					}
					// This takes the added percent scores and divides each by the number that were added together
					// to get the equally weighted average: represents a particular judge's overall score for a particular
					// team in a particular category.
					for (var i = 0; i < teamCatJudgments.length; i++) {
						teamCatJudgments[i].percentScore = teamCatJudgments[i].percentScore / teamCatJudgments[i].submitedCriteria;
					}
					defer.resolve(teamCatJudgments);
				});
			}

			return defer.promise;

			function getNumCriteriaInRubric(rId, rubricNumCriteriaMapping) {
				var defer = $q.defer();
				rubricRESTService.rubric.get({id: rId}).$promise.then(function(resp) {
					defer.resolve({rubricId: rId, numCriteria: resp.criteria.length});
				}).catch(function() {
					defer.reject();
					console.log('Error getting rubric');
				});

				return defer.promise;
			}
		}

		service.determineUnstartedTeamsByJudge = function(judgeId, judgments) {
			// This just loops through the judge's assigned teams and the
			// judgments of the teams
			var defer = $q.defer();

			JudgeRESTService(authHeader).judgeTeams.get({judge_id: judgeId}).$promise.then(function(judgeTeams) {
				var promises = [];

				for (var i = 0; i < judgeTeams.length; i++) {
					promises.push(getTeamCategoriesByTeam(judgeTeams[i].team.id));
				}

				$q.all(promises).then(function(teamCats) {
					var flattenedTeamCats = [];
					for (var i = 0; i < teamCats.length; i++) {
						for (var j = 0; j < teamCats[i].length; j++) {
							teamCats[i][j].judgeId = judgeId;
							teamCats[i][j].team_category_id = teamCats[i][j].id;
							delete teamCats[i][j].id;
							flattenedTeamCats.push(teamCats[i][j]);
						}
					}
					var finalTeamCats = [];
					for (var i = 0; i < flattenedTeamCats.length; i++) {
						for (var j = 0; j < judgments.length; j++) {
							if (flattenedTeamCats[i].team_category_id == judgments[j].team_category_id) {
								flattenedTeamCats[i].judged = true;
							}
						}
					}
					for (var i = 0; i < flattenedTeamCats.length; i++) {
						if (!flattenedTeamCats[i].judged) {
							finalTeamCats.push(flattenedTeamCats[i]);
						}
					}
					for (var i = 0; i < judgments.length; i++) {
						finalTeamCats.push(judgments[i]);
					}
					//console.log(finalTeamCats);
					defer.resolve(finalTeamCats);
				});
			}).catch(function() {
				defer.reject();
			});

			return defer.promise;

			function getTeamCategoriesByTeam(teamId) {
				var defer = $q.defer();

				TeamRESTService(authHeader).team_categories.get({team_id: teamId}).$promise.then(function(teamCatsResp) {
					defer.resolve(teamCatsResp);
				}).catch(function() {
					defer.reject();
				});

				return defer.promise;
			}
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
		isEventRunning: function() {
			var event = sessionStorage.getObject('selected_event');
			if (event) {
				var startDateTime = Date.parse(event.start_time);
				var endDateTime = Date.parse(event.end_time);
				if (startDateTime <= Date.now() && endDateTime >= Date.now()) {
					sessionStorage.put("event" + event.id + "_running", "true");
					return true;
				} else {
					return false;
				}
			}
	  return false;
		}
	};

	return service;
})

.factory('EventRESTService', function($resource, CurrentUserService) {
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

.factory('MessageRESTService', function($resource) {
	return function(authHeader) {
		return {
			messages: $resource('http://api.stevedolan.me/messages', {
				recipient_id: '@recipientId',
				subject: '@subject',
				body: '@body'
			}, {
				send: {
					method: 'POST',
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
				var judgeAccordion = $('.judge-accordion');
		judgeAccordion.find('.accordion-body').collapse('show');
				judgeAccordion.find('.accordion-toggle i')
					.removeClass('glyphicon-chevron-right').addClass('glyphicon-chevron-down');
	  });
	  $('.expand-all-accordions.team').unbind().click(function() {
		var teamAccordion = $('.team-accordion');
		teamAccordion.find('.accordion-body').collapse('show');
				teamAccordion.find('.accordion-toggle i')
					.removeClass('glyphicon-chevron-right').addClass('glyphicon-chevron-down');
	  });
	  $('.expand-all-accordions.category').unbind().click(function() {
		var catAccordion = $('.category-accordion');
		catAccordion.find('.accordion-body').collapse('show');
				catAccordion.find('.accordion-toggle i')
					.removeClass('glyphicon-chevron-right').addClass('glyphicon-chevron-down');
	  });
	}
  }
})

.directive('collapseAllAccordions', function() {
  return {
	link: function(scope, elem, attrs) {
	  $('.collapse-all-accordions.judge').unbind().click(function() {
				var judgeAccordion = $('.judge-accordion');
		judgeAccordion.find('.accordion-body').collapse('hide');
				judgeAccordion.find('.accordion-toggle i')
					.removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-right');
	  });
	  $('.collapse-all-accordions.team').unbind().click(function() {
		var teamAccordion = $('.team-accordion');
		teamAccordion.find('.accordion-body').collapse('hide');
				teamAccordion.find('.accordion-toggle i')
					.removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-right');
	  });
	  $('.collapse-all-accordions.category').unbind().click(function() {
		var catAccordion = $('.category-accordion');
		catAccordion.find('.accordion-body').collapse('hide');
				catAccordion.find('.accordion-toggle i')
					.removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-right');
	  });
	}
  }
})

.directive('notificationModal', ['sessionStorage', function(sessionStorage) {

	var link = function(scope, elem, attrs) {
		scope.$watch(function() {
		  return sessionStorage.getObject('judges');   
		}, function(newJudgeList) {
		  if (newJudgeList) { 
						scope.judges = newJudgeList;
			updateAutoComplete();
					}
		}, true);
			
	scope.$on('firstRecipientsAdded', function (event, data) {
	  if (data) {
		if ($.isArray(data)) {
		  angular.forEach(data, function(entry) {
		  create_new_judge_notification_object(entry); 
		  });
		} else if (typeof data === 'string') {
		  create_new_judge_notification_object(data); 
		}
	  }
		});

	/*
		 * Initialize the Autocomplete Object for the Notification Modal
		 */
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



