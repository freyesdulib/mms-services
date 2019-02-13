var config = require('../config/config.js'),
    es = require('elasticsearch'),
    parseString = require('xml2js').parseString;
    client = new es.Client({
        host: config.elasticSearch
    }),
    knex = require('knex')({
        client: 'mysql2',
        connection: {
            host: config.dbHost,
            user: config.dbUser,
            password: config.dbPassword,
            database: config.dbNameVocab
        }
    });

/**
 *
 * @param pid
 */
exports.realTimeIndex = function (pid) {

    knex('mms_objects').where({
        pid: pid,
        isCataloged: 1
    }).select('pid', 'xml')
        .then(function (data) {

            if (data.length === 1) {

                var pid = data[0].pid.replace('mms:', '');
                var xml = data[0].xml;
                var tmp;

                parseString(xml, function (err, json) {

                    if (err) {
                        return console.log(err);
                    }

                    tmp = json.dc['date.created'][0].replace('.0', '');
                    json.dc['date.created'] = [tmp];

                    createDocument(pid, json);
                    knex.destroy;
                });
            }

        }).catch(function (error) {
        console.log(error);
    });
};

exports.fullIndex = function (req, callback) {

    var collection = req.body.collection;
    var collection_id;

    if (collection === 'arthistory') {
        collection_id = 2;
    } else if (collection === 'ereserves') {
        collection_id = 1;
    }

    /**
     *
     * @param id
     * @param callback
     */
    function index (id, callback) {

        knex('mms_objects').where({
            collectionID: id,
            isCataloged: 1
        }).select('objectID')
            .then(function (data) {
                callback(data);
            }).catch(function (error) {
            console.log(error);
        });
    }

    /**
     *
     * @param id
     */
    function getRecordsById (id) {

        knex('mms_objects').where({
            objectID: id
        }).select('pid', 'xml')
            .then(function (data) {

                if (data.length === 1) {

                    var pid = data[0].pid.replace('mms:', '');
                    var xml = data[0].xml;
                    var tmp;

                    parseString(xml, function (err, json) {

                        if (err) {
                            return console.log(err);
                        }

                        tmp = json.dc['date.created'][0].replace('.0', '');
                        json.dc['date.created'] = [tmp];

                        createDocument(pid, json);
                        knex.destroy;
                    });
                }

            }).catch(function (error) {
            console.log(error);
        });
    }

    /**
     *
     */
    index(collection_id, function (data) {

        var indexTimer = setInterval(function () {

            if (data.length === 0) {
                clearInterval(indexTimer);
                console.log('Indexing complete.');
            } else {
                var id = data.pop();
                getRecordsById(id.objectID);
            }

        }, 40);
    });
};

/**
 *
 * @param id
 */
exports.getRecordsById = function (id) {

    knex('mms_objects').where({
        objectID: id
    }).select('pid', 'xml')
        .then(function (data) {

            if (data.length === 1) {

                var pid = data[0].pid.replace('mms:', '');
                var xml = data[0].xml;
                var tmp;

                parseString(xml, function (err, json) {

                    if (err) {
                        return console.log(err);
                    }

                    tmp = json.dc['date.created'][0].replace('.0', '');
                    json.dc['date.created'] = [tmp];

                    createDocument(pid, json);
                    knex.destroy;
                });
            }

        }).catch(function (error) {
        console.log(error);
    });
};

/**
 *
 * @param pid
 * @param json
 */
function createDocument(pid, json) {

    console.log('Indexing mms:' + pid + '...');

    client.index({
        index: client.index,
        id: pid,
        type: 'data',
        body: json.dc
    }, function (error, response) {

        if (error) {
            console.log(error);
        }

        console.log(response);
    });
}