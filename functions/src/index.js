"use strict";
exports.__esModule = true;
var fbfunctions = require("firebase-functions");
var elasticsearch = require('elasticsearch');
var _ = require('lodash');
var request = require('request-promise');
// Observe request table on firebase.
// Call ElasticSearch with the query and write the result from ES to results table on Firebase.
// This way the mobile application never talk to ES directly
exports.observeRequest = fbfunctions.database.ref('/request/{requestId}/')
    .onWrite(function (event) {
    var requestData = event.data.val();
    var requestId = event.params.requestId;
    console.log('Request ', requestId, requestData);
    var elasticSearchConfig = fbfunctions.config().elasticsearch;
    var elasticSearchUrl = elasticSearchConfig.url + 'annonces/';
    var client = new elasticsearch.Client({
        host: elasticSearchConfig.url,
        log: 'debug'
    });
    var elasticsearchRequest = {
        method: 'POST',
        uri: elasticSearchUrl,
        auth: {
            username: elasticSearchConfig.username,
            password: elasticSearchConfig.password
        },
        body: _.pick(requestData, 'te'),
        json: true
    };
    return request(elasticsearchRequest).then(function (response) {
        console.log('Elasticsearch response', response);
    });
});
