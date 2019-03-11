var config = require('../config/config.js'),
    es = require('elasticsearch'),
    logger = require('../libs/log4'),
    async = require('async'),
    request = require('request'),
    parseString = require('xml2js').parseString;
    client = new es.Client({
        host: config.elasticSearch
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
 * creates and updates index vocabulary records
 * @param req
 * @param callback
 */
exports.indexVocabRecord = function (req, callback) {

    console.log('index vocab record', req.body);

    if (req.body !== undefined) {

        logger.module().error('ERROR: Bad request.');

        callback({
            status: 400,
            data: 'Bad request.'
        });

        return false;
    }

    var doc = req.body.obj,
        type = req.body.type,
        obj = {};

    if (doc._id !== undefined) {

        //update
        obj.id = doc._id;
        delete doc._id;

        obj.index = 'mms_vocabs_local_' + type;
        obj.type = 'data';
        obj.body = {
            doc: doc
        };

        client.update(obj, function (error, response) {

            if (error) {
                logger.module().error('ERROR: Unable to update record. ' + error);
                throw 'ERROR: Unable to update record. ' + error;
            }
        });

    } else {

        //create
        obj.index = 'mms_vocabs_local_' + type;
        obj.type = 'data';
        obj.body = doc;

        client.index(obj, function (error, response) {

            if (error) {
                logger.module().error('ERROR: Unable to index record.');
                throw 'ERROR: Unable to index record.';
            }
        });
    }

    callback({
        status: 201,
        data: 'Vocab term indexed'
    });
};

/**
 * Indexes all vocabulary records
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

    function deleteIndex (callback) {

        var obj = {};
        obj.table = table;

        request.post({
            url: config.mmsServices + 'vocabs/index/delete',
            form: {
                'index': obj.table
            }
        }, function (error, httpResponse, body) {

            if (error) {
                logger.module().error('ERROR: indexer error ' + error + ' (deleteIndex)');
                obj.isIndexDeleted = false;
                callback(null, obj);
                return false;
            }

            if (httpResponse.statusCode === 201) {
                logger.module().info('INFO: index deleted');
                obj.isIndexDeleted = true;
                callback(null, obj);
                return false;
            } else {
                logger.module().error('ERROR: http error ' + body + ' (deleteIndex)');
                obj.isIndexDeleted = false;
                callback(null, obj);
                return false;
            }
        });
    }

    function createIndex (obj, callback) {

        if (obj.isIndexDeleted === false) {
            callback(null, obj);
            return false;
        }

        request.post({
            url: config.mmsServices + 'vocabs/index/create',
            form: {
                'index': obj.table
            }
        }, function (error, httpResponse, body) {

            if (error) {
                logger.module().error('ERROR: indexer error ' + error + ' (createIndex)');
                obj.indexCreated = false;
                return false;
            }

            if (httpResponse.statusCode === 201) {
                logger.module().info('INFO: index created');
                obj.indexCreated = true;
                callback(null, obj);
                return false;
            } else {
                logger.module().error('ERROR: http error ' + body + ' (createIndex)');
                obj.indexCreated = false;
                return false;
            }
        });
    }

    function createMapping (obj, callback) {

        if (obj.isIndexDeleted === false || obj.indexCreated === false) {
            callback(null, obj);
            return false;
        }

        request.post({
            url: config.mmsServices + 'vocabs/mapping/create',
            form: {
                'index': obj.table
            }
        }, function (error, httpResponse, body) {

            if (error) {
                logger.module().error('ERROR: indexer error ' + error + ' (createMapping)');
                obj.mappingCreated = false;
                return false;
            }

            if (httpResponse.statusCode === 201) {
                logger.module().info('INFO: mapping created');
                obj.mappingCreated = true;
                callback(null, obj);
                return false;
            } else {
                logger.module().error('ERROR: http error ' + body + ' (createMapping)');
                obj.mappingCreated = false;
                return false;
            }
        });
    }

    function indexRecords (obj, callback) {

        if (obj.isIndexDeleted === false || obj.indexCreated === false) {
            callback(null, obj);
            return false;
        }

        knex('local_' + obj.table)
            .select('*')
            .then(function (data) {

                var timer = setInterval(function () {

                    if (data.length === 0) {
                        logger.module().info(obj.table + ' indexed.');
                        clearInterval(timer);
                        return false;
                    }

                    var record = data.pop();

                    client.index({
                        index: 'mms_vocabs_local_' + obj.table,
                        type: 'data',
                        body: record
                    }, function (error, response) {

                        if (error) {
                            logger.module().error('ERROR: unable to indexed record. ' + error);
                            throw 'ERROR: unable to indexed record. ' + error;
                        }
                    });

                }, 100);
            })
            .catch(function (error) {
                logger.module().error('ERROR: unable to get record. ' + error);
                throw 'ERROR: unable to get record. ' + error;
            });
    }

    async.waterfall([
        deleteIndex,
        createIndex,
        createMapping,
        indexRecords
    ], function (error, results) {

        if (error) {
            logger.module().error('ERROR: async (indexVocabs)');
        }

        console.log(results);

        // logger.module().info('INFO: index created');
        // console.log('repoObj: ', results);
    });

    callback({
        status: 200,
        data: 'Indexing ' + table + '...'
    });
};

/**
 *
 * @param pid
 * @param json
 */
function createDocument(pid, json) {

    console.log('Indexing mms:' + pid + '...');

    client.index({
        index: client.index,
        id: pid,
        type: 'data',
        body: json.dc
    }, function (error, response) {

        if (error) {
            console.log(error);
        }

        console.log(response);
    });
}

/**
 *
 * @param req
 * @param callback
 * @returns {boolean}
 */
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

            // TODO: log

            callback({
                status: 201,
                message: 'Index not deleted'
            });
        }
    });

    return false;
};

