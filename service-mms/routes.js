'use strict';

const SERVICE = require('../service-mms/controller');

module.exports = function (app) {

    app.route('/api/v3/ping')
        .get(SERVICE.ping);
};