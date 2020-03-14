'use strict';

const config = require('../config/config.js'),
    parseString = require('xml2js').parseString,
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

    knex('mms_objects')
        .where({
            pid: req.query.pid
        })
        .then(function (data) {

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
        })
        .catch(function (error) {
            // logger.module().error('ERROR: unable to get metadata ' + error);
            throw 'ERROR: unable to get metadata ' + error;
        });

};