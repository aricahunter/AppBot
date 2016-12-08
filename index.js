//call to google search api for images
//https://www.googleapis.com/customsearch/v1?q=meow&searchType=image&key=AIzaSyBr5Od5yAtrOOQhzvXtTrUoaqOQtrRg-I4&cx=009751422889135684132:7melntwcipq


var RtmClient = require('@slack/client').RtmClient;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;

var bot_token = process.env.SLACK_KEY;

var rtm = new RtmClient(bot_token);
rtm.start();

rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
  //message.text is what the message is and what we'll want to feed to watson to figure out response
  rtm.sendMessage("Hello!", message.channel);
});
