'use strict';

var Ulan = require('../ulan-service/service');

exports.getUlanCreatorsWS = function (req, res) {
    Ulan.getUlanCreatorsWS(req, function (data) {
        res.status(data.status).send(data.data);
    });
};

exports.getUlanCreatorWS = function (req, res) {
    Ulan.getUlanCreatorWS(req, function (data) {
        res.status(data.status).send(data.data);
    });
};