'use strict';

const CONTROLLER = require('../service-metadata/controller');

module.exports = function (app) {

    app.route('/api/v3/metadata')
        .get(CONTROLLER.get_metadata);
};