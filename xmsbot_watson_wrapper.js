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
    context["orders_fulfilled"] = ordersFulfilled;
    context["orders_cancelled"] = ordersCanceled;
    conversation.message({
        workspace_id: process.env.WATSON_WORKSPACE,
        input: {'text': userMessage},
        context: context
        },  function(err, response){
            if (err) {
                console.log(err);
                done(err);
            }
            else{
                var responseArray = response["output"]["text"];
                if(response["output"]["text"].length == 0) {
                  responseStrings = [];
                }
                else {
                  responseString = response["output"]["text"];
                  console.log("Fulfilled: ", response["context"]["orders_fulfilled"]);
                  console.log("Canceled: ", response["context"]["orders_cancelled"]);
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