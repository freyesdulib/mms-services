'use strict';

const CONFIG = require('../config/config.js'),
    parseString = require('xml2js').parseString,
    async = require('async'),
    fs = require('fs'),
    path = require('path'),
    moment = require('moment'),
    VALIDATOR = require('validator'),
    REQUEST = require('request'),
    LOGGER = require('../libs/log4'),
    logger = require('../libs/log4'),
    identifier = require('../libs/pid_gen'),
    es = require('elasticsearch'),
    client = new es.Client({
        host: CONFIG.elasticSearch
    }),
    knex = require('knex')({
        client: 'mysql2',
        connection: {
            host: CONFIG.dspHost,
            user: CONFIG.dspUser,
            password: CONFIG.dspPassword,
            database: CONFIG.dspDB
        }
    });

exports.authenticate = function (username, password, callback) {

    if (VALIDATOR.isNumeric(username) === false || password.length === 0) {

        let errorObj = {
            status: 400,
            success: false,
            message: 'Bad request.'
        };

        callback(errorObj);
        return false;
    }

    REQUEST.post({
            url: CONFIG.ldap, form: {
                username: username,
                password: password
            }
        },
        function (error, headers, response) {

            if (error) {

                LOGGER.module().error('ERROR: [/auth/service module (authenticate)] request to LDAP failed ' + error);

                let errorObj = {
                    status: 500,
                    success: false,
                    message: 'An error has occurred.'
                };

                callback(errorObj);
                return false;
            }

            let responseObj = JSON.parse(response);
            callback(responseObj);
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
        })
        .catch(function (error) {
            logger.module().error('ERROR: unable to get metadata ' + error);
            throw 'ERROR: unable to get metadata ' + error;
        });
};

/**
 * saves metadata
 * @param req
 * @param callback
 */
