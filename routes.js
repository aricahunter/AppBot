var express = require('express')
  , bodyParser = require('body-parser');
var index = require('./index.js');
var app = express();

app.use(bodyParser.json());

app.post('/posts', function(request, response){
  try{
    response.status(200);
    var fulfilledOrders = request.body.fulfilledOrders;
    var canceledOrders = request.body.canceledOrders;
    index.processOrders(fulfilledOrders, canceledOrders);
    response.send("");
  } catch (err){
    console.log(err.message);
    response.status(400);
    response.send(err.message);
  }
});

app.listen(3001);
