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

.directive('notificationWidget', function() {
	
	var judge_list = ["ActionScript", "BASIC", "C"]; // Contains names of judges
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
});

