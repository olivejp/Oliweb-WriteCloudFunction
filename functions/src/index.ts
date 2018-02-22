import * as fbfunctions from 'firebase-functions';

const _ = require('lodash');
const elasticsearch = require('elasticsearch');


// Observe /requests child on Firebase Database.
// Call ElasticSearch with the query parameters and write the result from ES to /requests/{requestId}/results in Firebase Database.
// This way the mobile application never talk to ES directly
exports.observeRequest = fbfunctions.database.ref('/requests/{requestId}/')
    .onWrite(event => {

        // Récupération de la requête et de son Id
        let requestData = event.data.val();
        let requestId = event.params.requestId;

        // We want avoid infinite loop, so we continue only if results === null
        if (requestData.results === null) {

            console.log('Request ', requestId, requestData);

            let elasticSearchConfig = fbfunctions.config().elasticsearch;

            // Définition d'un client elasticsearch
            var client = new elasticsearch.Client({
                host: [{
                    host: elasticSearchConfig.url,
                    auth: elasticSearchConfig.username + ':' + elasticSearchConfig.password,
                }],
                log: 'debug'
            });


            // Récupération des paramètres de notre recherche
            var pageNum = requestData.page;
            var perPage = requestData.perPage;
            var search_query = requestData.searchQuery;

            // Lancement de la recherche
            client.search({
                index: 'annonces',
                type: 'annonce',
                from: (pageNum - 1) * perPage,
                size: perPage,
                body: {
                    query: {
                        multi_match: {
                            query: search_query,
                            fields: '["titre^3","description"]'
                        }
                    }
                }
            }).then(resp => {
                // Récupération du résultat et écriture dans notre FirebaseDatabase
                let hits = resp.hits.hits;
                event.data.ref.child('results')
                    .set(hits, a => {
                        // Ecriture en base de données échouée.
                        console.log('Insertion dans results échouée : ' + a.message);
                    })
                    .then(value => console.log('Insertion dans results réussie'));
            }, reason => console.log(reason.message));
        }
    });