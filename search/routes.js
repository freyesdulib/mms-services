'use strict';

const CONTROLLER = require('../search/controller');

module.exports = function (app) {

    app.route('/v3/search')
        .get(CONTROLLER.search);
};