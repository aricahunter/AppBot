//call to google search api for images

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

function getImages(text) {
  request({
    uri: "https://www.googleapis.com/customsearch/v1?q="+text+"&searchType=image&key="+google_token+"&cx=009751422889135684132:7melntwcipq",
    method: "GET"
  }, function(error, response, body) {
    //This returns the first image result
    return json.items[0].link;
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
    if (message.username != "slackbot" && message.name != "U0X7N65B5") {
      if (err) {
        rtm.sendMessage("Error asking watson", message.channel);
      }
      else{
        // How to call the entities
        // entities = watson_response.entities;
        // if(entities.length > 0){
        //   console.log("There are entities detected!");
        //   console.log(JSON.stringify(entities, null, 2));
        // }
        context = watson_response.context;
        for(var k in context) {
          if (k != "conversation_id" && k != "system" && context[k] != oldContext[k]){
            postXmsData({k: context[k]});
          }
        }
        oldContext = context;

        if(watson_response.response == ""){
          response = "I'm sorry, I don't know how to respond to that.";
        }

        else {
          response = watson_response.response;
        }
        rtm.sendMessage("http://2dopeboyz.com/wp-content/uploads/2015/11/meow-the-jewels-random.jpg", message.channel);
      }
    }
  });
  //message.text is what the message is and what we'll want to feed to watson to figure out response
});
