'use strict';

angular.module('liveJudgingAdmin.event', ['ngCookies', 'ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/event', {
    templateUrl: 'modules/event/event.html',
    controller: 'EventCtrl'
  });
}])

.run(['$cookies', function($cookies) {
	$cookies.put("view", "event_edit_view");
	$cookies.put("running", "false");
}])

.controller('EventCtrl', ['$cookies', '$scope', function($cookies, $scope) {
	$scope.event = {
		EVENT_EDIT_VIEW: "event_edit_view",
		EVENT_READY_VIEW: "event_ready_view",
		EVENT_IN_PROGRESS_VIEW: "event_in_progress_view",
		current_view: $cookies.get("view"),
		running: $cookies.get("running")
	};
	$scope.change_view_to = function(view) {
		$cookies.put("view", view);
		$scope.event.current_view = view;
		if (view === $scope.event.EVENT_IN_PROGRESS_VIEW) {
			$cookies.put("running", "true");
			$scope.event.running = "true";
		} 
		console.log("Event view switched to: " + view);
	}
	
	$scope.times = [];
	for (var i = 1; i <= 12; i++) {
		for (var j = 0; j <= 45; j += 15) {
			if (j == 0) $scope.times.push(i + ":" + j + j);
			else $scope.times.push(i + ":" + j);
		}
	}
}])

.directive('changeTabWidget', function() {

	var link = function(scope, elem, attrs) {
		var judge_progress_tab = $("#judge-progress-tab"),
			judge_progress_section = $("#judge-progress-section"),
			project_progress_tab = $("#project-progress-tab"),
			project_progress_section = $("#project-progress-section"),
			category_progress_tab = $("#category-progress-tab"),
			category_progress_section = $("#category-progress-section");

		judge_progress_tab.click(function() {
			project_progress_section.hide();
			category_progress_section.hide();
			judge_progress_section.show();
			$(project_progress_tab).removeClass("active");
			$(category_progress_tab).removeClass("active");
			$(judge_progress_tab).addClass("active");
		});
		project_progress_tab.click(function() {
			judge_progress_section.hide();
			category_progress_section.hide();
			project_progress_section.show();
			$(judge_progress_tab).removeClass("active");
			$(category_progress_tab).removeClass("active");
			$(this).addClass("active");
		});
		category_progress_tab.click(function() {
			judge_progress_section.hide();
			project_progress_section.hide();
			category_progress_section.show();
			$(judge_progress_tab).removeClass("active");
			$(project_progress_tab).removeClass("active");
			$(this).addClass("active");
		});
	}
	
	return {
		link: link
  };
})

.directive('changeAccordionChevron', function() {
  return {
		link: function(scope, elem, attrs) {
			$(".accordion-toggle").click(function() {
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
	
	var judge_list = ["Abe Lincoln", "George Washington", "Thomas Jefferson"]; // Contains names of judges, pulled from server
	var recipient_list = []; // Contains list of judges to be notified
	var link = function(scope, elem, attrs) {
		/*
		 * Initialize the Autocomplete Object for the Notification Modal
		 */
		$("#judge_search").autocomplete({
			source: judge_list,
			select: function(event, ui) {
				var recipient_name = ui.item.value;
				if (jQuery.inArray(recipient_name, recipient_list) === -1)
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
			recipient_list.push(name);
			clear_all_checkbox.attr("checked", false);
			/* Add listener to dynamically created HTML element */
			$(".recipient .glyphicon.glyphicon-remove").click(function() {
				if ($(this).parent().html().indexOf(name) >= 0) {
					/* Remove recipient from list if 'x' is clicked */
					recipient_list = recipient_list.filter(function(elem) {
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
			for (var i = 0; i < judge_list.length; i++) {
				var name = judge_list[i];
				if (jQuery.inArray(name, recipient_list) === -1)
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
			recipient_list.length = 0; // Clear recipient list
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



