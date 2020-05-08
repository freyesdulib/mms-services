var config = require('../config/config.js'),
    es = require('elasticsearch'),
    logger = require('../libs/log4'),
    async = require('async'),
    request = require('request'),
    parseString = require('xml2js').parseString,
    client = new es.Client({
        host: config.elasticSearch
    }),
    repo = require('knex')({
        client: 'mysql2',
        connection: {
            host: config.repoHost,
            user: config.repoUser,
            password: config.repoPassword,
            database: config.repoName
        }
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
 * @returns {boolean}
 */
exports.indexAh = function (req, callback) {

    if (req.body === undefined) {

        callback({
            status: 400,
            message: 'Bad Request.'
        });

        return false;
    }

    repo('mms_objects')
        .select('*')
        .where({
            objectType: 'image'
        })
        .then(function (data) {

            var timer = setInterval(function () {

                if (data.length === 0) {
                    logger.module().info('art history records indexed.');
                    clearInterval(timer);
                    return false;
                }

                var record = data.pop();

                let doc = {};
                let json = JSON.parse(record.json);


                for (let prop in json) {

                    if (json[prop][0] !== '') {
                        let es_prop = prop.replace('.', '_');
                        doc[es_prop + '_t'] = json[prop];
                    } else {
                        return false;
                    }
                }

                console.log(record.pid);

                client.index({
                    id: record.pid.replace('mms:', ''),
                    index: 'mms_arthistory',
                    type: 'data',
                    body: doc
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

    callback({
        status: 200,
        data: 'Indexing art history records...'
    });
};

/**
 * creates art history index
 * @param req
 * @param callback
 * @returns {boolean}
 */
exports.createAhIndex = function (req, callback) {
    console.log('creating index...');
    client.indices.create({
        index: 'mms_arthistory',
        body: {
            'settings': {
                'number_of_shards': 3,
                'number_of_replicas': 2
            }
        }
    }).then(function (result) {

        if (result.acknowledged === true) {

            create_ah_mapping(function (result) {
                console.log(result);
            });

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
 * art history mapping
 * @param callback
 */
function create_ah_mapping(callback) {

    let mappingObj = get_ah_mapping(),
        body = {
            properties: mappingObj
        };

    client.indices.putMapping({
        index: 'mms_arthistory',
        type: 'data',
        body: body
    }).then(function (result) {

        if (result.acknowledged === true) {
            callback(true);
            return false;
        } else {
            callback(false);
            return false;
        }
    });
}


/**
 * creates and updates index vocabulary records
 * @param req
 * @param callback
 */
exports.indexVocabRecord = function (req, callback) {

    if (req.body === undefined) {

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

        if (type === 'image_sources') {
            obj.id = doc.imageSourceID;
        }

        if (type === 'instructors') {
            obj.id = doc.instructorID;
        }

        if (type === 'creators') {
            obj.id = doc.id;
        }

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

    function deleteIndex(callback) {

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

    function createIndex(obj, callback) {

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

    function createMapping(obj, callback) {

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

    function indexRecords(obj, callback) {

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

                    if (obj.table === 'image_sources') {
                        record.id = record.imageSourceID;
                    }

                    if (obj.table === 'instructors') {
                        record.id = record.instructorID;
                    }

                    client.index({
                        id: record.id,
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

    });
}

/**
 *
 * @param req
 * @param callback
 * @returns {boolean}
 */
exports.deleteIndex = function (req, callback) {

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

            logger.module().error('ERROR: unable remove record from index. ');

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
exports.createIndex = function (req, callback) {

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
                'number_of_shards': 1,
                'number_of_replicas': 1
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
 * Creates mapping
 * @param req
 * @param callback
 * @returns {boolean}
 */
exports.createMapping = function (req, callback) {

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
                type: 'keyword'
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
                type: 'keyword'
                // fielddata: true
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
                type: 'keyword'
                // fielddata: true
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
 * DEPRECATED
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
 * DEPRECATED
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

    function index(id, callback) {

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

    function getRecordsById(id) {

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
 * DEPRECATED
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

/** DEPRECATED
 *  Returns field mappings
 */
function get_ah_mapping() {

    return {
        "type_arttype_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "title_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "creator_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "coverage_temporal_styleperiod_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "date_created_workdate_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "date_timeperiod_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "description_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "subject_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "format_medium_materialdisplay_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "identifier_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "identifier_master_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "instructor_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "title_alternative_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "source_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "contributor_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "date_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "description_detail_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "format_extent_measurements_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "source_pagenumber_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "coverage_spatial_repository_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "coverage_spatial_collection_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "coverage_spatial_repositoryid_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "coverage_spatial_location_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "rights_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "rights_accessRights_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "rights_license_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "rightsholder_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "creator_alternative_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "description_creatorbio_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "description_nationality_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "description_role_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "coverage_temporal_lifedates_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        },
        "description_source_t": {
            "type": "text",
            "fields": {
                "keyword": {
                    "type": "keyword",
                    "ignore_above": 256
                }
            }
        }
    };
}