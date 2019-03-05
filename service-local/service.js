var config = require('../config/config.js'),
    es = require('elasticsearch'),
    validator = require('validator'),
    request = require('request'),
    client = new es.Client({
        host: config.elasticSearch
        // log: 'trace'
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
 * @returns {boolean}
 */
exports.getLocalCreators = function (req, callback) {

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
            }
        }
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
exports.getLocalCreatorsById = function (req, callback) {

    var id = validator.trim(req.query.id);

    if (id === undefined) {

        callback({
            status: 400,
            data: 'Bad request.'
        });

        return false;
    }

    search({
        from: 0,
        size: 1,
        index: 'mms_vocabs_local_creators',
        body: {
            'query': {
                'match_phrase': {
                    'id': id
                }
            }
        }

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
exports.getLocalSources = function (req, callback) {

    if (req.query.term === undefined) {
        callback({
            status: 400,
            message: 'Bad request'

        });
        return false;
    }

    var term = req.query.term;

    search({
        from: 0,
        size: 10,
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

        for (var i = 0; i < data.length; i++) {
            results['_id'] = data[i]._id;
            // results['imageSourceID'] = data[i]._source.imageSourceID;
            // results['term'] = data[i]._source.term;
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

    var action = req.body.action,
        term = req.body.term;

    if (action === 'saveimagesource') {

        var obj = {};
        obj.term = term;

        knex('local_image_sources')
            .insert(obj)
            .then(function (data) {

                obj.imageSourceID = data[0];

                request.post({
                    url: config.mmsServices + 'vocabs/index/record',
                    form: {
                        'obj': obj,
                        'type': 'image_sources'
                    }
                }, function (error, httpResponse, body) {

                    if (error) {
                        // logger.module().fatal('FATAL: unable to begin transfer ' + error + ' (queue_objects)');
                        callback('Not Created');
                        throw 'ERROR: unable to index record';
                    }

                    if (httpResponse.statusCode === 201) {
                        // logger.module().info('INFO: record indexed');
                        callback('Created');
                        return false;
                    } else {
                        // logger.module().fatal('FATAL: unable to index record');
                        callback('Not Created');
                        throw 'FATAL: unable to index record';
                    }
                });
            })
            .catch(function (error) {
                // logger.module().error('ERROR: unable to save local source (saveLocalSources) ' + error);
                throw 'ERROR: unable to save local source (saveLocalSources) ' + error;
            });
    }

    if (action === 'updateimagesource') {

        var id = req.body.id[0],
            _id = req.body._id[0];

        var obj = {};
        obj.imageSourceID = id;
        obj.term = term;

        knex('local_image_sources')
            .where({
                imageSourceID: id
            })
            .update(obj)
            .then(function (data) {

                obj._id = _id;

                request.post({
                    url: config.mmsServices + 'vocabs/index/record',
                    form: {
                        'obj': obj,
                        'type': 'image_sources'
                    }
                }, function (error, httpResponse, body) {

                    if (error) {
                        // logger.module().fatal('FATAL: unable to begin transfer ' + error + ' (queue_objects)');
                        callback('Not Created');
                        throw 'ERROR: unable to index record';
                    }

                    if (httpResponse.statusCode === 201) {
                        // logger.module().info('INFO: record indexed');
                        callback('Created');
                        return false;
                    } else {
                        // logger.module().fatal('FATAL: unable to index record');
                        callback('Not Created');
                        throw 'FATAL: unable to index record';
                    }
                });


            })
            .catch(function (error) {
                // TODO: log
                console.log(error);
                throw error;
            });
    }
};

/**
 *
 * @param req
 * @param callback
 */
exports.saveLocalCreators = function (req, callback) {

    var action = req.body.action,
        record = req.body;

    if (action === 'savelocalcreator') {

        delete record['action'];

        var obj = {};
        obj.preferred_terms_term_text = record['creator'].toString();
        obj.non_preferred_terms_term_text = record['creator.alternative'].toString();
        obj.nationalities = record['description.nationality'].toString();
        obj.role_id = record['description.role'].toString();
        obj.preferred_biographies_biography_text = record['description.creatorbio'].toString();
        obj.preferred_biographies_sex = record['sex'].toString();
        obj.preferred_terms_source_id = record['source'].toString();
        obj.preferred_biographies_birth_date = record['earliestdates'].toString();
        obj.preferred_biographies_death_date = record['latestdates'].toString();

        knex('local_creators')
            .insert(obj)
            .then(function (data) {

                var id = data[0];

                obj.id = id;

                request.post({
                    url: config.mmsServices + 'vocabs/index/record',
                    form: {
                        'obj': obj,
                        'type': 'creators'
                    }
                }, function (error, httpResponse, body) {

                    if (error) {
                        // logger.module().fatal('FATAL: unable to begin transfer ' + error + ' (queue_objects)');
                        callback('Not Created');
                        throw 'ERROR: unable to index record';
                    }

                    if (httpResponse.statusCode === 201) {
                        // logger.module().info('INFO: record indexed');
                        callback('Created');
                        return false;
                    } else {
                        // logger.module().fatal('FATAL: unable to index record');
                        callback('Not Created');
                        throw 'FATAL: unable to index record';
                    }
                });
            })
            .catch(function (error) {
                // logger.module().error('ERROR: unable to save local source (saveLocalSources) ' + error);
                throw 'ERROR: unable to save local source (saveLocalSources) ' + error;
            });
    }

    if (action === 'updatelocalcreator') {

        var id = record['id'].toString(),
            _id = record['_id'].toString();

        var obj = {};
        obj.id = id;
        obj.preferred_terms_term_text = record['creator'].toString();
        obj.non_preferred_terms_term_text = record['creator.alternative'].toString();
        obj.nationalities = record['description.nationality'].toString();
        obj.role_id = record['description.role'].toString();
        obj.preferred_biographies_biography_text = record['description.creatorbio'].toString();
        obj.preferred_biographies_sex = record['sex'].toString();
        obj.preferred_terms_source_id = record['source'].toString();
        obj.preferred_biographies_birth_date = record['earliestdates'].toString();
        obj.preferred_biographies_death_date = record['latestdates'].toString();

        knex('local_creators')
            .where({
                id: id
            })
            .update(obj)
            .then(function (data) {

                obj._id = _id;

                request.post({
                    url: config.mmsServices + 'vocabs/index/record',
                    form: {
                        'obj': obj,
                        'type': 'creators'
                    }
                }, function (error, httpResponse, body) {

                    if (error) {
                        // logger.module().fatal('FATAL: unable to begin transfer ' + error + ' (queue_objects)');
                        callback('Not Created');
                        throw 'ERROR: unable to index record';
                    }

                    if (httpResponse.statusCode === 201) {
                        // logger.module().info('INFO: record indexed');
                        callback('Created');
                        return false;
                    } else {
                        // logger.module().fatal('FATAL: unable to index record');
                        callback('Not Created');
                        throw 'FATAL: unable to index record';
                    }
                });
            })
            .catch(function (error) {
                // TODO: log
                console.log(error);
                throw error;
            });
    }
};

/**
 *
 * @param req
 * @param callback
 */
exports.saveLocalInstructors = function (req, callback) {

    var action = req.body.action,
        record = req.body;

    if (action === 'saveinstructor') {

        delete record['action'];

        knex('local_instructors')
            .insert(record)
            .then(function (data) {

                var obj = {};
                obj.instructorID = data[0];
                obj.term = record.term;

                request.post({
                    url: config.mmsServices + 'vocabs/index/record',
                    form: {
                        'obj': obj,
                        'type': 'instructors'
                    }
                }, function (error, httpResponse, body) {

                    if (error) {
                        // logger.module().fatal('FATAL: unable to begin transfer ' + error + ' (queue_objects)');
                        callback('Not Created');
                        throw 'ERROR: unable to index record';
                    }

                    if (httpResponse.statusCode === 201) {
                        // logger.module().info('INFO: record indexed');
                        callback('Created');
                        return false;
                    } else {
                        // logger.module().fatal('FATAL: unable to index record');
                        callback('Not Created');
                        throw 'FATAL: unable to index record';
                    }
                });
            })
            .catch(function (error) {
                // logger.module().error('ERROR: unable to save local source (saveLocalSources) ' + error);
                throw 'ERROR: unable to save local source (saveLocalSources) ' + error;
            });
    }

    if (action === 'updateinstructor') {

        var id = req.body.id[0],
            _id = req.body._id[0],
            term = req.body.term;

        knex('local_instructors')
            .where({
                instructorID: id
            })
            .update({
                term: term
            })
            .then(function (data) {

                var obj = {};
                obj._id = _id;
                obj.term = term;
                obj.instructorID = id;

                request.post({
                    url: config.mmsServices + 'vocabs/index/record',
                    form: {
                        'obj': obj,
                        'type': 'instructors'
                    }
                }, function (error, httpResponse, body) {

                    if (error) {
                        // logger.module().fatal('FATAL: unable to begin transfer ' + error + ' (queue_objects)');
                        callback('Not Created');
                        throw 'ERROR: unable to index record';
                    }

                    if (httpResponse.statusCode === 201) {
                        // logger.module().info('INFO: record indexed');
                        callback('Created');
                        return false;
                    } else {
                        // logger.module().fatal('FATAL: unable to index record');
                        callback('Not Created');
                        throw 'FATAL: unable to index record';
                    }
                });
            })
            .catch(function (error) {
                // TODO: log
                console.log(error);
                throw error;
            });
    }
};

/**
 *
 * @param req
 * @param callback
 * @returns {boolean}
 */
exports.getArtTypes = function (req, callback) {

    search({
        from: 0,
        size: 10000,
        index: 'mms_vocabs_local_art_types',
        body: {
            'query': {
                'match_all': {}
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
exports.getTimePeriods = function (req, callback) {

    search({
        from: 0,
        size: 10000,
        index: 'mms_vocabs_local_timeperiods',
        body: {
            'query': {
                'match_all': {}
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
exports.getInstructors = function (req, callback) {

    search({
        from: 0,
        size: 10000,
        index: 'mms_vocabs_local_instructors',
        body: {
            'query': {
                'match_all': {}
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
            data: [],
            message: 'Error'
        });
    });
};