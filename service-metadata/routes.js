'use strict';

const CONTROLLER = require('../service-metadata/controller');

module.exports = function (app) {

    app.route('/api/v3/metadata')
        .get(CONTROLLER.get_metadata)
        .post(CONTROLLER.save_metadata)
        .put(CONTROLLER.update_metadata)
        .delete(CONTROLLER.delete_metadata);

    app.route('/api/v3/queue')
        .post(CONTROLLER.save_queue_record)
        .get(CONTROLLER.get_queue_records)
        .put(CONTROLLER.reassign_queue_record)
        .delete(CONTROLLER.delete_queue_record);

    app.route('/api/v3/batch')
        .get(CONTROLLER.get_batch_records)
        .post(CONTROLLER.publish_batch_records);

    app.route('/api/v3/nas')
        .get(CONTROLLER.get_nas_object);

    app.route('/api/v3/convert')
        .get(CONTROLLER.convert);
};