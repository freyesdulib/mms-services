const config = require('../config/config.js'),
    request = require('request'),
    cheerio = require('cheerio'),
    xmldoc = require('xmldoc'),
    host = config.gettyApiUlanHost,
    username = config.gettyApiUsername,
    password = config.gettApiPassword;

// http://vocabsservices.getty.edu/ULANService.asmx/ULANGetTermMatch?name=picasso&roleid=&nationid=
// http://vocabsservices.getty.edu/ULANService.asmx/ULANGetSubject?subjectID=500009666

exports.getUlanCreatorsWS = function (req, callback) {

    if (req.query.term === undefined) {

        callback({
            status: 400,
            data: []
        });

        return false;
    }

    var term = req.query.term;
    var options = {};
    var query = 'ULANService.asmx/ULANGetTermMatch?name=' + term + '&roleid=&nationid=';
    options.uri = host + query;
    options.timeout = 35000;

    request.get(options, function (err, response, xml) {

        if (!err && response.statusCode == 200) {

            var vocabs = {};
            var vocabArr = [];

            $ = cheerio.load(xml, {ignoreWhitespace: true, xmlMode: true});

            $('Subject').each(function (i, xmlItem) {

                var vocab = {};

                $(xmlItem).children().each(function () {
                    vocab[$(this)[0].name] = $(this).text();
                });

                vocabArr.push(vocab);
            });

            vocabs = vocabArr;
            callback({
                status: 200,
                data: vocabs
            });

            return false;

        } else {

            callback({
                status: 200,
                data: []
            });

            return false;
        }

    }).auth(username, password, false);
};

exports.getUlanCreatorWS = function (req, callback) {

    if (req.query.id === undefined) {

        callback({
            status: 400,
            data: []
        });

        return false;
    }

    var id = req.query.id;
    var options = {};
    var query = 'ULANService.asmx/ULANGetSubject?subjectID=' + id;
    options.uri = host + query;
    options.timeout = 35000;

    request.get(options, function (err, response, xml) {

        if (!err && response.statusCode == 200) {

            var vocabs = {};
            var document = new xmldoc.XmlDocument(xml);
            var root = document.descendantWithPath('Subject').children;

            vocabs['SubjectID'] = document.valueWithPath('Subject@Subject_ID');

            for (var i = 0; i < root.length; i++) {

                if (root[i].name === 'Descriptive_Notes') {

                    for (var j = 0; j < root[i].children.length; j++) {

                        if (root[i].children[j].children[j].name === 'Note_Text') {
                            vocabs['Note'] = root[i].children[j].children[j].val;
                        }
                    }

                } else if (root[i].name === 'Record_Type') {

                    vocabs['RecordType'] = root[i].val;

                } else if (root[i].name === 'Terms') {

                    for (var k = 0; k < root[i].children.length; k++) {

                        if (root[i].children[k].name === 'Preferred_Term') {

                            for (var p = 0; p < root[i].children[k].children.length; p++) {
                                if (root[i].children[k].children[p].children.length > 0) {

                                    for (var q = 0; q < root[i].children[k].children[p].children.length; q++) {
                                        if (root[i].children[k].children[p].children[q].name === 'Term_Source') {
                                            vocabs['Source'] = root[i].children[k].children[p].children[q].children[0].children[0].val;
                                        }
                                    }
                                }

                            }

                        } else if (root[i].children[k].name === 'Non-Preferred_Term') {

                            if (root[i].children[k].children[0].name === 'Term_Text') {
                                vocabs['AlternativeName'] = root[i].children[0].children[0].val;
                            }
                        }
                    }

                } else if (root[i].name === 'Biographies') {

                    for (var l = 0; l < root[i].children.length; l++) {

                        if (root[i].children[l].name === 'Preferred_Biography') {

                            for (var m = 0; m < root[i].children[l].children.length; m++) {

                                if (root[i].children[l].children[m].name === 'Biography_Text') {
                                    vocabs['Bio'] = root[i].children[l].children[m].val;
                                } else if (root[i].children[l].children[m].name === 'Birth_Place') {
                                    vocabs['BirthPlace'] = root[i].children[l].children[m].val;
                                } else if (root[i].children[l].children[m].name === 'Birth_Date') {
                                    vocabs['BirthDate'] = root[i].children[l].children[m].val;
                                } else if (root[i].children[l].children[m].name === 'Death_Date') {
                                    vocabs['DeathDate'] = root[i].children[l].children[m].val;
                                } else if (root[i].children[l].children[m].name === 'Sex') {
                                    vocabs['Sex'] = root[i].children[l].children[m].val;
                                }
                            }
                        }
                    }

                } else if (root[i].name === 'Roles') {

                    for (var n = 0; n < root[i].children.length; n++) {
                        if (root[i].children[n].name === 'Preferred_Role') {
                            if (root[i].children[n].children[n].name === 'Role_ID') {
                                vocabs['Role'] = root[i].children[n].children[n].val;
                            }
                        }
                    }

                } else if (root[i].name === 'Nationalities') {

                    for (var o = 0; o < root[i].children.length; o++) {

                        if (root[i].children[o].name === 'Preferred_Nationality') {
                            if (root[i].children[o].children[o].name === 'Nationality_Code') {
                                vocabs['Nationality'] = root[i].children[o].children[o].val;
                            }
                        }
                    }
                }
            }

            callback({
                status: 200,
                data: vocabs
            });

            return false;

        } else {

            callback({
                status: 200,
                data: []
            });

            return false;
        }

    }).auth(username, password, false);
};