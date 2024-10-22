(function () {
    'use strict';

    angular
        .module('app', ['ngSanitize', 'ui.select'])
        .controller('SyncPageController', SyncPageController);

    SyncPageController.$inject = ['$http', '$q'];

    function SyncPageController($http, $q) {
        var vm = this;

        vm.currentUser = null;
        vm.httpHeader = '';
        vm.times = [];
        vm.tab = 'times';
        vm.showProjectMapping = false;

        vm.userIsLoggon = userIsLoggon;
        vm.login = login;
        vm.logout = logout;
        vm.selectProject = selectProject;
        vm.getIssueKeyFromNotes = getIssueKeyFromNotes;
        vm.navigateWeek = navigateWeek;
        vm.weekNumber = weekNumber;
        vm.linkTimeEntry = linkTimeEntry;
        vm.unlinkTimeEntry = unlinkTimeEntry;
        vm.linkAllTimeEntry = linkAllTimeEntry;
        vm.getIssueKeyFromUrl = getIssueKeyFromUrl;

        // first add all.js, then run init
        addAllJs();

        //////

        function init() {
            vm.date = moment();

            if (userIsLoggon()) {
                setCurrentUser();
                setTimes();
            }
        }

        function setJiraProjects() {
            var defer = $q.defer();

            AP.request({
                url: '/rest/api/2/project',
                type: 'GET',
                contentType: 'application/json',
                success: function (response) {
                    vm.jiraProjects = JSON.parse(response);
                    defer.resolve(vm.jiraProjects);
                },
                error: function (reponse) {
                    var error = JSON.parse(reponse.responseText);
                    AP.flag.create({
                        body: error.errorMessages.join(' '),
                        type: 'error',
                        close: 'auto'
                    });
                    defer.reject();
                }
            });

            return defer.promise;
        }

        function setCurrentDomain() {
            var defer = $q.defer();
            
            AP.getLocation(function (pageLocation) {
                vm.currentDomain = 'https://' + pageLocation.replace('https://', '').split('/')[0];
                defer.resolve(vm.pageLocation);   
            });

            return defer.promise;
        }

        function setCurrentUser() {
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

            var q2 = $http.get('https://web.timechimp.com/api/project/uiselect', vm.httpHeader)
                .then(function (response) {
                    vm.projects = response.data;
                }, function (error) {
                    console.log(error)
                });
            
            var q3  = setJiraProjects();

            var q4 = setCurrentDomain();

            $q.all([q1, q2, q3, q4]).then(function () {
                _.each(vm.jiraProjects, function(jiraProject) {
                    jiraProject.externalUrl = vm.currentDomain + '/projects/' + jiraProject.key;
                    jiraProject.externalName = jiraProject.name;
                });
            });
        }

        function setTimes() {
            vm.httpHeader = {
                headers: {
                    'Authorization': 'Bearer ' + vm.currentUser.token
                }
            };

            var date = vm.date.format('YYYY-MM-DD');

            $http.get('https://web.timechimp.com/api/time/week/' + vm.currentUser.id + '/' + date, vm.httpHeader)
                .then(function (response) {
                    vm.times = response.data;
                }, function (error) {
                    console.log(error)
                });
        }

        function getIssueKeyFromNotes(time) {
            if (time.notes) {
                var res = time.notes.match(/[a-zA-Z]+-\d+/g);
                if (res && res.length > 0) {
                    return res[0];
                }
            }
            return '';
        }

        function linkTimeEntry(time) {
            var jiraWorkLog = {
                started: moment(time.date).utc().format('YYYY-MM-DDTHH:mm:00.000+0000'),
                comment: time.notes,
                timeSpentSeconds: time.hours * 60 * 60
            };

            AP.request({
                url: '/rest/api/2/issue/' + time.issueKey + '/worklog',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(jiraWorkLog),
                success: function (responseText) {
                    AP.request('/rest/api/2/issue/' + time.issueKey, {
                        success: function (response) {
                            var issue = JSON.parse(response);

                            time.externalName = issue.key + ': ' + issue.fields.summary;
                            time.externalUrl = vm.currentDomain + '/browse/' + time.issueKey;
        
                            $http.put('https://web.timechimp.com/api/time/' + time.id, time, vm.httpHeader)
                                .then(function (response) {
                                    AP.flag.create({
                                        body: 'Time entry for issue ' + issue.key + ' is linked and issue worklog is created',
                                        type: 'success',
                                        close: 'auto'
                                    });
                                });
                        }
                    });
                },
                error: function (reponse) {
                    var error = JSON.parse(reponse.responseText);
                    AP.flag.create({
                        body: error.errorMessages.join(' '),
                        type: 'error',
                        close: 'auto'
                    });
                }
            });
        }

        function unlinkTimeEntry(time) {
            time.externalName = null;
            time.externalUrl = null;

            $http.put('https://web.timechimp.com/api/time/' + time.id, time, vm.httpHeader)
                .then(function (response) {
                    AP.flag.create({
                        body: 'Time entry is unlinked. Issue worklog has to be removed manually.',
                        type: 'success',
                        close: 'auto'
                    });
                });
        }

        function linkAllTimeEntry() {
            _.each(vm.times, function (time) {
                if (time.issueKey && !time.externalUrl) {
                    linkTimeEntry(time);
                }
            });
        }

        function navigateWeek(weeksToAdd) {
            if (!weeksToAdd) {
                vm.date = moment();
            }
            else {
                vm.date = moment(vm.date).add(weeksToAdd, 'w');
            }

            setTimes();
        }

        function weekNumber() {
            return moment(vm.date).week();
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
                catch(error) {
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
            vm.showProjectMapping = false;
            localStorage.removeItem('jiraTimeChimpLogin');
        }

        function getIssueKeyFromUrl(url) {
            return /[a-zA-Z0-9\-]+$/.exec(url)[0];
        }

        function selectProject(jiraProject, timechimpProject) {
            $http.get('https://web.timechimp.com/api/project/' + timechimpProject.id, vm.httpHeader)
                .then(function (response) {
                    var project = response.data;

                    if (jiraProject) {
                        project.externalName = jiraProject.externalName;
                        project.externalUrl = jiraProject.externalUrl;
                    }
                    else {
                        project.externalName = null;
                        project.externalUrl = null;
                    }

                    $http.put('https://web.timechimp.com/api/project/' + timechimpProject.id, project, vm.httpHeader)
                        .then(function (response) {
                            if (jiraProject) {
                                AP.flag.create({
                                    body: 'Project is mapping is added',
                                    type: 'success',
                                    close: 'auto'
                                });
                            }
                            else {
                                AP.flag.create({
                                    body: 'Project mapping is removed',
                                    type: 'success',
                                    close: 'auto'
                                });
                            }
                        });
                });
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
    }
})();