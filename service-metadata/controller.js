'use strict';

const METADATA = require('../service-metadata/service'),
    path = require('path');

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

exports.delete_metadata = function (req, res) {
    METADATA.delete_metadata(req, function (data) {
        res.status(data.status).send(data.data);
    });
};

exports.save_queue_record = function (req, res) {
    METADATA.save_queue_record(req, function (data) {
        res.status(data.status).send(data.data);
    });
};

exports.get_queue_records = function (req, res) {
    METADATA.get_queue_records(req, function (data) {
        res.status(data.status).send(data.data);
    });
};

exports.reassign_queue_record = function (req, res) {
    METADATA.reassign_queue_record(req, function (data) {
        res.status(data.status).send(data.data);
    });
};

exports.get_queue_users = function (req, res) {
    METADATA.get_queue_users(req, function (data) {
        res.status(data.status).send(data.data);
    });
};

exports.delete_queue_record = function (req, res) {
    METADATA.delete_queue_record(req, function (data) {
        res.status(data.status).send(data.data);
    });
};

exports.get_batch_records = function (req, res) {
    METADATA.get_batch_records(req, function (data) {
        res.status(data.status).send(data.data);
    });
};

exports.get_nas_object = function (req, res) {

    if (req.query.file !== undefined) {

        METADATA.check_object(req, function (data) {
            res.status(data.status).send(data.data);
        });

    } else {

        METADATA.get_nas_object(req, function (data) {
            res.set(data.header);
            res.sendFile(data.data);
        });
    }
};

exports.publish_batch_records = function (req, res) {
    METADATA.publish_batch_records(req, function (data) {
        res.status(data.status).send(data.data);
    });
};

exports.convert = function (req, res) {
    METADATA.convert(req, function (data) {
        res.status(data.status).send(data.data);
    });
};

exports.check = function (req, res) {
    METADATA.check(req, function (data) {
        res.status(data.status).send(data.data);
    });
};

exports.fix_queue = function (req, res) {
    METADATA.fix_queue(req, function (data) {
        res.status(data.status).send(data.data);
    });
};

exports.batch_update_cm = function (req, res) {
    METADATA.batch_update_cm(req, function (data) {
        res.status(data.status).send(data.data);
    });
};