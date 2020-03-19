'use strict';

const config = require('../config/config.js'),
    parseString = require('xml2js').parseString,
    async = require('async'),
    identifier = require('../libs/pid_gen'),
    es = require('elasticsearch'),
    client = new es.Client({
        host: config.elasticSearch
    }),
    knex = require('knex')({
        client: 'mysql2',
        connection: {
            host: config.repoHost,
            user: config.repoUser,
            password: config.repoPassword,
            database: config.repoName
        }
    });

/**
 *
 * @param req
 * @param callback
 */
exports.convert = function(req, callback) {

    knex('mms_objects')
        .select('pid', 'xml')
        .where({
            objectType: 'image'
        })
        .then(function (data) {

            let timer = setInterval(function() {

                if (data.length === 0) {
                    clearInterval(timer);
                    return false;
                }

                let record = data.pop();

                if (record.xml !== '') {

                    parseString(record.xml, function (error, result) {

                        if (error) {
                            console.log(error);
                            return false;
                        }

                        console.log(result.dc);

                        let pid = record.pid;
                        let json = JSON.stringify(result.dc);

                        knex('mms_objects')
                            .where({
                                pid: pid
                            })
                            .update({
                                json: json
                            })
                            .then(function(data) {
                                console.log(data);
                            })
                            .catch(function(error) {
                                console.log(error);
                            });
                    });
                }

            }, 550);

        })
        .catch(function (error) {
            // logger.module().error('ERROR: unable to get metadata ' + error);
            throw 'ERROR: unable to convert metadata ' + error;
        });

    callback({
        status: 200,
        data: 'converting...'
    });

};

/**
 * gets metadata
 * @param req
 * @param callback
 */
exports.get_metadata = function (req, callback) {

    if (req.query.pid === undefined) {

        callback({
            status: 400,
            message: 'Bad Request.'
        });

        return false;
    }

   let pid = 'mms:' + req.query.pid;

    knex('mms_objects')
        .where({
            pid: pid
        })
        .then(function (data) {

            console.log(JSON.parse(data[0].json));

            callback({
                status: 200,
                data: JSON.parse(data[0].json)
            });

            /*
            parseString(data[0].xml, function (error, result) {

                if (error) {

                    callback({
                        status: 500
                    });

                    return false;
                }

                callback({
                    status: 200,
                    data: result.dc
                });
            });
            */
        })
        .catch(function (error) {
            // logger.module().error('ERROR: unable to get metadata ' + error);
            throw 'ERROR: unable to get metadata ' + error;
        });

};

/**
 * saves metadata
 * @param req
 * @param callback
 */
exports.save_metadata = function (req, callback) {
    // console.log(req.query);
    // console.log(req.body);
    if (req.body === undefined) {

        callback({
            status: 400,
            message: 'Bad Request.'
        });

        return false;
    }

    function get_pid(callback) {

        identifier.get_next_pid(function(pid) {
            callback(null, pid);
        });
    }

    function create_record(pid, callback) {

        let obj = {};
        obj.pid = 'mms:' + pid;
        obj.userID = req.query.userID;
        obj.collectionID = req.query.collectionID;
        obj.xml = '';

        let json = req.body;
        let doc = {};

        for (let prop in json) {

            if (json[prop][0] !== '') {
                doc[prop] = json[prop];
            }
        }

        obj.json = JSON.stringify(doc);

        callback(null, obj);
    }

    function save_record(obj, callback) {

        knex('mms_objects')
            .insert(obj)
            .then(function (data) {
                callback(null, obj);
            })
            .catch(function (error) {
                console.log(error);
                // LOGGER.module().fatal('FATAL: [/repository/model module (create_collection_object/save_record)] unable to save collection record ' + error);
                // obj.error = 'FATAL: unable to save collection record ' + error;
                // callback(null, obj);
            });
    }

    function index_record(obj, callback) {

        let json = JSON.parse(obj.json);
        let doc = {};

        for (let prop in json) {

            // modify properties
            if (json[prop][0] !== '') {
                let es_prop = prop.replace('.', '_');
                doc[es_prop + '_t'] = json[prop];
            }
        }

        client.index({
            index: 'mms_arthistory',
            type: 'data',
            id: obj.pid.replace('mms:', ''),
            body: doc
        }, function (error, response) {

            if (error) {

                // LOGGER.module().error('ERROR: [/indexer/service module (index_record/client.index)] unable to index record ' + error);

                callback(null, {
                    message: 'ERROR: unable to index record ' + error
                });


                return false;
            }

            callback(null, response);
        });

        return false;
    }

    async.waterfall([
        get_pid,
        create_record,
        save_record,
        index_record
    ], function (error, result) {

        if (error) {
            // LOGGER.module().error('ERROR: [/repository/model module (update_metadata_cron/async.waterfall)] ' + error);
            throw 'ERROR: [/repository/model module (update_metadata_cron/async.waterfall)] ' + error;
        }

        callback({
            status: 201,
            message: 'Record created',
            data: {
                created: true,
                updated: false
            }
        });
    });

    return false;
};

/** TODO:...
 * update metadata
 * @param req
 * @param callback
 */
exports.update_metadata = function (req, callback) {
    // TODO: make sure pid is in payload
    // console.log(req.query.pid);
    // console.log(req.body);
    if (req.body === undefined) {

        callback({
            status: 400,
            message: 'Bad Request.'
        });

        return false;
    }

    function create_record(pid, callback) {

        let obj = {};
        obj.pid = pid;
        obj.userID = req.query.userID;
        obj.collectionID = req.query.collectionID;
        obj.json = JSON.stringify(req.body);
        obj.xml = '';

        callback(null, obj);
    }

    // TODO:
    function update_record(obj, callback) {

        knex('mms_objects')
            .insert(obj)
            .then(function (data) {
                callback(null, obj);
            })
            .catch(function (error) {
                LOGGER.module().fatal('FATAL: [/repository/model module (create_collection_object/save_record)] unable to save collection record ' + error);
                obj.error = 'FATAL: unable to save collection record ' + error;
                callback(null, obj);
            });
    }

    function index_record(obj, callback) {
        // TODO:
    }

    async.waterfall([
        get_pid,
        create_record,
        update_record,
        index_record
    ], function (error, result) {

        if (error) {
            // LOGGER.module().error('ERROR: [/repository/model module (update_metadata_cron/async.waterfall)] ' + error);
            throw 'ERROR: [/repository/model module (update_metadata_cron/async.waterfall)] ' + error;
        }

        callback({
            status: 201,
            message: 'Record created',
            data: {
                created: true,
                updated: false
            }
        });
    });

    return false;
};