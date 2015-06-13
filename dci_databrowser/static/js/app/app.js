// -*- coding: utf-8 -*-
//
// Copyright 2015 Red Hat, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License"); you may
// not use this file except in compliance with the License. You may obtain
// a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
// WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
// License for the specific language governing permissions and limitations
// under the License.

'use strict';

var app = angular.module('app', ['ngRoute', 'restangular', 'ngCookies',
'angular-loading-bar', 'ui.router']);

// Configure the application
app.config(function(RestangularProvider) {
    RestangularProvider.setBaseUrl('/api');
    // https://github.com/mgonto/restangular#my-response-is-actually-wrapped-with-some-metadata-how-do-i-get-the-data-in-that-case
    RestangularProvider.addResponseInterceptor(function(
    data, operation, what, url, response, deferred) {
        var extractedData = [];
        if (operation === 'getList') {
            extractedData._items = data._items;
            extractedData._meta = data._meta;
        } else {
            extractedData = data;
        }
        return extractedData;
    });
});

app.config(function($stateProvider, $urlRouterProvider, $httpProvider) {
    $stateProvider
    .state('jobs', {
        url: '/jobs?page',
        //params: { page: "1" },
        templateUrl: 'partials/jobs.html',
        controller: 'ListJobsController'
    }).state('jobdetails', {
        url:'jobdetails/:jobId',
        templateUrl: 'partials/jobdetails.html',
        controller: 'JobDetailsController'
    }).state('remotecis', {
        url:'/remotecis',
        templateUrl: 'partials/remotecis.html',
        controller: 'ListRemotecisController'
    }).state('signin', {
        url: '/signin',
        templateUrl: 'partials/signin.html',
        controller: 'LoginController'
    }).state('signout', {
        url: '/signout',
        templateUrl: 'partials/signout.html',
        controller: 'LogoutController'
    });

    $httpProvider.interceptors.push('BasicAuthInjector');
});

app.factory('CommonCode', function($window, Restangular, $cookies) {
    // jscs:disable requireCamelCaseOrUpperCaseIdentifiers

    var getRemoteCis = function($scope) {
        Restangular.one('remotecis').get().then(
            function(remotecis) {
                $scope.remotecis = remotecis._items;
                $cookies.remotecisTotalPages = parseInt((
                remotecis._meta.total / remotecis._meta.max_results + 1));
                $scope.remotecisTotalPages = $cookies.remotecisTotalPages;
            }
        );
    };

    var getJobInfo = function($scope, job_id) {
        Restangular.one('jobs', job_id).get(
        {'embedded': {'remoteci':1, 'testversion':1}}).then(
        function(job) {
            $scope.job = job;
            Restangular.one('jobstates').get(
                {'where': {'job_id': job_id},
                 'embedded': {'files_collection':1}}).then(
                 function(jobstates) {
                     console.log(jobstates);
                     $scope.job['jobstates'] = jobstates._items;
                 });

            Restangular.one('testversions', job.testversion.id.id).get(
                {'embedded': {'version':1, 'test':1}}).then(
                function(testversion) {
                    $scope.job['version'] = testversion.version.id.name;
                    $scope.job['test'] = testversion.test.id.name;
                    Restangular.one('products',
                    testversion.version.id.product_id).get().then(
                        function(product) {
                            $scope.job['product'] = product.name;
                        }
                )});
        });
    };

    var aggregateJobInfo = function($scope, targetPage) {

        Restangular.one('jobs').get({'page': targetPage,
        'embedded': {'remoteci':1, 'testversion':1}}).then(
        function(jobs) {
            for (var i = 0; i < jobs._items.length; i++) {
                // Get the last status and the last update date
                (function(localI) {
                    Restangular.one('jobstates').get(
                    {'where': {'job_id': jobs._items[localI].id}}).then(
                      function(jobstates) {
                          length = jobstates._items.length;
                          jobs._items[localI]['updated_at'] =
                              jobstates._items[length - 1].updated_at;
                          jobs._items[localI]['status'] =
                              jobstates._items[length - 1].status;
                          jobs._items[localI]['jobstates'] = jobstates
                      });
                })(i);

                // Get the product name, the version and the test name
                (function(localI) {
                    Restangular.one('testversions',
                    jobs._items[localI].testversion_id).get(
                    {'embedded': {'version':1, 'test':1}}).then(
                        function(testversion) {
                            jobs._items[localI]['version'] =
                                testversion.version.id.name;
                            jobs._items[localI]['test'] =
                                testversion.test.id.name;

                            Restangular.one('products',
                            testversion.version.id.product_id).get().then(
                            function(product) {
                                jobs._items[localI]['product'] = product.name;
                            }
                            )
                        }
                    );
                })(i);
            }

            $scope.jobs = jobs._items;
            $cookies.jobsTotalPages = parseInt((jobs._meta.total /
                jobs._meta.max_results + 1));
            $scope.jobsTotalPages = $cookies.jobsTotalPages;
        });
    };

    return {'aggregateJobInfo': aggregateJobInfo,
            'getJobInfo': getJobInfo,
            'getRemoteCis': getRemoteCis};
});

