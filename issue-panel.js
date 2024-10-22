(function () {
    'use strict';

    angular
        .module('app', ['ngSanitize', 'ui.select', 'moment-picker'])
        .controller('IssuePanelController', IssuePanelController);

    IssuePanelController.$inject = ['$http', '$q', '$timeout'];

    function IssuePanelController($http, $q, $timeout) {
        var vm = this;

        vm.time = {};
        vm.timer = null;
        vm.projects = [];
        vm.allProjectTasks = [];
        vm.projectTasks = [];
        vm.currentUser = null;
        vm.httpHeader = '';
        vm.jiraIssueKey = '';
        vm.jiraIssue = {};
        vm.jiraWorkLog = {};
        vm.notesAreChanged = false;
        vm.pageLocation = '';

        vm.taskIsBillable = taskIsBillable;
        vm.userIsLoggon = userIsLoggon;
        vm.login = login;
        vm.logout = logout;
        vm.addTime = addTime;
        vm.updateTime = updateTime;
        vm.selectProject = selectProject;
        vm.selectProjectTask = selectProjectTask;
        vm.stopTimer = stopTimer;

        // first add all.js, then run init
        addAllJs();

        //////

        function init() {
            moment.locale('nl');

            vm.time.date = moment().format('L')

            if (userIsLoggon()) {
                setCurrentUser();
            }
        }

        function taskIsBillable(task) {
            if (task.billable) {
                return 'Billable';
            }
            return 'Not billable';
        }

        function addTime(isValid, timer) {
            vm.submitted = true;

            if (isValid) {
                vm.submitted = false;

                vm.time.date = toUtcDate(vm.time.date);
                vm.time.externalName = vm.jiraIssue.key + ': ' + vm.jiraIssue.fields.summary;
                vm.time.externalUrl = vm.pageLocation;

                $http.post('https://web.timechimp.com/api/time', vm.time, vm.httpHeader)
                    .then(function (response) {
                        if (timer) {
                            vm.time = response.data;
                            startTimer();
                        }
                        else {
                            addJiraWorkLog(vm.time.date);

                            vm.time = {};
                            vm.time.date = moment().format('L');

                            setDefaults();
                        }
                    }, function (error) {
                        AP.flag.create({
                            body: error,
                            type: 'error'
                        });
                    });
            }
        }

        function updateTime() {
            $http.put('https://web.timechimp.com/api/time', vm.time, vm.httpHeader)
                .then(function (response) {
                    vm.notesAreChanged = false;

                    AP.flag.create({
                        body: 'Description is updated',
                        type: 'success',
                        close: 'auto'
                    });
                }, function (error) {
                    AP.flag.create({
                        body: error,
                        type: 'error'
                    });
                });
        }

        function startTimer() {
            $http.post('https://web.timechimp.com/api/time/starttimer/' + vm.time.id, null, vm.httpHeader)
                .then(function (response) {
                    vm.time.timer = response.data;

                    AP.flag.create({
                        body: 'Timer is started for issue ' + vm.jiraIssueKey,
                        type: 'success',
                        close: 'auto'
                    });

                    if (vm.notesAreChanged) {
                        updateTime();
                    }
                }, function (error) {
                    AP.flag.create({
                        body: error,
                        type: 'error'
                    });
                });
        }

        function stopTimer() {
            $http.post('https://web.timechimp.com/api/time/stoptimer/' + vm.time.id, null, vm.httpHeader)
                .then(function (response) {
                    vm.time.hours = response.data;

                    addJiraWorkLog(vm.time.timer);

                    vm.time = {};
                    vm.time.date = new moment().format('L');

                    setDefaults();
                }, function (error) {
                    AP.flag.create({
                        body: error,
                        type: 'error'
                    });
                });
        }

        function getTimer() {
            $http.get('https://web.timechimp.com/api/time/timer', vm.httpHeader)
                .then(function (response) {
                    if (response && response.data) {
                        vm.timer = response.data;
                    }
                }, function (error) {
                    AP.flag.create({
                        body: error,
                        type: 'error'
                    });
                });
        }

        function selectProject(project) {
            if (project) {
                vm.time.customerId = project.customerId;

                vm.projectTasks = _.filter(vm.allProjectTasks, function (pt) {
                    return pt.projectId == project.id;
                });

                vm.time.projectTaskId = null;
            }
            else {
                vm.time.projectTaskId = null;
                vm.time.projectId = null;
            }
        }

        function selectProjectTask(projectTask) {
            if (projectTask) {
                localStorage.removeItem('jiraTimeChimpDefaultTask');
                localStorage.setItem('jiraTimeChimpDefaultTask', projectTask.name.toLowerCase());
            }
        }

        function setCurrentUser() {
            vm.loading = true;

            vm.httpHeader = {
                headers: {
                    'Authorization': 'Bearer ' + vm.currentUser.token
                }
            };


            var q1 = $http.get('https://web.timechimp.com/api/user/current', vm.httpHeader)
                .then(function (response) {
                    vm.showProjectMapping = response.data.accountTypeId > 1;

                    vm.currentUser = {
                        token: vm.currentUser.token,
                        username: vm.currentUser.username,
                        id: response.data.id
                    };

                    localStorage.removeItem('jiraTimeChimpLogin');

                    // put token in localstorage
                    localStorage.setItem('jiraTimeChimpLogin', JSON.stringify(vm.currentUser));
                }, function (error) {
                    console.log(error)
                });

            var q1 = $http.get('https://web.timechimp.com/api/project/' + vm.currentUser.id + '/uiselectbyuserjira', vm.httpHeader)
>>>>>>> Stashed changes
                .then(function (response) {
                    vm.projects = response.data;
                }, function (error) {
                    console.log(error)
                });

            var q2 = $http.get('https://web.timechimp.com/api/projecttask/' + vm.currentUser.id + '/uiselectbyuser', vm.httpHeader)
                .then(function (response) {
                    vm.allProjectTasks = response.data;
                }, function (error) {
                    console.log(error)
                });

            var q3 = setJiraIssue();

            var q4 = getTimer();

            $q.all([q1, q2, q3, q4]).then(function () {
                if (vm.timer && vm.timer.externalUrl == vm.pageLocation) {
                    vm.time = vm.timer;
                }
                else {
                    setDefaults();
                }
                
                $timeout(function () {
                    vm.loading = false;
                });
            });
        }

        function setDefaults() {
            var project = _.filter(vm.projects, function (p) {
                return p.externalUrl == vm.currentDomain + '/projects/' + vm.jiraIssue.fields.project.key;
            });
            console.log(project)

            if (!project || project.length == 0) {
                project = _.filter(vm.projects, function (p) {
                    return p.name.toLowerCase() === vm.jiraIssue.fields.project.name.toLowerCase();
                });
            }

            if (project && project.length > 0) {
                vm.time.projectId = project[0].id;
                selectProject(project[0]);
            }

            var defaultTask = localStorage.getItem('jiraTimeChimpDefaultTask');

            var projectTask = _.filter(vm.projectTasks, function (pt) {
                return pt.name.toLowerCase() === defaultTask;
            });

            if (projectTask && projectTask.length > 0) {
                vm.time.projectTaskId = projectTask[0].id;
            }
        }

        function addJiraWorkLog(date) {
            var jiraWorkLog = {
                started: moment(date).utc().format('YYYY-MM-DDTHH:mm:00.000+0000'),
                comment: vm.time.notes,
                timeSpentSeconds: vm.time.hours * 60 * 60
            };
            console.log(jiraWorkLog);
            AP.request({
                url: '/rest/api/2/issue/' + vm.jiraIssueKey + '/worklog',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(jiraWorkLog),
                success: function (reponse) {
                    AP.flag.create({
                        body: 'Work has been logged on ' + vm.jiraIssueKey + ' and TimeChimp time entry is created.',
                        type: 'success',
                        close: 'auto'
                    });
                },
                error: function (response) {
                    var error = JSON.parse(response.responseText);
                    AP.flag.create({
                        body: error.errorMessages.join(' '),
                        type: 'error'
                    });
                }
            });
        }

        function setJiraIssue() {
            var defer = $q.defer();

            AP.getLocation(function (pageLocation) {
                vm.currentDomain = 'https://' + pageLocation.replace('https://', '').split('/')[0];
                vm.pageLocation = pageLocation.split('?')[0];

                if (pageLocation.indexOf('selectedIssue=') > 0) {
                    var queryString = {};
                    pageLocation.replace(
                        new RegExp("([^?=&]+)(=([^&]*))?", "g"),
                        function ($0, $1, $2, $3) { queryString[$1] = $3; }
                    );

                    vm.jiraIssueKey = queryString.selectedIssue;
                } else {
                    vm.jiraIssueKey = /[a-zA-Z0-9\-]+$/.exec(vm.pageLocation)[0];
                }

                AP.request('/rest/api/2/issue/' + vm.jiraIssueKey, {
                    success: function (response) {
                        vm.jiraIssue = JSON.parse(response);
                        defer.resolve(vm.jiraIssue);
                    },
                    error: function (response) {
                        var error = JSON.parse(reponse.responseText);
                        console.log(error);
                        AP.flag.create({
                            body: error.errorMessages.join(' '),
                            type: 'error'
                        });
                        defer.reject();
                    }
                });
            });

            return defer.promise;
        }

        function userIsLoggon() {
            if (vm.currentUser) {
                return true;
            }
            else {
                try {
                    var currentUser = localStorage.getItem('jiraTimeChimpLogin');
                    if (currentUser) {
                        vm.currentUser = JSON.parse(currentUser);
                        return true;
                    }
                }
                catch (error) {
                    vm.localStorageError = true;
                }
            }

            return false;
        }


        function login() {
            if (!vm.username || !vm.password) {
                vm.errorMessage = "Emailadres of wachtwoord is niet ingevuld";
                return;
            }

            var httpConfig = {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            };

            var data = formEncode({
                username: vm.username,
                password: vm.password,
                grant_type: 'password'
            });

            $http.post('https://web.timechimp.com/token', data, httpConfig)
                .then(function (response) {
                    vm.currentUser = {
                        token: response.data.access_token,
                        username: vm.username
                    };
                    // put token in localstorage
                    localStorage.setItem('jiraTimeChimpLogin', JSON.stringify(vm.currentUser));

                    init();
                }, function (error) {
                    vm.errorMessage = "Check your email and password";
                });
        }

        function logout() {
            vm.currentUser = null;
            localStorage.removeItem('jiraTimeChimpLogin');
        }

        function formEncode(data) {
            var pairs = [];
            for (var name in data) {
                pairs.push(encodeURIComponent(name) + '=' + encodeURIComponent(data[name]));
            }
            return pairs.join('&').replace(/%20/g, '+');
        }

        function addAllJs() {
            var head = document.getElementsByTagName("head")[0];
            var script = document.createElement("script");
            script.type = "text/javascript";
            script.src = 'https://connect-cdn.atl-paas.net/all.js';
            script.setAttribute('data-options', 'base:true')
            script.onreadystatechange = function () {
                if (this.readyState == 'complete') {
                    init();
                }
            };
            script.onload = init;
            head.appendChild(script);
        }

        function getParameterByName(name) {
            name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
            var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
                results = regex.exec(location.search);
            return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
        }

        function toUtcDate(date) {
            var zoneOffset = moment(date, 'DD-MM-YYYY').utcOffset();
            var utcMoment = moment.utc(moment(date, 'DD-MM-YYYY').utcOffset(zoneOffset).toArray());

            return utcMoment.toDate();
        }
    }
})();