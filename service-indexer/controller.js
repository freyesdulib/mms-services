'use strict';

var Indexer = require('../service-indexer/service');

exports.indexVocabs = function (req, res) {
    Indexer.indexVocabs(req, function (data) {
        res.status(data.status).send(data.data);
    });
};

exports.indexAh = function (req, res) {
    Indexer.indexAh(req, function (data) {
        res.status(data.status).send(data.data);
    });
};

exports.createAhIndex = function (req, res) {
    Indexer.createAhIndex(req, function (data) {
        res.status(data.status).send(data.data);
    });
};

exports.indexVocabRecord = function (req, res) {
    Indexer.indexVocabRecord(req, function (data) {
        res.status(data.status).send(data.data);
    });
};

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

exports.deleteIndex = function (req, res) {
    Indexer.deleteIndex(req, function (data) {
        res.status(data.status).send(data.data);
    });
};

exports.createIndex = function (req, res) {
    Indexer.createIndex(req, function (data) {
        res.status(data.status).send(data.data);
    });
};

exports.createMapping = function (req, res) {
    Indexer.createMapping(req, function (data) {
        res.status(data.status).send(data.data);
    });
};