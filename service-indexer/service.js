var config = require('../config/config.js'),
    es = require('elasticsearch'),
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

    // TODO: check that body exists, return 400 if it does not.

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
                console.log(error);
                throw error;
            }

            console.log(response);
        });

    } else {

        //create
        obj.index = 'mms_vocabs_local_' + type;
        obj.type = 'data';
        obj.body = doc;

        client.index(obj, function (error, response) {

            if (error) {
                console.log(error);
                throw error;
            }

            console.log(response);
        });
    }

    callback({
        status: 201,
        data: 'Vocab term indexed'
    });
};

/** TODO: ...
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

                // TODO: make use pk as es id  switch statement

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