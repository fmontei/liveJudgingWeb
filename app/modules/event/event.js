'use strict';

angular.module('liveJudgingAdmin.event', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/event', {
    templateUrl: 'modules/event/event.html',
    controller: 'EventCtrl'
  });
}])

.controller('EventCtrl', [function() {

}])

.directive('changeTabWidget', function() {

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

	return {
  };
})

.directive('changeAccordionChevron', function() {

	$(".accordion-toggle").click(function() {
    var span = $(this).find("span");
    if (span.hasClass("glyphicon-chevron-right")) 
      span.removeClass("glyphicon-chevron-right").addClass("glyphicon-chevron-down");
    else
      span.removeClass("glyphicon-chevron-down").addClass("glyphicon-chevron-right");
  });

  return {
  };
})

.directive('notificationWidget', function() {
	
	var judge_list = ["Abe Lincoln", "George Washington", "Thomas Jefferson"]; // Contains names of judges, pulled from server
  var recipient_list = []; // Contains list of judges to be notified

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

  return {
  };
})

.directive('dateWidget', function() {

	$("#datepicker-start").datepicker();
	$("#datepicker-end").datepicker();

	return {
  };
})

.directive('timeWidget', function() {
	
	$("#timepicker-start").timepicker();
	$("#timepicker-end").timepicker();
	$("#timepicker-autostart").timepicker();

	return {
  };
})

.directive('saveEventWidget', function() {

	var event_form_page =  $("#event-form-page"),
		event_dashboard_unactive_page = $("#event-dashboard-unactive-page");

	$("#save-event-button").click(function() {
		event_form_page.hide();
		event_dashboard_unactive_page.show();	
	});

	return {
	};
})

.directive('beginEventWidget', function() {

	var event_dashboard_unactive_page = $("#event-dashboard-unactive-page"),
		event_dashboard_active_page = $("#event-dashboard-active-page");

	$("#begin-event-button").click(function() {
		event_dashboard_unactive_page.hide();
		event_dashboard_active_page.show();	
	});

	return {
	};
});



