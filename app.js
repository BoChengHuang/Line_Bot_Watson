/*eslint-env node*/

//------------------------------------------------------------------------------
// node.js starter application for Bluemix
//------------------------------------------------------------------------------

// This application uses express as its web server
// for more info, see: http://expressjs.com
var express = require('express');

// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

// create a new express server
var app = express();

// serve the files out of ./public as our main files
app.use(express.static(__dirname + '/public'));

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
app.listen(appEnv.port, '0.0.0.0', function() {
  // print a message when the server starts listening
  console.log("server starting on " + appEnv.url);
});

var watson = require('watson-developer-cloud');
var fs     = require('fs');
var qs = require('qs');
var retrieve_and_rank = watson.retrieve_and_rank({
  username: '<username>',
  password: '<password>',
  version: 'v1'
});

var cluster_id = '<cluster_id>';
var config_name = '<config_name>';
var collection_name = '<collection_name>';
var ans = '';
var record = [];

var _ = require('lodash');
var bodyParser = require('body-parser');
var request = require('superagent');
var LineBot = require('line-bot-sdk');
var client = LineBot.client({
  channelID: '<channelID>',
  channelSecret: '<channelSecret>',
  channelMID: '<channelMID>'
});

var syncRequest = require('sync-request');
var xml2js = require('xml2js');
var parser = new xml2js.Parser();
var nlp_reasoning = require('./nlp_reasoning.js');

app.use(bodyParser.urlencoded({ extended: false, limit: 2 * 1024 * 1024 }));
app.use(bodyParser.json({ limit: 2 * 1024 * 1024 }));

var greetings = ['您好', '你好', '妳好', 'hi', '嘿', '喂', '哈囉', 'hello', 'ㄎㄎ', '呵呵', '早安', '午安', '晚安', '早', '好', 'yo', '安安'];

app.post('/callback', function (req, res) {
  console.log(req.body.result);

  var receives = client.createReceivesFromJSON(req.body);
  _.each(receives, function(receive){
    
    if(receive.isMessage()){

      if(receive.isText()){

        var text = receive.getText();
        var found = false;
        for (var index in greetings) {
          if (greetings[index].indexOf(text.toLowerCase()) > -1) {
            found = true;
          }
        }

        if(text === 'me'){
          client.getUserProfile(receive.getFromMid())
            .then(function onResult(res){
              if(res.status === 200){
                var contacts = res.body.contacts;
                if(contacts.length > 0){
                  client.sendText(receive.getFromMid(), 'Hi!, you\'re ' + contacts[0].displayName);
                }
              }
            }, function onError(err){
              console.error(err);
            });
        }
        else if (found) {
          client
          .getUserProfile(receive.getFromMid())
          .then(function(res) {
            var contacts = res.body.contacts;
            console.log(contacts);
            client.sendText(contacts[0].mid, 'Hello, ' + contacts[0].displayName);
          });
        } else if (text == 'richText') {
          var Markup = LineBot.Markup;
          var markup = new Markup(1040);
          markup
          .setAction('openHomepage', 'Open Homepage', 'https://line.me')
          .addListener('openHomepage', 0, 0, 1040, 1040);
          client.sendRichMessage(receive.getFromMid(), 'https://upload.wikimedia.org/wikipedia/commons/7/7d/TPE_Terminal_2_EVA_Air.jpg', 'EVA', markup.build());
        }

        else {

          var id = receive.getFromMid();
          var end = false;
          var foundIndex = -1;
          for (var index in record) {
            if (record[index].id == id) {
              foundIndex = index;
              break;
            }
          }

          var numberInput = parseInt(text);
          if (foundIndex != -1 && numberInput >= 1 && numberInput <= 4 ) {
            text = record[foundIndex].candidate[text - 1];
            record.splice(foundIndex - 1, 1);

            if (numberInput == 4) {
              ans = '實在不好意思，請您見諒，您的問題可能Bot還沒有學會，您是否要轉接專人來為您服務，請點選：http://www.google.com" 。您也可以選擇繼續和Bot交談。';
              record.splice(foundIndex - 1, 1);
              end = true;
              client.sendText(receive.getFromMid(), ans);
            }
          }

          if (!end) {
            nlp_reasoning.getNLP(text, function (result) {
              nlp_reasoning.getReasoning(result, function (json) {
                if (json.end) {
                  ans = json.candidate[0];
                } else {
                  var candidate = [];
                  for (var i = 0; i < 3; i++) {
                    candidate.push(json.candidate[i]);
                  }
                  record.push({id: id, candidate: candidate});
                  ans = '請問您在問以下問題嗎\n1: ' + 
                    candidate[0] + '\n2: ' + 
                    candidate[1] + '\n3: ' + 
                    candidate[2] + '\n4: ' +
                    '以上皆非\n' +  
                    '請輸入數字取得更進一步的答案^^';
                }
                ans = ans.replace(/         /g, ' ');
                ans = ans.replace(/。/g, '。\n');
                client.sendText(receive.getFromMid(), ans);
                console.log('record: ');
                console.log(record);
                console.log('ans:' );
                console.log(ans);
              });
            });
          }
        }

      } else if(receive.isImage()){
        
        client.sendText(receive.getFromMid(), 'Thanks for the image!');

      } else if(receive.isVideo()){

        client.sendText(receive.getFromMid(), 'Thanks for the video!');

      } else if(receive.isAudio()){

        client.sendText(receive.getFromMid(), 'Thanks for the audio!');

      } else if(receive.isLocation()){

        client.sendLocation(
            receive.getFromMid(),
            receive.getText() + receive.getAddress(),
            receive.getLatitude(),
            receive.getLongitude()
          );

      } else if(receive.isSticker()){

        // This only works if the BOT account have the same sticker too
        client.sendSticker(
            receive.getFromMid(),
            receive.getStkId(),
            receive.getStkPkgId(),
            receive.getStkVer()
          );

      } else if(receive.isContact()){
        
        client.sendText(receive.getFromMid(), 'Thanks for the contact');

      } else {
        console.error('found unknown message type');
      }
    } else if(receive.isOperation()){

      console.log('found operation');

    } else {

      console.error('invalid receive type');

    }

  });
  res.send('ok');
});


function searching(input) {
  solrClient = retrieve_and_rank.createSolrClient({
  cluster_id: cluster_id,
  collection_name: collection_name,
  wt: 'json'
});

  var ranker_id = '<ranker_id>';
  var question  = 'q=' + input;
  var query     = qs.stringify({q: question, ranker_id: ranker_id, fl: 'id,body'});

  solrClient.get('fcselect', query, function(err, searchResponse) {
    if(err) {
      console.log('Error searching for documents: ' + err);
    }
      else {
        var result = JSON.stringify(searchResponse.response.docs, null, 2);
        result = JSON.parse(result);
        if (result == '') {
          console.log('Not found');
          ans = '您可以再問一次嗎？給我多點提示^^';
        } else {
          ans = result[0].body[0]
          console.log(result[0].body[0]); // Best answer
        }
      }
  });
}