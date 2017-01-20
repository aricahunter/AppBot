var request = require("request");
var RtmClient = require('@slack/client').RtmClient;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var WatsonWrapper = require('./xmsbot_watson_wrapper.js')
var Router = require('./routes.js')

var bot_token = process.env.SLACK_KEY;
var google_token = process.env.GOOGLE_SEARCH_KEY;

var rtm = new RtmClient(bot_token);
console.log("Starting chatbot...");
rtm.start();
var oldContext;
var numImage = 0;
var oldSynonym = "";
var image_url = "";
var paramNum = 0;
var resetLiterals = 0;
var wait = 0;
var userIDConversationID = [];
var initialContext;

function init(message){
  var context;
  WatsonWrapper.initConversation(function(error, responseContext) {
    context = responseContext;
    oldContext = responseContext;
    oldSynonym = responseContext["synonym_to_add"];
    initialContext = context;
    for(var k in userIDConversationID){
      if(userIDConversationID[k]["user"] == message.user){
        userIDConversationID[k]["context"] = context;
        console.log("new user with ID: " + userIDConversationID[k]["user"]);
      }
    }
  });
}

function getImages(message, text, watson_response) {
  request({
    uri: "https://www.googleapis.com/customsearch/v1?q="+text+"&searchType=image&key="+google_token+"&cx=009751422889135684132:7melntwcipq",
    method: "GET"
  }, function(error, response, body) {
    json = JSON.parse(body);
    rtm.sendMessage(json.items[numImage].link, message.channel);
    image_url = json.items[numImage].link
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
    json: {"value": synonym}
  }, function(error, response, body){
    if(error) {
      console.log("Synonym POST error: " + error);
    }
  });
}

function postLiteralKey(key, value) {
  request({
    url: "https://chatbot-xms-demo-middleware.herokuapp.com/xms",
    method: "POST",
    json: {"element": key, "type": "key", "value": value}
  }, function(error, response, body){
    if(error){
      console.log("Literal Key POST error: " + error);
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

function pauseMessage(responseString, message) {
  return function() {
    rtm.sendMessage(responseString, message.channel);
    wait = 0;
  }
}

function newUser(userToCheck) {
  for(var k in userIDConversationID){
    if(userIDConversationID[k]["user"] == userToCheck) {
      return false;
    }
  }
  return true;
}

init();

rtm.on(RTM_EVENTS.MESSAGE, function (message) {
  if(newUser(message.user) && message.user != null){
    userIDConversationID.push({"user": message.user, "context": initialContext});
    init(message);
  }

  var context;
  for(let k in userIDConversationID){
    if(message.user == userIDConversationID[k]["user"]){
      context = userIDConversationID[k]["context"];
    }
  }

  WatsonWrapper.sendMessage(message, userIDConversationID, resetLiterals, context, function(err, watson_response) {
    // console.log(JSON.stringify(context, null, 2));
    if (message.username != "slackbot" && message["subtype"] != "message_changed" && message.user != "U3C0T7ZDH") {
      if (err) {
        rtm.sendMessage("Error asking watson", message.channel);
      }

      else{
        for(let k in userIDConversationID){
          if(message.user == userIDConversationID[k]["user"]){
            userIDConversationID[k]["context"] = watson_response.context;
            context = userIDConversationID[k]["context"];
          }
        }

        //If user greets the bot, assume that the user is starting to create a new bot, and
        //everything should be reset
        for(var k in watson_response["intents"]) {
          if(watson_response["intents"][k]["intent"] == "Create") {
            deleteXmsData();
            numImage = 0;
            image_url = "";
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
          getImages(message, image_to_search, watson_response);
          numImage++;
        }

        //If the user accepted an image
        if(watson_response["context"]["create_image"] == 2) {
          var key = ["splash-image", "url"];
          postXMSImage(key, image_url);
          numImage = 0;
        }

        //If the user wanted to change using a literal key
        if(watson_response["context"]["literal_key"] != "" && watson_response["context"]["literal_value"] != "") {
          var literals_context = watson_response["context"];
          postLiteralKey(literals_context["literal_key"], literals_context["literal_value"]);
          resetLiterals = 1;
        }

        if(watson_response["context"]["literal_key"] == "" || watson_response["context"]["literal_value"] == "") {
          resetLiterals = 0;
        }

        // //If the user wants to see analytics graphs
        for(var k in watson_response["intents"]) {
          if(watson_response["intents"][k]["intent"] == "Analytics") {
            for(var j in watson_response["entities"]) {
              if(watson_response["entities"][j]["entity"] == "source") {
                var dataSource = watson_response["entities"][j]["value"];
              }

              if(watson_response["entities"][j]["value"] == "delivered") {
                var url = "http://chatbot-xms-demo-middleware.herokuapp.com/order-fulfilled-analytics-chart" + "?param=" + paramNum;
                rtm.sendMessage(url, message.channel);
                paramNum++;
              }

              if(watson_response["entities"][j]["value"] == "canceled") {
                var url = "http://chatbot-xms-demo-middleware.herokuapp.com/order-canceled-analytics-chart" + "?param=" + paramNum;
                rtm.sendMessage(url, message.channel);
                paramNum++;
              }
            }
          }
        }

        //If the user wants to add a synonym
        if(context["synonym_to_add"] != oldSynonym && context["synonym_to_add"] != "") {
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
            if (k != "conversation_id" && k != "system"  && k != "synonym_to_add" && k != "create_image" && k != "literal_key" && k != "literal_value" && context[k] != oldContext[k]){
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
            if(response[index].includes("couple minutes")){
              wait = 1;
              var time_to_sleep = Math.floor(Math.random() * 5 + 5);
              rtm.sendMessage(response[index], message.channel);
              setTimeout(pauseMessage(response[parseInt(index)+1], message), time_to_sleep * 1000);
            }
            else if(wait == 0){
              rtm.sendMessage(response[index], message.channel);
            }
          }
        }
      }
    }
  });
  //message.text is what the message is and what we'll want to feed to watson to figure out response
});
