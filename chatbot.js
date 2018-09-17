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
    var pythonProcess2 = spawn('python3', ['translate.py', "I don't know.", language]);
    pythonProcess2.stdout.on('data', function (output) {
        data = JSON.parse(output);
        translated_dunno = data.translatedText;
        console.log("Answer: " + translated_dunno);
        bot.reply(message, translated_dunno);
    });
}

controller.on('rtm_close', function(bot, err) {
    start_rtm();
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
    console.log("Original text: " + text);
    var pythonProcess = spawn('python3', ['translate.py', text, 'en']);
    pythonProcess.stdout.on('data', function (output) {
        data = JSON.parse(output);
        lang_code = data.detectedSourceLanguage;
        console.log("Detected language: " + lang_code);
        translated_text = data.translatedText;
        console.log("Translated text: " + translated_text);
        var url = "http://wdaqua-core1.univ-st-etienne.fr/gerbil";
        var formdata = {'query': translated_text};
        request.post({url: url, form: formdata}, function (error, response, body){
            var data = JSON.parse(body);
            var answers = JSON.parse(data.questions[0].question.answers);
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
                                    console.log(content);
                                    var sitelinks = content.sitelinks;
                                    if (Object.keys(sitelinks).length > 0) {
                                        for (var key in sitelinks) {
                                            var wiki = sitelinks[key];
                                            var title = wiki.title;
                                            console.log(title);
                                            var finalurl = "https://" + lang_code + ".wikipedia.org/wiki/" + title.replace(/\s/g, "_");
                                            bot.reply(message, finalurl);
                                        }
                                    } else {
                                        console.log("No wikilink in this language...");
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
        });
    });
});
