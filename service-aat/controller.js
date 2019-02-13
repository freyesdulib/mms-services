'use strict';

var Aat = require('../service-aat/service');

exports.getAatSubjects = function (req, res) {
    Aat.getAatSubjects(req, function (data) {
        res.status(data.status).send(data.data);
    });
};