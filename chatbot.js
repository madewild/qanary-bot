require('dotenv').config()

var Botkit = require('botkit');

var controller = Botkit.slackbot({  
	debug: false,
});

var bot = controller.spawn({
	 token: process.env.SLACK_TOKEN
}).startRTM();

var spawn = require("child_process").spawn;

var request = require("request");

function start_rtm() {
    bot.startRTM(function(err,bot,payload) {
            if (err) {
                    console.log('Failed to start RTM')
                    return setTimeout(start_rtm, 60000);
            }
            console.log("RTM started!");
    });
}

function dunno(message, language) {
    if (language == "en") {
        bot.reply(message, "I don't know.");
    } else if (language == "fr") {
        bot.reply(message, "Je ne sais pas.");
    } else if (language == "de") {
        bot.reply(message, "Ich weiß es nicht.");
    } else if (language == "it") {
        bot.reply(message, "Non lo so.");
    } else if (language == "es") {
        bot.reply(message, "No lo sé.");
    } else {
        var pythonProcess2 = spawn('python3', ['translate.py', "I don't know.", language]);
        pythonProcess2.stdout.on('data', function (output) {
            data = JSON.parse(output);
            translated_dunno = data.translatedText;
            console.log("Answer: " + translated_dunno);
            bot.reply(message, translated_dunno);
        });
    }
}

controller.on('rtm_close', function(bot, err) {
    start_rtm();
});

controller.hears(['hello', 'hi'], 'direct_message,direct_mention,mention,ambient', function(bot, message) {

    bot.api.reactions.add({
        timestamp: message.ts,
        channel: message.channel,
        name: 'robot_face',
    }, function(err, res) {
        if (err) {
            bot.botkit.log('Failed to add emoji reaction :(', err);
        }
    });


    controller.storage.users.get(message.user, function(err, user) {
        if (user && user.name) {
            bot.reply(message, 'Hello ' + user.name + '!!');
        } else {
            bot.reply(message, 'Hello, how can I help you?');
        }
    });
});

controller.hears(['thank', 'thanx'], 'direct_message,direct_mention,mention,ambient', function(bot, message) {
    bot.reply(message, "You're welcome! :slightly_smiling_face:");
});

controller.hears('', 'direct_message,direct_mention,mention,ambient', function(bot, message) {

    bot.say(
        {
            "id": 1,
            "type": "typing",
            "channel": message.channel
        }
    );
    
    var text = message.text;
    console.log(" ");
    console.log("Original text: " + text);
    var pythonProcess = spawn('python3', ['translate.py', text, 'en']);
    pythonProcess.stdout.on('data', function (output) {
        data = JSON.parse(output);
        lang_code = data.detectedSourceLanguage;
        if (lang_code == 'en') {
            translated_text = text;
        } else {
            console.log("Detected language: " + lang_code);
            translated_text = data.translatedText;
            console.log("Translated text: " + translated_text);
        }
        var url = "http://qanswer-core1.univ-st-etienne.fr/gerbil";
        var formdata = {'query': translated_text};
        request.post({url: url, form: formdata}, function (error, response, body){
            var data = JSON.parse(body);
            console.log(data);
            var questions = data.questions;
            if(questions) {
                var answers = JSON.parse(questions[0].question.answers);
                if (answers) {
                    var results = answers.results;
                    if (results) {
                        var binding = results.bindings[0];
                        if (binding) {
                            for (var key in binding) {
                                var content = binding[key];
                                var value = content.value;
                                console.log(value);
                                if (value.includes("wikidata")) {
                                    var wdid = value.split(/[\/]+/).pop();
                                    var wikilang = lang_code + "wiki"
                                    var wdurl = "https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=sitelinks&sitefilter=" + wikilang + "&ids=" + wdid
                                    request(wdurl, function (error, response, wdbody){
                                        var wddata = JSON.parse(wdbody);
                                        var entities = wddata.entities;
                                        for (var key in entities) {
                                            var content = entities[key];
                                            var sitelinks = content.sitelinks;
                                            if(sitelinks) {
                                                if (Object.keys(sitelinks).length > 0) {
                                                    for (var key in sitelinks) {
                                                        var wiki = sitelinks[key];
                                                        var title = wiki.title;
                                                        console.log(title);
                                                        if (text.endsWith("?")) {
                                                            var finalurl = "https://" + lang_code + ".wikipedia.org/wiki/" + title.replace(/\s/g, "_");
                                                            bot.reply(message, finalurl);
                                                        } else {
                                                            bot.reply(message, title);
                                                        }
                                                    }
                                                } else {
                                                    console.log("No wikilink in this language...");
                                                    var summary = "https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=labels&ids=" + wdid;
                                                    request(summary, function (error, response, wdbody){
                                                        var wddata = JSON.parse(wdbody);
                                                        var entities = wddata.entities;
                                                        for (var key in entities) {
                                                            var content = entities[key];
                                                            var labels = content.labels;
                                                            var label = labels.en;
                                                            if (label) {
                                                                value = label.value;
                                                                console.log(value);
                                                                bot.reply(message, value);
                                                            } else {
                                                                console.log("No label either...");
                                                                dunno(message, lang_code);
                                                            }
                                                        }
                                                    });
                                                }  
                                            } else {
                                                console.log("This is not an entity...")
                                                dunno(message, lang_code);
                                            }
                                        }
                                    });
                                } else if (value.includes("T00:00:00Z")) {
                                    var date = value.substring(0, 10);
                                    bot.reply(message, date);
                                } else if (value.startsWith("+")) {
                                    var number = value.replace(/\+/, "");
                                    bot.reply(message, number);
                                } else {
                                    bot.reply(message, value);
                                }
                            }
                        } else {
                            console.log("No binding...");
                            dunno(message, lang_code);
                        }
                    } else {
                        console.log("No result...");
                        dunno(message, lang_code);
                    }
                } else {
                    console.log("No answer...");
                    dunno(message, lang_code);
                }
            } else {
                var error = data['error'];
                console.log(error);
                dunno(message, lang_code);
            }
        });
    });
});
