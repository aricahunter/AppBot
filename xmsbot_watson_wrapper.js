var watson = require('watson-developer-cloud');
var username = process.env.WATSON_USERNAME,
    password = process.env.WATSON_PASSWORD

var conversation = watson.conversation({
    username: username,
    password: password,
    version: 'v1',
    version_date: '2016-09-20'
});

initConversation = function(done) {
    conversation.message({
        workspace_id: process.env.WATSON_WORKSPACE,
        input: {'text': ''},
        context: {}
        },  function(err, response){
            if (err){
                console.log('error');
                done();
            }

            else{
                console.log('Context successfully seeded.');
                done(null, response["context"]);
            }
    });
}

sendMessage = function(userMessage, context, done) {
    conversation.message({
        workspace_id: process.env.WATSON_WORKSPACE,
        input: {'text': userMessage},
        context: context
        },  function(err, response){
            if (err) {
                console.log(err)
                done(err);
            }
            else{
                // console.log(response["output"]["text"]);
                var responseArray = response["output"]["text"];
                done(null, {
                    context: response["context"],
                    response: response["output"]["text"][responseArray.length - 1]
                });
            }
    });
}

module.exports = {
    initConversation: initConversation,
    sendMessage: sendMessage
};

// app.on('start', function())




// when required

// WatsonApi = require('./xms_bot_wrapper')

// watsonApi = new WatsonApi({conversation: true});