/**
 *
 * @param req
 * @param callback
 * @returns {boolean}
 */
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

/**
 *
 * @param req
 * @param callback
 * @returns {boolean}
 */
exports.createMapping = function(req, callback) {

    if (req.body.index === undefined) {

        callback({
            status: 400,
            message: 'Bad request'
        });

        return false;
    }

    var index = req.body.index;

    if (index === 'art_types') {
        var mappingObj = {
            'artTypeID': {type: 'integer'},
            'term': {
                type: 'string',
                fielddata: true
            }
        };
    }

    if (index === 'creators') {
        var mappingObj = {
            'id': {type: 'integer'},
            'preferred_terms_term_text': {type: 'string'},
            'non_preferred_terms_term_text': {type: 'string'},
            'preferred_biographies_biography_text': {type: 'string'},
            'lifedates': {type: 'string'},
            'nationalities': {type: 'string'},
            'role_id': {type: 'string'},
            'preferred_biographies_birth_date': {type: 'string'},
            'preferred_biographies_death_date': {type: 'string'},
            'preferred_terms_source_id': {type: 'string'},
            'preferred_biographies_sex': {type: 'string'}
        };
    }

    if (index === 'image_sources') {
        var mappingObj = {
            'imageSourceID': {type: 'integer'},
            'term': {
                type: 'string',
                fielddata: true
            }
        };
    }

    if (index === 'instructors') {
        var mappingObj = {
            'instructorID': {type: 'integer'},
            'term': {
                type: 'string',
                fielddata: true
            }
        };
    }

    if (index === 'subjects') {
        var mappingObj = {
            'id': {type: 'integer'},
            'preferred_terms_term_text': {type: 'string'}
        };
    }

    if (index === 'timeperiods') {
        var mappingObj = {
            'timeperiodID': {type: 'integer'},
            'term': {
                type: 'string',
                fielddata: true
            }
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

/**
 * TODO:...
 * @param pid
 */
exports.realTimeIndex = function (pid) {

    knex('mms_objects').where({
        pid: pid,
        isCataloged: 1
    }).select('pid', 'xml')
        .then(function (data) {

            if (data.length === 1) {

                var pid = data[0].pid.replace('mms:', '');
                var xml = data[0].xml;
                var tmp;

                parseString(xml, function (err, json) {

                    if (err) {
                        return console.log(err);
                    }

                    tmp = json.dc['date.created'][0].replace('.0', '');
                    json.dc['date.created'] = [tmp];

                    createDocument(pid, json);
                    knex.destroy;
                });
            }

        }).catch(function (error) {
        console.log(error);
    });
};

/**
 *
 * @param req
 * @param callback
 */
exports.fullIndex = function (req, callback) {

    var collection = req.body.collection;
    var collection_id;

    if (collection === 'arthistory') {
        collection_id = 2;
    } else if (collection === 'ereserves') {
        collection_id = 1;
    }

    /**
     *
     * @param id
     * @param callback
     */
    function index (id, callback) {

        knex('mms_objects').where({
            collectionID: id,
            isCataloged: 1
        }).select('objectID')
            .then(function (data) {
                callback(data);
            }).catch(function (error) {
            console.log(error);
        });
    }

    /**
     *
     * @param id
     */
    function getRecordsById (id) {

        knex('mms_objects').where({
            objectID: id
        }).select('pid', 'xml')
            .then(function (data) {

                if (data.length === 1) {

                    var pid = data[0].pid.replace('mms:', '');
                    var xml = data[0].xml;
                    var tmp;

                    parseString(xml, function (err, json) {

                        if (err) {
                            return console.log(err);
                        }

                        tmp = json.dc['date.created'][0].replace('.0', '');
                        json.dc['date.created'] = [tmp];

                        createDocument(pid, json);
                        knex.destroy;
                    });
                }

            }).catch(function (error) {
            console.log(error);
        });
    }

    /**
     * @param collection_id
     */
    index(collection_id, function (data) {

        var indexTimer = setInterval(function () {

            if (data.length === 0) {
                clearInterval(indexTimer);
                console.log('Indexing complete.');
            } else {
                var id = data.pop();
                getRecordsById(id.objectID);
            }

        }, 40);
    });
};

/**
 *
 * @param id
 */
exports.getRecordsById = function (id) {

    knex('mms_objects').where({
        objectID: id
    }).select('pid', 'xml')
        .then(function (data) {

            if (data.length === 1) {

                var pid = data[0].pid.replace('mms:', '');
                var xml = data[0].xml;
                var tmp;

                parseString(xml, function (err, json) {

                    if (err) {
                        return console.log(err);
                    }

                    tmp = json.dc['date.created'][0].replace('.0', '');
                    json.dc['date.created'] = [tmp];

                    createDocument(pid, json);
                    knex.destroy;
                });
            }

        }).catch(function (error) {
        console.log(error);
    });
};