'use strict';

var Lc = require('../lc-service/service');

exports.getLcTerms = function (req, res) {
    Lc.getLcTerms(req, function (data) {
        res.status(data.status).send(data.data);
    });
};