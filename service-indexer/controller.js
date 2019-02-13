'use strict';

var Indexer = require('../service-indexer/service');

exports.realTimeIndex = function (req, res) {
    Indexer.realTimeIndex(req, function (data) {
        res.status(data.status).send(data.data);
    });
};

exports.fullIndex = function (req, res) {
    Indexer.fullIndex(req, function (data) {
        res.status(data.status).send(data.data);
    });
};