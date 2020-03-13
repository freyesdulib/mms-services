'use strict';

const SERVICE = require('../search/service');

exports.search = function (req, res) {
    SERVICE.search(req, function (data) {
        res.status(data.status).send(data.data);
    });
};