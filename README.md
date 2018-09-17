# qanary-bot

Botkit slackbot using the QAnary multilingual question answering system

Main code in Node.js with machine translation service in Python for convenience

To setup the translation client, follow instructions here: <https://cloud.google.com/translate/docs/reference/libraries#client-libraries-install-python>
Don't forget to set the GOOGLE_APPLICATION_CREDENTIALS environment variable

Then create a bot user in Slack (<https://api.slack.com/bot-users>) and store its API Token in the SLACK_TOKEN environment variable

Install the Node and Python dependencies and you should be ready to go!
