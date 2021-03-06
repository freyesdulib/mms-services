const config = require('../config/config'),
    db = require('knex')({
        client: 'mysql',
        connection: {
            host: config.repoHost,
            user: config.repoUser,
            password: config.repoPassword,
            database: config.repoName
        },
        pool: {
            min: 2,
            max: 10
        }
    });

module.exports = function () {
    return db;
};