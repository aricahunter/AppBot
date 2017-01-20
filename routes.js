var express = require('express')
  , bodyParser = require('body-parser');
var WatsonWrapper = require('./xmsbot_watson_wrapper.js');
var app = express();

app.use(bodyParser.json());

app.post('/posts', function(request, response){
  console.log('here in the post');
  try{
    response.status(200);
    var fulfilledOrders = request.body.fulfilledOrders;
    var canceledOrders = request.body.canceledOrders;
    console.log(JSON.stringify(request.body, null, 2));
    WatsonWrapper.updateAnalytics(fulfilledOrders, canceledOrders);
    response.send("");
  } catch (err){
    console.log(err.message);
    response.status(400);
    response.send(err.message);
  }
});

app.listen(process.env.PORT || 3000);
