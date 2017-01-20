var watson = require('watson-developer-cloud');
var username = process.env.WATSON_USERNAME,
    password = process.env.WATSON_PASSWORD

var conversation = watson.conversation({
    username: username,
    password: password,
    version: 'v1',
    version_date: '2016-09-20'
});

var webFulfilled = facebookFulfilled = smsFulfilled = alexaFulfilled = iosFulfilled = 0;
var webCanceled = facebookCanceled = smsCanceled = alexaCanceled = iosCanceled = 0;

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

sendMessage = function(message, idDictionary, resetLiterals, context, done) {
    // console.log("here in send message. here is the context: " + JSON.stringify(context, null, 2));
    context["web_fulfilled_orders"] = webFulfilled;
    context["facebook_fulfilled_orders"] = facebookFulfilled;
    context["sms_fulfilled_orders"] = smsFulfilled;
    context["alexa_fulfilled_orders"] = alexaFulfilled;
    context["ios_fulfilled_orders"] = iosFulfilled;
    context["web_canceled_orders"] = webCanceled;
    context["facebook_canceled_orders"] = facebookCanceled;
    context["sms_canceled_orders"] = smsCanceled;
    context["alexa_canceled_orders"] = alexaCanceled;
    context["ios_canceled_orders"] = iosCanceled;
    
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
                if(responseArray.length == 0) {
                  responseStrings = [];
                }
                else {
                  responseStrings = response["output"]["text"];
                  // console.log("Fulfilled: ", response["context"]["fulfilled_orders"]);
                  // console.log("Canceled: ", response["context"]["canceled_orders"]);
                }
                done(null, {
                    context: response["context"],
                    entities: response["entities"],
                    intents: response["intents"],
                    response: responseStrings
                });
            }
    });
}

updateAnalytics = function(requestBody) {
    var fulfilled = requestBody["fulfilledOrders"];
    var canceled = requestBody["canceledOrders"];

    webFulfilled = fulfilled["web"];
    facebookFulfilled = fulfilled["facebook"];
    smsFulfilled = fulfilled["sms"];
    alexaFulfilled = fulfilled["alexa"];
    iosFulfilled = fulfilled["ios"];

    webCanceled = canceled["web"];
    facebookCanceled = canceled["facebook"];
    smsCanceled = canceled["sms"];
    alexaCanceled = canceled["alexa"];
    iosCanceled = canceled["ios"];
}

module.exports = {
    initConversation: initConversation,
    sendMessage: sendMessage,
    updateAnalytics: updateAnalytics
};