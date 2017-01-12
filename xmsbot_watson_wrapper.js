var watson = require('watson-developer-cloud');
var username = process.env.WATSON_USERNAME,
    password = process.env.WATSON_PASSWORD

var conversation = watson.conversation({
    username: username,
    password: password,
    version: 'v1',
    version_date: '2016-09-20'
});

var ordersFulfilled = 0;
var ordersCanceled = 0;

initConversation = function(done) {
    ordersFulfilled = 0;
    ordersCanceled = 0;
    conversation.message({
        workspace_id: process.env.WATSON_WORKSPACE,
        input: {'text': ''},
        context: {}
        },  function(err, response){
            if (err){
                console.log('error: ' + err);
                done();
            }

            else{
                console.log('Context successfully seeded.');
                done(null, response["context"]);
            }
    });
}

<<<<<<< HEAD
sendMessage = function(userMessage, resetLiterals, context, historyLog, userID, done) {
    context["fulfilled_orders"] = ordersFulfilled;
    context["canceled_orders"] = ordersCanceled;
    context["history_log"] = historyLog;
    context["user_id"] = userID;
=======
sendMessage = function(message, idDictionary, resetLiterals, context, done) {
    // console.log("here in send message. here is the context: " + JSON.stringify(context, null, 2));
    context["fulfilled_orders"] = ordersFulfilled;
    context["canceled_orders"] = ordersCanceled;
    
>>>>>>> master
    if(resetLiterals == 1){
        context["literal_key"] = "";
        context["literal_value"] = "";
    }

    if(message.text != undefined) {
        var userMessage = message.text;
        var sanitizedUserMessage = userMessage.replace(/[\u201C\u201D]/g, '"');
    }

    conversation.message({
        workspace_id: process.env.WATSON_WORKSPACE,
        input: {'text': sanitizedUserMessage},
        context: context
        },  function(err, response){
            if (err) {
                console.log(err);
                done(err);
            }
            else{
                // console.log("The conversation is happening on id: " + response["context"]["conversation_id"]);
                var responseArray = response["output"]["text"];
                if(response["output"]["text"].length == 0) {
                  responseStrings = [];
                }
                else {
                  responseString = response["output"]["text"];
                  // console.log("Fulfilled: ", response["context"]["fulfilled_orders"]);
                  // console.log("Canceled: ", response["context"]["canceled_orders"]);
                }
                done(null, {
                    context: response["context"],
                    entities: response["entities"],
                    intents: response["intents"],
                    response: responseString
                });
            }
    });
}

updateAnalytics = function(fulfilled, canceled) {
    ordersFulfilled = fulfilled;
    ordersCanceled = canceled;
}

module.exports = {
    initConversation: initConversation,
    sendMessage: sendMessage,
    updateAnalytics: updateAnalytics
};