app.factory('BasicAuthInjector', function($cookies) {
    var injector = {
        request: function(config) {
            config.headers['Authorization'] = 'Basic ' + $cookies.auth;
            return config;
        }
    };
    return injector;
});

app.controller('ListJobsController', function($scope, $location, $cookies,
CommonCode, Restangular, $state, $stateParams) {

    var loadPage = function() {
        var targetPage = $scope.jobCurrentPage;
        var searchObject = $location.search();
        if (searchObject.page != undefined) {
            var totalPages = $cookies.jobsTotalPages;
            var pageNumber = parseInt(searchObject.page);

            if ((pageNumber < ((parseInt(totalPages) + 1) | 0)) &&
                (pageNumber > 1)) {
                targetPage = parseInt(searchObject.page);
                $scope.jobCurrentPage = targetPage;
            }
        }

        CommonCode.aggregateJobInfo($scope, targetPage);
    };

    $scope.jobsNextPage = function() {
        if ($scope.jobCurrentPage < $cookies.jobsTotalPages) {
            $scope.jobCurrentPage++;
            $state.go('jobs', {page:$scope.jobCurrentPage});
        }
    }

    $scope.jobsPreviousPage = function() {
        if ($scope.jobCurrentPage > 1) {
            $scope.jobCurrentPage--;
            $state.go('jobs', {page:$scope.jobCurrentPage});
        }
    }

    if ($scope.jobCurrentPage == undefined) {
        $scope.jobCurrentPage = 1;
    }

    loadPage();
});

app.controller('ListRemotecisController', function($scope, $location,
CommonCode, Restangular) {

    $scope.remotecisNextPage = function() {
        if ($scope.remoteciCurrentPage < $cookies.remotecisTotalPages) {
            $scope.remoteciCurrentPage++;
            $state.go('jobs', {page:$scope.jobCurrentPage});
        }
    }

    $scope.remotecisPreviousPage = function() {
        if ($scope.remoteciCurrentPage > 1) {
            $scope.remoteciCurrentPage--;
            $state.go('jobs', {page:$scope.remoteciCurrentPage});
        }
    }

    if ($scope.remoteciCurrentPage == undefined) {
        $scope.remoteciCurrentPage = 1;
    }
    CommonCode.getRemoteCis($scope);
});

app.controller('JobDetailsController', function(
    $scope, CommonCode, Restangular, $stateParams) {
    CommonCode.getJobInfo($scope, $stateParams.jobId);
});

app.controller('LoginController', ['$scope', '$cookies', '$state',
    function($scope, $cookies, $state) {
        $scope.submit = function() {
            var loginb64 = btoa($scope.username.concat(':', $scope.password));
            $cookies.auth = loginb64;
            $state.go('jobs');
        };
    }
]);

app.controller('LogoutController', ['$scope', '$templateCache',
'$cookies', '$state',
  function($scope, $templateCache, $cookies, $state) {
      $templateCache.removeAll();
      $cookies.auth = btoa('None');
      $state.go('jobs');
  }
]);