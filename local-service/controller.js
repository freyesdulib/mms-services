'use strict';

var Local = require('../local-service/service');

exports.getServiceInfo = function (req, res) {
    Local.getServiceInfo(req, function (data) {
        res.status(data.status).send(data.data);
    });
};

exports.getLocalCreators = function (req, res) {
    Local.getLocalCreators(req, function (data) {
        res.status(data.status).send(data.data);
    });
};

exports.getArtTypes = function (req, res) {
    Local.getArtTypes(req, function (data) {
        res.status(data.status).send(data.data);
    });
};

exports.getLocalSources = function (req, res) {
    Local.getLocalSources(req, function (data) {
        console.log(data);
        res.status(200).send(data);
    });
};

exports.getTimePeriods = function (req, res) {
    Local.getTimePeriods(req, function (data) {
        res.status(data.status).send(data.data);
    });
};

exports.getInstructors = function (req, res) {
    Local.getInstructors(req, function (data) {
        res.status(data.status).send(data.data);
    });
};

exports.indexVocabs = function (req, res) {
    Local.indexVocabs(req, function (data) {
        res.status(data.status).send(data.data);
    });
};

exports.deleteIndex = function (req, res) {
    Local.deleteIndex(req, function (data) {
        res.status(data.status).send(data.data);
    });
};

exports.createIndex = function (req, res) {
    Local.createIndex(req, function (data) {
        res.status(data.status).send(data.data);
    });
};

exports.createMapping = function (req, res) {
    Local.createMapping(req, function (data) {
        res.status(data.status).send(data.data);
    });
};