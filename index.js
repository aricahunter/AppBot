var request = require("request");
var RtmClient = require('@slack/client').RtmClient;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var WatsonWrapper = require('./xmsbot_watson_wrapper.js')

var bot_token = process.env.SLACK_KEY;
var google_token = process.env.GOOGLE_SEARCH_KEY;

var rtm = new RtmClient(bot_token);
console.log("Starting chatbot...");
rtm.start();
var context;
var oldContext;
var numImage = 0;

WatsonWrapper.initConversation( function(error, responseContext) {
  context = responseContext;
  oldContext = responseContext;
});

function getImages(message, text, watson_response) {
  request({
    uri: "https://www.googleapis.com/customsearch/v1?q="+text+"&searchType=image&key="+google_token+"&cx=009751422889135684132:7melntwcipq",
    method: "GET"
  }, function(error, response, body) {
    //This returns the first image result
    // return json.items[0].link;
    json = JSON.parse(body);
    rtm.sendMessage(json.items[numImage].link, message.channel);

    for(var string in watson_response.response) {
      rtm.sendMessage(watson_response.response, message.channel);
    }
  });
}

function postXmsData(key, value) {
  request({
    url: "http://chatbot-xms-demo-middleware.herokuapp.com/xms",
    method: "POST",
    json: {"element":key.split("@")[1], "type":key.split("@")[0], "value":value}
  }, function(error, response, body) {
    console.log("Order Error: "+error);
  });
}

function postOrderBotData(key, value) {
  request({
    url: "https://orderbot-server.herokuapp.com/xms",
    method: "POST",
    json: {"auth_token":"1f7d390b-b5bb-4c6d-8b71-15a7f7dc188f", "element":key.split("@")[1], "type":key.split("@")[0], "value":value}
  }, function(error, response, body) {
    console.log("XMS Error: "+error);
  });
}

rtm.on(RTM_EVENTS.MESSAGE, function (message) {
  //FOR DEBUG PURPOSES ONLY
  console.log(message);
  WatsonWrapper.sendMessage(message.text, context, function(err, watson_response) {
    if (message.username != "slackbot" && message["subtype"] != "message_changed" && message.user != "U3C0T7ZDH") {
      if (err) {
        rtm.sendMessage("Error asking watson", message.channel);
      }

      else{
        context = watson_response.context;
        //If user wants to create an image, call google images api
        if (watson_response["context"]["create_image"] == 1){
          var image_to_search = watson_response["context"]["delivery_item"];
          getImages(message, image_to_search, watson_response);
          numImage++;
        }

        //If user accepted an image, then
        else{
          for(var k in context) {
            if (k != "conversation_id" && k != "system" && context[k] != oldContext[k]){
              try{
                postXmsData(k, context[k]);
                postOrderBotData(k, context[k]);
              }
              catch(err) {
                console.log("Error POSTing context var updates: " + err.message);
              }
            }
          }
          oldContext = context;

          //Check if Watson doesn't reply.
          if(watson_response.response == ""){
            response = "I'm sorry, I don't know how to respond to that.";
          }

          else {
            response = watson_response.response;
          }
          for(var index in response) {
            rtm.sendMessage(response[index], message.channel);
          }
        }
      }
    }
  });
  //message.text is what the message is and what we'll want to feed to watson to figure out response
});
