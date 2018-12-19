var validator = require('validator');
var request = require('request');
var cheerio = require('cheerio');
var lc_host = 'http://id.loc.gov/search/?q=';
var lc_names = '&q=cs:http://id.loc.gov/authorities/names';
var lc_subjects = '&q=cs:http://id.loc.gov/authorities/subjects';
var lc_format = '&format=atom';
var lc_count = '&count=50';

exports.getLcTerms = function(req, callback) {

    if (typeof req.params.term !== 'string') {
        console.log('args error: not a string');
        callback({
            status: 400,
            data: []
        });
        return false;
    }

    var term = validator.trim(req.params.term);
    var type = validator.trim(req.params.type);
    var lcTerms = [];
    var options = {};
    var api;

    if (type === 'names') {
        type = lc_names;
    } else if (type === 'subjects') {
        type = lc_subjects;
    }

    api = lc_host + term + type + lc_format + lc_count;
    options.uri = api;
    options.timeout = 10000;
    options.headers = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36'};

    request.get(options, function(err, response, xml) {

        if (!err && response.statusCode == 200) {

            $ = cheerio.load(xml,{ ignoreWhitespace : true, xmlMode : true});

            $('entry').each(function(i, xmlItem) {

                var vocab = {};

                $(xmlItem).children().each(function() {
                    vocab[$(this)[0].name] = $(this).text();
                });

                lcTerms.push(vocab);
            });

            callback({
                status: 200,
                data: lcTerms
            });

        } else {

            console.log(err);
            callback({
                status: 400,
                data: []
            });
        }
    });
};