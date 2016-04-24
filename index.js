var logger = require('log-js')('index.js')
var mongodb = require('mongodb')
var express = require('express')
var path = require('path')
var app = express()
var http = require('http').Server(app)
var io = require('socket.io')(http)

var MongoClient = mongodb.MongoClient
var url = "mongodb://localhost:27017/item_control"
var collection;

function addItem(item, startingValue, callback) {
  data = {
    "name": item,
    "amount": startingValue || 0
  }
  collection.insert(data, function(err, result) {
    if (err) {
      if (err["code"] == 11000) {
        logger.warning(item + " is already in the DB!")
        callback("Already Added")
      } else {
        logger.error(JSON.stringify(err))
      }
    }
    else {
      callback(result)
      logger.log("Added " + item + " to the database with a starting value of " + startingValue)
    }
  })
}

function setAmount(item, value, callback) {
  collection.update({ "name": item }, { $set: { "amount": value } }, function(err, result) {
    if (err) logger.error(err)
    else {
      logger.log("Updated " + item + " to have a new value of " + value)
      callback(result)
    }
  })
}

function getItems(callback) {
  collection.find({}).toArray(function(err, result) {
    if (err) logger.error(err)
    else {
      if (result.length) {
        // logger.log("Found: " + result)
        callback(result)
      } else {
        // logger.log("No document(s) found with defined 'find' criteria!")
        callback(false)
      }
    }
  })
}

MongoClient.connect(url, function (err, db) {
  if (err) {
    logger.error('Unable to connect to the mongoDB server. Error: ' + err)
    process.exit(1)
  } else {
    logger.success('Connection established to ' + url)
    collection = db.collection('items')
    // collection.drop({})
    collection.createIndex( { name: 1 }, { unique: true } )
    addItem("light", 0, function(result) {})
    setAmount("light", 2, function(result) {})
    getItems(function(result) {
      if (result) {
        logger.log(JSON.stringify(result))
      } else {
        logger.log("No Data Found!")
      }
    })
  }
});

io.on('connection', function(socket){
  logger.log('a user connected')
  socket.on('disconnect', function(){
    logger.log('user disconnected')
  })
  socket.on('get data', function(msg, callback){
    logger.log('message: ' + msg)
    getItems(function(result) {
      callback(result)
    })
  })
  socket.on('set item', function(msg) {
    setAmount(msg[0], msg[1], function(result) {})
    socket.broadcast.emit('set item', [msg[0], msg[1]])
  })
  socket.on('add item', function(msg) {
    addItem(msg, 0, function() {})
    socket.emit('add item', [msg, 0])
  })
})

app.use(express.static(path.join(__dirname, 'static')));

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname + '/index.html'))
})

http.listen(3000, function () {
  logger.success('Example app listening on port 3000!')
})