angular.module('liveJudgingAdmin.messages', [function() {
  
}])

.controller('MessageCtrl', ['$scope', 'MessageRESTService', 'CurrentUserService',
            function ($scope, MessageRESTService, CurrentUserService) {
  var authHeader = CurrentUserService.getAuthHeader();
  var messageRESTService = MessageRESTService(authHeader);
              
  $scope.getUserMessages = function(userId) {
    messageRESTService.messages.get({user_id: userId})
      .$promise.then(function(resp) {
      
    }).catch(function(error) {
      
    });
  };
  
  $scope.sendMessage = function(message) {
    messageRESTService.messages.send(message)
      .$promise.then(function(resp) {
      
    }).catch(function(error) {
      
    });
  };
}])

.factory('MessageRESTService', [function () {
	return function(authHeader) {
		return {
			messages: $resource('http://api.stevedolan.me/users/:user_id/messages', {}, {
				get: {
					method: 'GET',
					isArray: true,
					headers: authHeader,
          params: {user_id: '@userId'}
				},
        send: {
          method: 'POST',
          headers: authHeader,
          url: 'http://api.stevedolan.me/messages'
        }
			})
    };
	}
}])
