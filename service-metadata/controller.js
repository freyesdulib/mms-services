'use strict';

const FEDORA = require('../service-metadata/service');

exports.get_metadata = function (req, res) {
    FEDORA.get_metadata(req, function (data) {
        res.status(data.status).send(data.data);
    });
};