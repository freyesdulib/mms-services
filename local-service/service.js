var config = require('../config/config.js'),
    es = require('elasticsearch'),
    validator = require('validator'),
    client = new es.Client({
        host: config.elasticSearch,
        log: 'trace'
    });

/**
 *
 * @param req
 * @param callback
 */
exports.indexVocabs = function (req, callback) {

    var table = req.body.data;

    if (req.body.data === undefined) {

        callback({
            status: 400,
            data: 'Bad request.'
        });
    }

    knex('local_' + table)
        .select('*')
        .then(function (data) {

            var timer = setInterval(function () {

                if (data.length === 0) {
                    console.log(table + ' indexed.');
                    clearInterval(timer);
                    return false;
                }

                var record = data.pop();

                client.index({
                    index: 'mms_vocabs_local_' + table,
                    type: 'data',
                    body: record
                }, function (error, response) {

                    if (error) {
                        console.log(error);
                        throw error;
                    }

                    console.log(response);
                });

            }, 100);
        })
        .catch(function (error) {
            console.log(error);
            throw error;
        });

    callback({
        status: 200,
        data: 'Indexing ' + table + '...'
    });
};

/**
 *
 * @param req
 * @param callback
 * @returns {boolean}
 */
exports.getLocalCreators = function(req, callback) {

    var term = validator.trim(req.query.term);

    if (term === undefined) {

        callback({
            status: 400,
            data: 'Bad request.'
        });

        return false;
    }

    search({
        from: 0,
        size: 10000,
        index: 'mms_vocabs_local_creators',
        body: {
            'query': {
                'multi_match': {
                    'query': term,
                    'fields': [
                        'preferred_terms_term_text^2',
                        'non_preferred_terms_term_text'
                    ],
                    'type': 'best_fields'
                }
            }}
    }, function (response) {
        callback(response);
    });

    return false;
};

/**
 *
 * @param req
 * @param callback
 * @returns {boolean}
 */
exports.getLocalSources = function(req, callback) {

    var term = req.query.term;

    search({
        from: 0,
        size: 10000,
        index: 'mms_vocabs_local_image_sources',
        q: term

    }, function (response) {
        callback(response);
    });

    return false;
};

/**
 *
 * @param req
 * @param callback
 * @returns {boolean}
 */
exports.getArtTypes = function(req, callback) {

    search({
        from: 0,
        size: 10000,
        index: 'mms_vocabs_local_art_types',
        body: {
            'query' : {
                'match_all' : {}
            }
        },
        'sort': ['term']

    }, function (response) {
        callback(response);
    });

    return false;
};

/**
 *
 * @param req
 * @param callback
 * @returns {boolean}
 */
exports.getTimePeriods = function(req, callback) {

    search({
        from: 0,
        size: 10000,
        index: 'mms_vocabs_local_timeperiods',
        body: {
            'query' : {
                'match_all' : {}
            }
        },
        'sort': ['term']

    }, function (response) {
        callback(response);
    });

    return false;
};

/**
 *
 * @param req
 * @param callback
 * @returns {boolean}
 */
exports.getInstructors = function(req, callback) {

    search({
        from: 0,
        size: 10000,
        index: 'mms_vocabs_local_instructors',
        body: {
            'query' : {
                'match_all' : {}
            }
        },
        'sort': ['term']

    }, function (response) {
        callback(response);
    });

    return false;
};

/**
 *
 * @param obj
 * @param callback
 */
var search = function (obj, callback) {

    client.search(obj).then(function (body) {

        callback({
            status: 200,
            data: body.hits.hits,
            message: 'Search results'
        });

    }, function (error) {
        console.log(error);
        callback({
            status: 500,
            data:[],
            message: 'Error'
        });
    });
};