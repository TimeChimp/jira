(function () {
    'use strict';

    angular
        .module('app')
        .directive('timeFormat', timeFormat);

    function timeFormat() {
        return {
            restrict: 'A',
            require: '?ngModel',
            link: function (scope, elem, attrs, ctrl) {

                if (!ctrl) {
                    return;
                }

                ctrl.$parsers.push(function (value) {
                    return formatTimeToFloat(value);
                });

                ctrl.$formatters.push(function (value) {
                    var time = formatToTime(value);

                    return time;
                });

                elem.bind('focusout', function () {
                    var time = formatToTime(elem.val());

                    elem.val(time);
                });        
                
                ////////

                function formatTimeToFloat(value) {
                    if (value) {
                        var time = value.replace(',', '.');
        
                        var hours = 0;
                        var minutes = 0;
        
                        var maximum_hours = 24;
        
                        var int_format = time.match(/^\d+$/);
                        var time_format = time.match(/(-?[\d]*):([\d]+)/);
                    
                        if (time_format != null) {
                            hours = parseInt(time_format[1]);
                            minutes = parseFloat(time_format[2] / 60);
                            if (value && value.toString().indexOf('-') > -1) {
                                time = Math.abs(hours) + minutes;
                                time = -Math.abs(time);
                            }
                            else {
                                time = hours + minutes;
                            }
                        } else if (int_format != null) {
                            time = parseInt(time);
                            if (maximum_hours > 0 && time > maximum_hours) {
                                time = maximum_hours;
                            }
                        }
                
                        var float = parseFloat(time);
        
                        if (float == 'NaN') {
                            float = 0.00;
                        }
                      
                        return float;
                    }            
        
                    return 0.00;
                }

                function formatToTime(value, max24hours) {
                    var hours = 0;
                    var minutes = 0;
        
                    if (value) {
                        if (value.toString().indexOf(':') > -1) {
                            var hIndex = value.toString().indexOf('-') > -1 ? 3 : 2;
                            var h = value.split(':')[0].substring(0, hIndex);
                            var m = value.split(':')[1].substring(0, 2);
        
                            hours = parseToInt(h);
                            minutes = parseToInt(m);
                        }
                        else {
                            var float = parseToFloat(value);
        
                            if (float < 0) {
                                hours = Math.ceil(float);
                                minutes = Math.abs(Math.round((float % 1) * 60));
                            }
                            else {
                                hours = Math.floor(float);
                                minutes = Math.round((float % 1) * 60);
                            }
                        }
                    }
        
                    if (max24hours && hours >= 24) {
                        hours = 24;
                        minutes = 0;
                    }
                    else if (max24hours && hours <= -24) {
                        hours = -24;
                        minutes = 0;
                    }
        
                    if (minutes < 0) {
                        minutes = 0;
                    }
        
                    if (hours < 0 && hours > -10) {
                        hours = "-0" + Math.abs(hours);
                    }
                    else if (hours > 0 && hours < 10) {
                        hours = "0" + hours;
                    }
                    else if (hours == 0) {
                        if (value && value.toString().indexOf('-') > -1) {
                            hours = '-00';
                        }
                        else {
                            hours = '00';
                        }
                    }
            
                    if (minutes < 10) {
                        minutes = "0" + minutes;
                    }
        
                    return hours + ":" + minutes;
                }
        
                function parseToFloat(value) {
                    if (!value) {
                        return 0;
                    }
        
                    var float = parseFloat(value.toString().replace(',', '.'));
        
                    if (!float) {
                        return 0;
                    }
        
                    return float;
                }
        
                function parseToInt(value) {
                    var int = parseInt(value);
        
                    if (!int) {
                        return 0;
                    }
        
                    return int;
                }
        
            }
        };
    }
})();