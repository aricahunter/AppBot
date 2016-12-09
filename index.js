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

WatsonWrapper.initConversation( function(error, responseContext) {
  context = responseContext;
  oldContext = responseContext;
});

function createImage(message, watson_response){
  var object_to_search = watson_response.context["delivery_item"];
  getImages(message, object_to_search);
} 

function getImages(message, text) {
  request({
    uri: "https://www.googleapis.com/customsearch/v1?q="+text+"&searchType=image&key="+google_token+"&cx=009751422889135684132:7melntwcipq",
    method: "GET"
  }, function(error, response, body) {
    //This returns the first image result
    // return json.items[0].link;
    json = JSON.parse(body);
    rtm.sendMessage(json.items[0].link, message.channel);
  });
}

function postXmsData(data) {
  request({
    url: "http://chatbot-xms-demo-middleware.herokuapp.com/xms",
    method: "POST",
    json: true,
    headers: {
        "content-type": "application/json",
    },
    body: JSON.stringify(data)
  }, function(error, response, body) {
    console.log("XMS Error: "+error);
  });
}

rtm.on(RTM_EVENTS.MESSAGE, function (message) {
  WatsonWrapper.sendMessage(message.text, context, function(err, watson_response) {
    if (err) {
      rtm.sendMessage("Error asking watson", message.channel);
    }
    else{
      //Check for change in context variable. If changed, call XMS endpoint
      context = watson_response.context;
  
      //If user wants to create an image, call google images api
      if (context["created_image"] == 1){
        createImage(message, watson_response);
      }

      //If user accepted an image, then

      for(var k in context) {
        if (k != "conversation_id" && k != "system" && k != "create_image" && context[k] != oldContext[k]){    
          postXmsData({k: context[k]});
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
      rtm.sendMessage(response, message.channel);
    }
  });
  //message.text is what the message is and what we'll want to feed to watson to figure out response
});
