'use strict';

const config = require('../config/config.js'),
    parseString = require('xml2js').parseString,
    async = require('async'),
    fs = require('fs'),
    path = require('path'),
    moment = require('moment'),
    identifier = require('../libs/pid_gen'),
    logger = require('../libs/log4'),
    es = require('elasticsearch'),
    client = new es.Client({
        host: config.elasticSearch
    }),
    cmclient = new es.Client({
        host: config.cmESHost
    }),
    knex = require('knex')({
        client: 'mysql2',
        connection: {
            host: config.repoHost,
            user: config.repoUser,
            password: config.repoPassword,
            database: config.repoName
        }
    }),
    knexv = require('knex')({
        client: 'mysql2',
        connection: {
            host: config.dbHost,
            user: config.dbUser,
            password: config.dbPassword,
            database: config.dbNameVocab
        }
    }),
    INDEX = config.esIndex;

/**
 * converts xml to json
 * @param req
 * @param callback
 */
exports.convert = function (req, callback) {

    knex('mms_objects')
        .select('pid', 'xml')
        .where({
            objectType: 'image'
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

                        result.dc.pid = [record.pid];

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

            }, 200);
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

exports.fix_queue = function (req, callback) {

    knex('mms_review_queue')
        .select('pid')
        .where({
            json: null
        })
        .then(function (data) {

            let timer = setInterval(function () {

                if (data.length === 0) {
                    clearInterval(timer);
                    return false;
                }

                let record = data.pop();

                knex('mms_objects')
                    .select('json')
                    .where({
                        pid: record.pid
                    })
                    .then(function (data) {

                        knex('mms_review_queue')
                            .where({
                                pid: record.pid
                            })
                            .update({
                                json: data[0].json
                            })
                            .then(function (data) {
                                console.log(data);
                            })
                            .catch(function (error) {
                                logger.module().error('ERROR: unable to update json metadata ' + error);
                            });

                    })
                    .catch(function (error) {
                        logger.module().error('ERROR: unable to get xml metadata ' + error);
                        throw 'ERROR: unable to get xml metadata ' + error;
                    });

            }, 50);

        })
        .catch(function (error) {
            logger.module().error('ERROR: unable to get xml metadata ' + error);
            throw 'ERROR: unable to get xml metadata ' + error;
        });

    callback({
        status: 200,
        data: 'Fixing queue'
    });
};

/**
 * checks for metadata issues
 * @param req
 * @param callback
 */
exports.check = function (req, callback) {

    knex('mms_objects')
        .select('pid', 'json')
        .where({
            objectType: 'image'
        })
        .then(function (data) {

            let timer = setInterval(function () {

                if (data.length === 0) {
                    clearInterval(timer);
                    return false;
                }

                let record = data.pop();
                let metadata = JSON.parse(record.json);
                let art_type;
                let instructor;

                if (metadata !== null) {
                    art_type = metadata['type.arttype'];
                    instructor = metadata.instructor;
                }

                console.log(data.length);
                console.log(record.pid);

                if (instructor !== undefined && instructor.toString() === 'Getzelman, Sarah') {

                    console.log('!!!!!!!!!!!');
                    console.log(instructor);

                    metadata.instructor = ['Magnatta, Sarah'];

                    knex('mms_objects')
                        .where({
                            pid: record.pid
                        })
                        .update({
                            json: JSON.stringify(metadata)
                        })
                        .then(function (data) {
                            console.log(data);
                        })
                        .catch(function (error) {
                            logger.module().error('ERROR: unable to update json metadata ' + error);
                        });
                }

                /*
                 if (art_type === undefined) {

                 let obj = {};
                 obj.pid = record.pid;
                 obj.json = JSON.stringify(metadata);

                 knex('mms_broken_metadata')
                 .insert(obj)
                 .then(function (data) {
                 console.log(data);
                 })
                 .catch(function (error) {
                 logger.module().error('ERROR: unable to save broken metadata record ' + error);
                 throw 'ERROR: unable to save broken metadata record ' + error;
                 });
                 }
                 */

            }, 50);
        })
        .catch(function (error) {
            logger.module().error('ERROR: unable to get xml metadata ' + error);
            throw 'ERROR: unable to get xml metadata ' + error;
        });

    callback({
        status: 200,
        data: 'checking...'
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

            // TODO: fix pid processing
            // check if pid array
            if (typeof json.pid === 'object' && json.pid.length > 1) {
                obj.pid = 'mms:' + json.pid.pop().replace('mms:', '');
            } else {
                obj.pid = 'mms:' + json.pid;
                json.pid = ['mms:' + json.pid];
            }

            delete obj.update;
            delete json.type;
            // delete json.pid;

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

        json.pid = [obj.pid];
        obj.json = JSON.stringify(json);

        callback(null, obj);
    }

    function get_instructor(obj, callback) {

        // TODO: account for instructor field missing
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

        let json = JSON.parse(obj.json);
        json['date.created'] = [moment().format('YYYY-MM-DD hh:mm:ss')];
        obj.json = JSON.stringify(json);

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

            let json = JSON.parse(obj.json);

            let created = json['date.created'];
            let modified = json['date.modified'];

            if (created === undefined) {
                created = [moment().format('YYYY-MM-DD hh:mm:ss')];
            } else if (modified === undefined) {
                modified = [moment().format('YYYY-MM-DD hh:mm:ss')];
            } else {
                created = json['date.created'].toString();
                modified = json['date.modified'].toString();
            }

            json['date.created'] = [created.replace('.0', '')];
            json['date.modified'] = [modified.replace('.0', '')];

            cmclient.index({
                index: config.cmESIndex,
                type: 'data',
                id: obj.pid.replace('mms:', ''),
                body: json
            }, function (error, response) {

                if (error) {

                    logger.module().error('ERROR: unable to index metadata record ' + error);

                    /*
                    callback(null, {
                        message: 'ERROR: unable to index metadata record ' + error
                    });

                     */
                    // return false;
                } else {

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
                            // return false;
                        })
                        .catch(function (error) {
                            logger.module().error('ERROR: unable to get metadata record ' + error);
                            throw 'ERROR: unable to get metadata record ' + error;
                        });
                }
            });
        }

        client.index({
            index: INDEX,
            type: 'data',
            id: obj.pid.replace('mms:', ''),
            body: doc
        }, function (error, response) {

            if (error) {

                logger.module().error('ERROR: unable to index record ' + error);

                /*
                callback(null, {
                    message: 'ERROR: unable to index record ' + error
                });
                */

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

    } else if (req.body.pid !== undefined && req.body.type === 'queue') { // TODO: not working
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
                    index: INDEX,
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
 * Saves queue records
 * @param req
 * @param callback
 * @returns {boolean}
 */
exports.save_queue_record = function (req, callback) {

    // status = 0  incomplete
    // status = 1  complete -> review queue
    function get_pid(callback) {

        let obj = {};

        identifier.get_next_pid(function (pid) {
            obj.pid = 'mms:' + pid;
            callback(null, obj);
        });
    }

    function update_queue(callback) {

        let pid;

        if (req.body.pid !== undefined) {
            pid = 'mms:' + req.body.pid;
        } else {
            obj.update = false;
        }

        let obj = {};
        obj.pid = pid;
        obj.update = true;
        callback(null, obj);
    }

    function create_record(obj, callback) {

        if (obj.update !== undefined && obj.update === false) {
            callback(null, obj);
        }

        let json = req.body;
        let doc = {};
        let status = json.status;

        // delete json.status;
        delete json.new;
        delete json.type;
        delete json.pid;

        obj.userID = req.query.userID;
        obj.name = req.query.name;
        obj.title = json.title;
        obj.status = status;

        for (let prop in json) {

            if (json[prop][0] !== '') {
                doc[prop] = json[prop];
            }
        }

        obj.json = JSON.stringify(doc);
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
                json.instructor = data[0].term;
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

        knex('mms_review_queue')
            .insert(obj)
            .then(function (data) {
                callback(null, obj);
            })
            .catch(function (error) {
                logger.module().error('ERROR: unable to save queue record ' + error);
                throw 'ERROR: unable to save queue record ' + error;
            });
    }

    function update_record(obj, callback) {

        if (obj.update !== undefined && obj.update === false) {
            callback(null, obj);
        }

        let pid = obj.pid;
        delete obj.pid;
        delete obj.update;
        delete obj.type;

        knex('mms_review_queue')
            .where({
                pid: pid
            })
            .update(obj)
            .then(function (data) {
                callback(null, obj);
            })
            .catch(function (error) {
                logger.module().error('ERROR: unable to update queue record ' + error);
                throw 'ERROR: unable to update queue record ' + error;
            });
    }

    if (req.body.pid !== undefined) {

        async.waterfall([
            update_queue,
            create_record,
            get_instructor,
            update_record
        ], function (error, result) {

            if (error) {
                logger.module().error('ERROR: unable to update queue record ' + error);
                throw 'ERROR: unable to update queue record ' + error;
            }

            callback({
                status: 201,
                message: 'Record added to queue',
                data: {
                    created: true
                }
            });
        });

    } else {

        async.waterfall([
            get_pid,
            create_record,
            get_instructor,
            save_record
        ], function (error, result) {

            if (error) {
                logger.module().error('ERROR: unable to save queue record ' + error);
                throw 'ERROR: unable to save queue record ' + error;
            }

            callback({
                status: 201,
                message: 'Record added to queue',
                data: {
                    created: true
                }
            });
        });
    }
};

/**
 * Gets queue records
 * @param req
 * @param callback
 */
exports.get_queue_records = function (req, callback) {

    if (req.query.pid !== undefined) {

        let pid = req.query.pid;

        knex('mms_review_queue')
            .where({
                pid: pid
            })
            .then(function (data) {

                callback({
                    status: 200,
                    data: data
                });

            })
            .catch(function (error) {
                logger.module().error('ERROR: unable to get queue record ' + error);
                throw 'ERROR: unable to get queue record ' + error;
            });

    } else {

        knex('mms_review_queue')
            .then(function (data) {

                callback({
                    status: 200,
                    data: data
                });

            })
            .catch(function (error) {
                logger.module().error('ERROR: unable to get queue records ' + error);
                throw 'ERROR: unable to get queue records ' + error;
            });
    }
};

/**
 * Gets queue record for editing
 * @param req
 * @param callback
 */
exports.get_queue_record = function (req, callback) {

    if (req.query.pid === undefined) {
        callback({
            message: 'Bad Request.'
        });

        return false;
    }

    let pid = req.query.pid;

    knex('mms_review_queue')
        .where({
            pid: pid
        })
        .then(function (data) {

            callback({
                status: 200,
                data: data
            });

        })
        .catch(function (error) {
            logger.module().error('ERROR: unable to get queue record ' + error);
            throw 'ERROR: unable to get queue record ' + error;
        });
};

/**
 * reassigns queue record to different user
 * @param req
 * @param callback
 */
exports.reassign_queue_record = function (req, callback) {

    if (req.body.newID === undefined) {

        callback({
            status: 400,
            message: 'Bad Request.'
        });

        return false;
    }

    knex('mms_users')
        .select('firstName', 'lastName')
        .where({
            userID: req.body.newID
        })
        .then(function (data) {

            let name = data[0].firstName + ' ' + data[0].lastName;

            knex('mms_review_queue')
                .where({
                    pid: req.body.recordID
                })
                .update({
                    userID: req.body.newID,
                    name: name
                })
                .then(function (data) {
                    console.log(data);

                    callback({
                        status: 200
                    });

                })
                .catch(function (error) {
                    logger.module().error('ERROR: unable to reassign queue record ' + error);
                    throw 'ERROR: unable to save queue record ' + error;
                });
        })
        .catch(function (error) {
            logger.module().error('ERROR: unable to get queue record ' + error);
            throw 'ERROR: unable to get queue record ' + error;
        });
};

/**
 * deletes queue record
 * @param req
 * @param callback
 */
exports.delete_queue_record = function (req, callback) {

    let pid = req.query.pid;

    knex('mms_review_queue')
        .where({
            pid: pid
        })
        .delete()
        .then(function (data) {

            if (data === 1) {

                callback({
                    status: 200,
                    message: 'Record deleted',
                    data: {
                        deleted: true
                    }
                });
            }
        })
        .catch(function (error) {
            logger.module().error('ERROR: unable to delete queue record ' + error);
            throw 'ERROR: unable to delete queue record ' + error;
        });

    return false;
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