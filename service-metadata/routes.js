'use strict';

const CONTROLLER = require('../service-metadata/controller');

module.exports = function (app) {

    app.route('/api/v3/metadata')
        .get(CONTROLLER.get_metadata)
        .post(CONTROLLER.save_metadata)
        .put(CONTROLLER.update_metadata)
        .delete(CONTROLLER.delete_metadata);

    app.route('/api/v3/convert')
        .get(CONTROLLER.convert);
};