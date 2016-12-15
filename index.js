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
var oldSynonym = "";

function init(){
  WatsonWrapper.initConversation( function(error, responseContext) {
    context = responseContext;
    oldContext = responseContext;
    oldSynonym = responseContext["synonym_to_add"];
  });
}

function getImages(message, text, watson_response) {
  request({
    uri: "https://www.googleapis.com/customsearch/v1?q="+text+"&searchType=image&key="+google_token+"&cx=009751422889135684132:7melntwcipq",
    method: "GET"
  }, function(error, response, body) {
    json = JSON.parse(body);
    rtm.sendMessage(json.items[numImage].link, message.channel);

    for(var string in watson_response.response) {
      rtm.sendMessage(watson_response.response[string], message.channel);
    }

    return json.items[numImage].link
  });
}

function postXmsData(key, value) {
  request({
    url: "http://chatbot-xms-demo-middleware.herokuapp.com/xms",
    method: "POST",
    json: {"element":key.split("@")[1], "type":key.split("@")[0], "value":value}
  }, function(error, response, body) {
    if(error){
      console.log("XMS POST Error: "+error);
    }
  });
}

function postXMSImage(key, image_url) {
  request({
    url: "http://chatbot-xms-demo-middleware.herokuapp.com/xms",
    method: "POST",
    json: {"element": key[0], "type": key[1], "value": image_url}
  }, function(error, response, body) {
    if(error) {
      console.log("Error posting image to XMS: " + error);
    }
  });
}

function postSynonyms(synonym){
  request({
    url: "http://chatbot-xms-demo-middleware.herokuapp.com/synonyms",
    method: "POST",
    value: synonym
  }, function(error, response, body){
    if(error) {
      console.log("Synonym POST error: " + error);
    }
  });
}

function deleteXmsData() {
  request({
    url: "http://chatbot-xms-demo-middleware.herokuapp.com/xms",
    method: "DELETE"
  }, function(error, response, body) {
    if(error){
      console.log("XMS DELETE Error: " + error);
    }
  });
}

function publishXMSData() {
  request({
    url: "http://chatbot-xms-demo-middleware.herokuapp.com/publish",
    method: "POST"
  }, function(error, response, body){
    if(error){
      console.log("Error publishing XMS changes: " + error);
    }
  });
}

function postOrderBotData(key, value) {
  request({
    url: "https://orderbot-server.herokuapp.com/xms",
    method: "POST",
    json: {"auth_token":"1f7d390b-b5bb-4c6d-8b71-15a7f7dc188f", "element":key.split("@")[1], "type":key.split("@")[0], "value":value}
  }, function(error, response, body) {
    if(error){
      console.log("Order Error: "+error);
    }
  });
}

init();

rtm.on(RTM_EVENTS.MESSAGE, function (message) {
  //FOR DEBUG PURPOSES ONLY
  // console.log(message);
  WatsonWrapper.sendMessage(message.text, context, function(err, watson_response) {
    if (message.username != "slackbot" && message["subtype"] != "message_changed" && message.user != "U3C0T7ZDH") {
      if (err) {
        rtm.sendMessage("Error asking watson", message.channel);
      }

      else{
        context = watson_response.context;
        //If user greets the bot, assume that the user is starting to create a new bot, and 
        //everything should be reset
        for(var k in watson_response["intents"]) {
          if(watson_response["intents"][k]["intent"] == "Greetings") {
            deleteXmsData();
            numImage = 0;
            init();
          }
        }

        //If user wants to publish
        for(var k in watson_response["intents"]) {
          if(watson_response["intents"][k]["intent"] == "Publish"){
            publishXMSData();
          }
        }

        //If user wants to create an image, call google images api
        if (watson_response["context"]["create_image"] == 1){
          var image_to_search = watson_response["context"]["delivery_item"];
          var image_url = getImages(message, image_to_search, watson_response);
          numImage++;
        }

        if(watson_response["context"]["create_image"] == 2) {
          var key = ["splash-image", "url"];
          postXMSImage(key, image_url);
          numImage = 0;
        }

        //If the user wants to add a synonym
        if(context["synonym_to_add"] != oldSynonym) {
          postSynonyms(context["synonym_to_add"]);
          oldSynonym = context["synonym_to_add"];
          response = watson_response.response;
          for(var index in response) {
            rtm.sendMessage(response[index], message.channel);
          }
        }

        //If user accepted an image, then
        else{
          for(var k in context) {
            if (k != "conversation_id" && k != "system"  && k != "synonym_to_add" && context[k] != oldContext[k]){
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
          if(watson_response.response == []){
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
