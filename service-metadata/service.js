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

            let obj = JSON.parse(data[0].json);

            callback({
                status: 200,
                data: obj
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

        let obj = {};

        identifier.get_next_pid(function(pid) {
            obj.pid = pid;
            callback(null, obj);
        });
    }

    function update(callback) {
        let obj = {};
        obj.update = true;
        callback(null, obj);
    }

    function create_record(obj, callback) {

        let json = req.body;
        let doc = {};

        if (obj.update !== undefined) {
            obj.pid = 'mms:' + json.pid;
            delete obj.update;
            delete json.type;
            delete json.pid;
        } else {
            obj.pid = 'mms:' + obj.pid;
        }

        obj.userID = req.query.userID;
        obj.collectionID = req.query.collectionID;
        obj.xml = '';

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

    function update_record(obj, callback) {

        knex('mms_objects')
            .where({
                pid: obj.pid
            })
            .update(obj)
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

            callback(null, obj);
        });

        return false;
    }

    if (req.body.pid !== undefined) {

        // update record
        async.waterfall([
            update,
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
                    created: false,
                    updated: true,
                    pid: result.pid.replace('mms:', '')
                }
            });
        });

        return false;

    } else {

        // new record
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
    }

    return false;
};

/**
 * Deletes record
 * @param req
 * @param callback
 */
exports.delete_metadata = function(req, callback) {

    let pid = 'mms:' + req.query.pid;
    let obj = {};
    obj.isDeleted = 1;

    knex('mms_objects')
        .where({
            pid: pid
        })
        .update(obj)
        .then(function (data) {

            if (data === 1) {

                client.delete({
                    index: 'mms_arthistory',
                    type: 'data',
                    id: pid.replace('mms:', '')
                }, function (error, response) {

                    if (error) {

                        LOGGER.module().error('ERROR: [/indexer/service module (unindex_record/client.delete)] unable to unindex record ' + error);

                        callback({
                            message: 'ERROR: unable to unindex record ' + error
                        });

                        return false;
                    }

                    callback({
                        status: 200,
                        message: 'Record deleted',
                        data: {
                            deleted: true
                        }
                    });
                });

            } else {

                callback({
                    status: 200,
                    message: 'Record not deleted',
                    data: {
                        deleted: false
                    }
                });
            }
        })
        .catch(function (error) {
            console.log(error);
            // LOGGER.module().fatal('FATAL: [/repository/model module (create_collection_object/save_record)] unable to save collection record ' + error);
            // obj.error = 'FATAL: unable to save collection record ' + error;
            // callback(null, obj);
        });
};