'use strict';

const config = require('../config/config.js'),
    async = require('async'),
    knex = require('knex')({
        client: 'mysql2',
        connection: {
            host: config.repoHost,
            user: config.repoUser,
            password: config.repoPassword,
            database: config.repoName
        }
    });

exports.get_next_pid = function (callback) {

    function get_pid(callback) {

        knex('mms_pid_gen')
            .select('pid')
            .then(function (data) {

                let obj = {};
                obj.pid = data[0].pid;
                obj.next_pid = parseInt(data[0].pid) + 1;
                callback(null, obj);
            })
            .catch(function (error) {
                console.log(error);
            });
    }

    function update_pid(obj, callback) {

        knex('mms_pid_gen')
            .where({
                pid: obj.pid
            })
            .update({
                pid: obj.next_pid
            })
            .then(function(data) {
                console.log(data);
                callback(null, obj.next_pid);
            })
            .catch(function(error) {

            });
    }

    async.waterfall([
        get_pid,
        update_pid
    ], function (error, result) {

        if (error) {
            // LOGGER.module().error('ERROR: [/repository/model module (update_metadata_cron/async.waterfall)] ' + error);
            throw 'ERROR: [/repository/model module (update_metadata_cron/async.waterfall)] ' + error;
        }

        callback(result);
    });
};