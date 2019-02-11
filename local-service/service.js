var config = require('../config/config.js'),
    es = require('elasticsearch'),
    validator = require('validator'),
    client = new es.Client({
        host: config.elasticSearch,
        log: 'trace'
    }),
    knex = require('knex')({
        client: 'mysql2',
        connection: {
            host: config.dbHost,
            user: config.dbUser,
            password: config.dbPassword,
            database: config.dbNameVocab
        }
    });

/**
 *
 * @param req
 * @param callback
 */
exports.getServiceInfo = function (req, callback) {

    callback({
        status: 200,
        data: {
            description: 'Controlled Vocabularies Service for MMS Art History application',
            version: 'v3.0'
        }
    });
};

/**
 *
 * @param req
 * @param callback
 */
exports.indexVocabs = function (req, callback) {

    if (req.body.data === undefined) {

        callback({
            status: 400,
            data: 'Bad request.'
        });
    }

    var table = req.body.data;

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

                /*
                if (table === 'image_sources') {

                    record.suggest = {
                        input: record.term.split(''),
                        ouptut: record.term
                    }
                }
                */

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

    if (req.query.term === undefined) {
        callback({
            status: 400,
            message: 'Bad request'

        });
        return false;
    }

    var term = req.query.term;

    search({
        // from: 0,
        // size: 10000,
        index: 'mms_vocabs_local_image_sources',
        body: {
            'query': {
                'bool': {
                   'must': [
                       {
                           'match_phrase_prefix': {
                               'term': {
                                   'query': term,
                                   'max_expansions': 40
                               }
                           }
                       }
                   ]
                }
            }
        }

    }, function (response) {

        var results = {},
            dataArr = [],
            data = response.data;

        for (var i=0;i<data.length;i++) {
            results['imageSourceID'] = data[i]._source.imageSourceID;
            results['term'] = data[i]._source.term;
            results['id'] = data[i]._source.imageSourceID;
            results['label'] = data[i]._source.term;
            dataArr.push(results);
            results = {};
        }

        callback(dataArr);
    });

    return false;
};

/**
 *
 * @param req
 * @param callback
 */
exports.saveLocalSources = function (req, callback) {

    console.log(req.body);


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

exports.deleteIndex = function(req, callback) {

    if (req.body.index === undefined) {

        callback({
            status: 400,
            message: 'Bad request'
        });

        return false;
    }

    var index = req.body.index;

    client.indices.delete({
        index: 'mms_vocabs_local_' + index
    }).then(function (result) {

        if (result.acknowledged === true) {

            callback({
                status: 201,
                message: 'Index deleted'
            });

        } else {

            callback({
                status: 201,
                message: 'Index not deleted'
            });
        }
    });

    return false;
};

exports.createIndex = function(req, callback) {

    if (req.body.index === undefined) {

        callback({
            status: 400,
            message: 'Bad request'
        });

        return false;
    }

    var index = req.body.index;

    client.indices.create({
        index: 'mms_vocabs_local_' + index,
        body: {
            'settings': {
                'number_of_shards': 3,
                'number_of_replicas': 2
            }
        }
    }).then(function (result) {

        if (result.acknowledged === true) {

            callback({
                status: 201,
                message: 'Index created'
            });

        } else {

            callback({
                status: 201,
                message: 'Index not created'
            });
        }

    });

    return false;
};

exports.createMapping = function(req, callback) {

    if (req.body.index === undefined) {

        callback({
            status: 400,
            message: 'Bad request'
        });

        return false;
    }

    var index = req.body.index;

    if (index === 'image_sources') {
        var mappingObj = {
            'imageSourceID': {type: 'integer'},
            'term': {type: 'string'}
        };
    }

    var body = {
        properties: mappingObj
    };

    client.indices.putMapping({
        index: 'mms_vocabs_local_' + index,
        type: 'data',
        body: body
    }).then(function (result) {

        if (result.acknowledged === true) {

            callback({
                status: 201,
                message: 'Mapping created'
            });

        } else {

            callback({
                status: 201,
                message: 'Mapping not created'
            });
        }

    });

    return false;
};