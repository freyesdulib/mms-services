'use strict';

const CONFIG = require('../config/config'),
    REQUEST = require('request'),
    ASYNC = require('async'),
    LOGGER = require('../libs/log4');

exports.ping = function(req, callback) {

    function ping_fedora(callback) {

        let obj = {};
        obj.fedora = false;

        REQUEST.get({
            url: CONFIG.fedora,
            timeout: 25000
        }, function (error, httpResponse, body) {

            if (error) {
                LOGGER.module().error('ERROR: unable to ping fedora ' + error);
                callback(null, obj);
                return false;
            }

            if (httpResponse.statusCode === 200) {
                obj.fedora = true;
                callback(null, obj);
                return false;
            } else {
                LOGGER.module().error('ERROR: unable to ping fedora ' + body);
                callback(null, obj);
            }
        });
    }

    function ping_solr(obj, callback) {

        obj.solr = false;

        REQUEST.get({
            url: CONFIG.solr,
            timeout: 25000
        }, function (error, httpResponse, body) {

            if (error) {
                LOGGER.module().error('ERROR: unable to ping solr ' + error);
                callback(null, obj);
                return false;
            }

            if (httpResponse.statusCode === 200) {
                obj.solr = true;
                callback(null, obj);
                return false;
            } else {
                LOGGER.module().error('ERROR: unable to ping solr ' + body);
                callback(null, obj);
            }
        });
    }

    ASYNC.waterfall([
        ping_fedora,
        ping_solr
    ], function (error, results) {

        if (error) {
            LOGGER.module().error('ERROR: [/repository/model module (publish_objects/async.waterfall)] ' + error);
            throw 'ERROR: [/repository/model module (publish_objects/async.waterfall)] ' + error;
        }

        callback({
            status: 200,
            data: results
        });
    });
};