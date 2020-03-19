'use strict';

const METADATA = require('../service-metadata/service');

exports.get_metadata = function (req, res) {
    METADATA.get_metadata(req, function (data) {
        res.status(data.status).send(data.data);
    });
};

exports.save_metadata = function (req, res) {
    METADATA.save_metadata(req, function (data) {
        res.status(data.status).send(data.data);
    });
};

exports.update_metadata = function (req, res) {
    METADATA.update_metadata(req, function (data) {
        res.status(data.status).send(data.data);
    });
};

exports.convert = function (req, res) {
    METADATA.convert(req, function (data) {
        res.status(data.status).send(data.data);
    });
};