'use strict';

const CONTROLLER = require('../service-dsp/controller');

module.exports = function (app) {

    app.route('/api/v2/dsp/authenticate')
        .post(CONTROLLER.login);

    app.route('/api/v2/dsp/metadata')
        .get(CONTROLLER.get_metadata)
        .post(CONTROLLER.save_metadata)
        .put(CONTROLLER.update_metadata)
        .delete(CONTROLLER.delete_metadata);

    /*
    app.route('/api/v2/dsp/queue')
        .post(CONTROLLER.save_queue_record)
        .get(CONTROLLER.get_queue_records)
        .put(CONTROLLER.reassign_queue_record)
        .delete(CONTROLLER.delete_queue_record);

    app.route('/api/v2/dsp/batch')
        .get(CONTROLLER.get_batch_records)
        .post(CONTROLLER.publish_batch_records);

    app.route('/api/v2/nas')
        .get(CONTROLLER.get_nas_object);

    app.route('/api/v2/convert')
        .get(CONTROLLER.convert);
        */
};