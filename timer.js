(function () {
    'use strict';

    angular
        .module('app')
        .directive('timer', timer);

    timer.$inject = ['$interval'];

    function timer($interval) {
        return {
            restrict: 'EA',
            template: '<h1 class="mt-md">{{time}}</h1>',
            scope: {
                startTime: '=startTime',
            },
            replace: true,
            link: function (scope, element, attr, ctrl) {

                setTime();

                var timerInterval = $interval(function () {
                    setTime();
                }, 1000)

                function setTime() {
                    if (isValidTime(scope.startTime)) {
                        var millis = moment().diff(moment.utc(scope.startTime));

                        scope.seconds = Math.floor((millis / 1000) % 60);
                        scope.minutes = Math.floor((millis / (60000)) % 60);
                        scope.hours = Math.floor(((millis / (3600000)) % 24));

                        if (scope.seconds < 10) scope.seconds = '0' + scope.seconds;
                        if (scope.minutes < 10) scope.minutes = '0' + scope.minutes;
                        if (scope.hours < 10) scope.hours = '0' + scope.hours;

                        scope.time = scope.hours + ':' + scope.minutes + ':' + scope.seconds;
                    }
                }

                function isValidTime(startTime) {
                    if (startTime 
                        && moment(startTime).isValid()
                        && moment.utc(startTime) < moment()) {
                        return true;
                    }
                    return false;
                }

                scope.$on('$destroy', function () {
                    $interval.cancel(timerInterval);
                });
            }
        };
    }
})();