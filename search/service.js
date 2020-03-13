const config = require('../config/config.js'),
    solr = require('solr-client'),
    client = solr.createClient(config.solrHost , config.solrPort, config.solrCore);

/**
 * Performs full text search
 * @param req
 * @param callback
 */
exports.search = function (req, callback) {

    if (req.query.keyword === undefined || req.query.options === undefined) {

        callback({
            status: 400,
            message: 'Bad Request.'
        });

        return false;
    }

    let query;
    let keyword = req.query.keyword;
    let options = req.query.options;

    if (options === 'all') {
        query = client.createQuery()
            .q(keyword)
            .start(0)
            .rows(500);
    } else {

        let field = options + '_t';
        let qf = {};
        qf[field] = 0.2;
        query = client.createQuery()
            .q(keyword)
            .dismax()
            .qf(qf)
            .start(0)
            .rows(500);
    }

    let request = client.search(query, function(error, obj){

        if (error) {

            callback({
                status: 500,
                data: {}
            });

            return false;
        }

        callback({
            status: 200,
            data: obj
        });
    });

    request.setTimeout(200, function() {
        console.log('search timeout');
        callback({
            status: 500,
            data: {}
        });
    });
};