//call to google search api for images

var request = require("request");
var RtmClient = require('@slack/client').RtmClient;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var WatsonWrapper = require('./xmsbot_watson_wrapper.js')

var bot_token = process.env.SLACK_KEY;
var google_token = process.env.GOOGLE_SEARCH_KEY;

var rtm = new RtmClient(bot_token);
rtm.start();
var context;

WatsonWrapper.initConversation( function(error, responseContext) {
  context = responseContext;
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

rtm.on(RTM_EVENTS.MESSAGE, function (message) {
  WatsonWrapper.sendMessage(message.text, context, function(err, response) {
    if (err) {
      rtm.sendMessage("Error asking watson", message.channel);
    }
    else{
    // console.log(response.response);
    context = response.context;
    rtm.sendMessage(response.response, message.channel);
    }
  });
  //message.text is what the message is and what we'll want to feed to watson to figure out response
});
