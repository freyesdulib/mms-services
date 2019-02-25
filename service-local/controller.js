'use strict';

var Local = require('../service-local/service');

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
        res.status(200).send(data);
    });
};

exports.saveLocalSources = function (req, res) {
    Local.saveLocalSources(req, function (data) {
        res.status(201).send(data);
    });
};

exports.saveLocalCreators = function (req, res) {
    Local.saveLocalCreators(req, function (data) {
        res.status(201).send(data);
    });
};

exports.saveLocalInstructors = function (req, res) {
    Local.saveLocalInstructors(req, function (data) {
        res.status(201).send(data);
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