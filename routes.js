var express = require('express')
  , bodyParser = require('body-parser');

var app = express();

app.use(bodyParser.json());

app.post('/posts', function(request, response){
  console.log(request.body);
  try{
    response.status(200);
    var fulfilledOrders = request.body.fulfilledOrders;
    var canceledOrders = request.body.canceledOrders;
    response.send("");
  } catch (err){
    response.status(400);
    response.send(err.message);
  }
});

app.listen(3001);
