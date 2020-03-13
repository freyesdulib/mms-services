'use strict';

const CONTROLLER = require('../search/controller');

module.exports = function (app) {

    app.route('/api/v3/search')
        .get(CONTROLLER.search);
};