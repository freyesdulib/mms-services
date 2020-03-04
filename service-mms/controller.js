'use strict';

const SERVICE = require('../service-mms/service');

exports.ping = function (req, res) {
    SERVICE.ping(req, function (data) {
        res.status(data.status).send(data.data);
    });
};