exports.save_metadata = function (req, callback) {

    if (req.body === undefined) {

        callback({
            status: 400,
            message: 'Bad Request.'
        });

        return false;
    }

    function get_pid(callback) {

        let obj = {};

        identifier.get_next_pid(function (pid) {
            obj.pid = pid;
            callback(null, obj);
        });
    }

    function update(callback) {
        let obj = {};
        obj.update = true;
        callback(null, obj);
    }

    function new_from_queue(callback) {

        let obj = {};
        let pid = 'mms:' + req.body.pid;

        knex('mms_review_queue')
            .where({
                pid: pid
            })
            .update({
                status: 3 // hides record
            })
            .then(function (data) {
                console.log(data);
                callback(null, obj);
            })
            .catch(function (error) {
                logger.module().error('ERROR: unable to update queue status ' + error);
                throw 'ERROR: unable to update queue status ' + error;
            });
    }

    function create_record(obj, callback) {

        let json = req.body;

        if (obj.update !== undefined) {

            // check if pid array
            if (typeof json.pid === 'object') {
                obj.pid = 'mms:' + json.pid.pop().replace('mms:', '');
            } else {
                obj.pid = 'mms:' + json.pid;
            }

            delete obj.update;
            delete json.type;
            delete json.pid;
        } else if (obj.pid === undefined) {
            obj.pid = 'mms:' + json.pid;
        } else {
            obj.pid = 'mms:' + obj.pid;
        }

        obj.userID = req.query.userID;
        obj.collectionID = req.query.collectionID;
        obj.xml = '';

        for (let prop in json) {

            if (json[prop][0] === '' && json[prop].length === 1) {
                delete json[prop];
            } else if (json[prop][0] === '' && json[prop].length > 1) {
                json[prop] = json[prop].filter(Boolean);
            }

        }

        obj.json = JSON.stringify(json);
        callback(null, obj);
    }

    function get_instructor(obj, callback) {

        let json = JSON.parse(obj.json);
        let id = json.instructor[0];

        knexv('local_instructors')
            .where({
                instructorID: id
            })
            .then(function (data) {
                delete json.instructor;
                json.instructor = [data[0].term];
                delete obj.json;
                obj.json = JSON.stringify(json);
                callback(null, obj);
            })
            .catch(function (error) {
                logger.module().error('ERROR: unable to get instructor term ' + error);
                throw 'ERROR: unable to get instructor term ' + error;
            });
    }

    function save_record(obj, callback) {

        knex('mms_objects')
            .insert(obj)
            .then(function (data) {
                callback(null, obj);
            })
            .catch(function (error) {
                logger.module().error('ERROR: unable to save metadata record ' + error);
                throw 'ERROR: unable to save metadata record ' + error;
            });
    }

    function update_record(obj, callback) {

        obj.isUpdated = 1;

        let json = JSON.parse(obj.json);
        json['date.modified'] = [moment().format('YYYY-MM-DD hh:mm:ss')];
        obj.json = JSON.stringify(json);

        knex('mms_objects')
            .where({
                pid: obj.pid
            })
            .update(obj)
            .then(function (data) {
                callback(null, obj);
            })
            .catch(function (error) {
                logger.module().error('ERROR: unable to update metadata record ' + error);
                throw 'ERROR: unable to update metadata record ' + error;
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

        if (obj.pid === undefined) {
            logger.module().error('ERROR: pid is undefined.  cannot index record.');
            return false;
        }

        // update course media index if it's an update
        if (obj.isUpdated !== undefined && obj.isUpdated === 1) {

            cmclient.index({
                index: config.cmESIndex,
                type: 'data',
                id: obj.pid.replace('mms:', ''),
                body: JSON.parse(obj.json)
            }, function (error, response) {

                if (error) {

                    logger.module().error('ERROR: unable to index metadata record ' + error);

                    callback(null, {
                        message: 'ERROR: unable to index metadata record ' + error
                    });

                    return false;
                }

                knex('mms_objects')
                    .where({
                        pid: obj.pid
                    })
                    .update({
                        isUpdated: 1
                    })
                    .then(function (data) {
                        console.log(data);
                        // callback(null, obj);
                    })
                    .catch(function (error) {
                        logger.module().error('ERROR: unable to get metadata record ' + error);
                        throw 'ERROR: unable to get metadata record ' + error;
                    });
            });
        }

        client.index({
            index: 'mms_arthistory',
            type: 'data',
            id: obj.pid.replace('mms:', ''),
            body: doc
        }, function (error, response) {

            if (error) {

                logger.module().error('ERROR: unable to index record ' + error);

                callback(null, {
                    message: 'ERROR: unable to index record ' + error
                });


                return false;
            }

            callback(null, obj);
        });

        return false;
    }

    if (req.body.pid !== undefined && req.body.type === 'search') {

        // update record
        async.waterfall([
            update,
            create_record,
            get_instructor,
            update_record,
            index_record
        ], function (error, result) {

            if (error) {
                logger.module().error('ERROR: unable to index record ' + error);
                throw 'ERROR: unable to index record ' + error;
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

    } else if (req.body.pid !== undefined && req.body.type === 'queue') {
        // create new record from queue
        // re-use pid
        // remove type
        delete req.body.type;
        async.waterfall([
            new_from_queue,
            create_record,
            get_instructor,
            save_record,
            index_record
        ], function (error, result) {

            if (error) {
                logger.module().error('ERROR: unable to create queue record ' + error);
                throw 'ERROR: unable to create queue record ' + error;
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

    } else {

        // create new record
        async.waterfall([
            get_pid,
            create_record,
            get_instructor,
            save_record,
            index_record
        ], function (error, result) {

            if (error) {
                logger.module().error('ERROR: unable to create metadata record ' + error);
                throw 'ERROR: unable to create metadata record ' + error;
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
exports.delete_metadata = function (req, callback) {

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

                        logger.module().error('ERROR: unable to unindex record ' + error);

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
            logger.module().error('ERROR: unable to delete metadata record ' + error);
            throw 'ERROR: unable to delete metadata record ' + error;
        });

    return false;
};

/**
 * converts xml to json
 * @param req
 * @param callback
 */
exports.convert = function (req, callback) {

    knex('mms_objects')
        .select('pid', 'xml')
        .where({
            objectType: 'ebook'
        })
        .then(function (data) {

            let timer = setInterval(function () {

                if (data.length === 0) {
                    clearInterval(timer);
                    return false;
                }

                let record = data.pop();

                if (record.xml !== '') {

                    parseString(record.xml, function (error, result) {

                        if (error) {
                            logger.module().error('ERROR: unable to get xml metadata ' + error);
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
                            .then(function (data) {
                                console.log(data);
                            })
                            .catch(function (error) {
                                logger.module().error('ERROR: unable to update json metadata ' + error);
                            });
                    });
                }

            }, 500);
        })
        .catch(function (error) {
            logger.module().error('ERROR: unable to get xml metadata ' + error);
            throw 'ERROR: unable to get xml metadata ' + error;
        });

    callback({
        status: 200,
        data: 'converting...'
    });
};

/**
 * gets records that are ready to be ingested into coursemedia
 * @param req
 * @param callback
 */
exports.get_batch_records = function (req, callback) {

    knex('mms_objects')
        .select('*')
        .where({
            isCataloged: 0,
            isDeleted: 0,
            collectionID: 2
        })
        .then(function (data) {
            callback({
                status: 200,
                message: 'Batch Records',
                data: data
            });
        })
        .catch(function (error) {
            logger.module().error('ERROR: unable to get queue record ' + error);
            throw 'ERROR: unable to get queue record ' + error;
        });
};

/**
 * Gets image from storage
 * @param req
 * @param callback
 */
exports.get_nas_object = function (req, callback) {

    if (req.query.size === undefined || req.query.object === undefined) {

        callback({
            status: 400,
            message: 'Bad Request.'
        });

        return false;
    }

    let filePath = config.nasPath + 'arthistory/image/' + req.query.size + '/' + req.query.object;

    if (fs.existsSync(filePath)) {

        fs.stat(filePath, function (error, stats) {

            if (error) {
                console.log(error);
                return false;
            }

            callback({
                status: 200,
                header: {
                    'Content-Type': 'image/jpg'
                },
                data: filePath
            });
        });

    } else {

        callback({
            status: 200,
            header: {
                'Content-Type': 'image/png'
            },
            data: path.join(__dirname, '../public/images/object_not_found.png')
        });
    }
};

/**
 * checks if file referenced in metadata exists on storage share
 * @param req
 * @param callback
 * @returns {boolean}
 */
exports.check_object = function (req, callback) {

    if (req.query.size === undefined || req.query.file === undefined) {

        callback({
            status: 400,
            message: 'Bad Request.'
        });

        return false;
    }

    let filePath = config.nasPath + 'arthistory/image/' + req.query.size + '/' + req.query.file;

    if (fs.existsSync(filePath)) {

        callback({
            status: 200,
            data: {
                status: 200
            }
        });

    } else {

        callback({
            status: 200,
            data: {
                status: 404
            }
        });
    }

    return false;
};

/**
 * publishes (ingests) into coursemedia
 * @param req
 * @param callback
 */
exports.publish_batch_records = function (req, callback) {

    if (req.body.pids === undefined) {

        logger.module().info('no records to publish');

        callback({
            status: 200,
            data: {
                success: false
            }
        });

        return false;
    }

    let pids = req.body.pids;

    let timer = setInterval(function () {

        if (pids.length === 0) {
            clearInterval(timer);
            console.log('done');
            return false;
        }

        let pid = pids.pop();
        console.log(pid);

        knex('mms_objects')
            .select('json')
            .where({
                pid: pid
            })
            .then(function (data) {

                let json = JSON.parse(data[0].json);
                let pid = json.pid;
                json.id = pid;
                delete json.pid;

                cmclient.index({
                    index: config.cmESIndex,
                    type: 'data',
                    id: pid.replace('mms:', ''),
                    body: json
                }, function (error, response) {

                    console.log(response);

                    if (error) {

                        logger.module().error('ERROR: unable to index metadata record ' + error);

                        callback(null, {
                            message: 'ERROR: unable to index metadata record ' + error
                        });

                        return false;
                    }

                    knex('mms_objects')
                        .where({
                            pid: pid
                        })
                        .update({
                            isCataloged: 1,
                            isNew: 1,
                            timeStamp: moment().format('Y-m-d H:i:s')
                        })
                        .then(function (data) {
                            console.log(data);
                        })
                        .catch(function (error) {
                            logger.module().error('ERROR: unable to get metadata record ' + error);
                            throw 'ERROR: unable to get metadata record ' + error;
                        });
                });

            })
            .catch(function (error) {
                logger.module().error('ERROR: unable to get metadata record ' + error);
                throw 'ERROR: unable to get metadata record ' + error;
            });

    }, 5000);
};