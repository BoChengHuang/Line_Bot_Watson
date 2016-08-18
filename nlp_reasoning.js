var request = require('request');
var xml2js = require('xml2js');
var parser = new xml2js.Parser();

var getNLP = function(input, callback) {

	if (input != '') {

		input = encodeURI(input.toString());
		var url =  "http://juima.mybluemix.net/?mode=xml" + "&text=" + input + "&lang=zh_tw";
    	var keyword = [];

    	request({
    		method: 'POST',
    		uri: url
    	}, function (err, res, body) {
    		if (res.statusCode == 200) {
    			
    			parser.parseString(body, function (err, result) {
	        
		        if (err) {
		          console.log(err);
		        } else {
		          var objs = result.result;
		          for (var content in objs) {
		            switch (content) {
		              case 'Act':
		                for (var index in objs.Act) {
		                  keyword.push(objs.Act[index].$.classTypeValue); 
		                }
		                break;
		              case 'Subject':
		                for (var index in objs.Subject) {
		                  keyword.push(objs.Subject[index].$.classTypeValue);
		                }
		                break;
		              case 'DateTime':
		                for (var index in objs.DateTime) {
		                    keyword.push(objs.DateTime[index].$.classTypeValue);
		                  }
		                break;
		              case 'People':
		                for (var index in objs.People) {
		                    keyword.push(objs.People[index].$.classTypeValue);
		                  }
		                break;
		              case 'Place':
		                for (var index in objs.Place) {
		                    keyword.push(objs.Place[index].$.classTypeValue);
		                  }
		                break;
		              case 'Event':
		                for (var index in objs.Event) {
		                    keyword.push(objs.Event[index].$.classTypeValue);
		                  }
		                break;
		            }
		          }
		          console.log(keyword);
		          callback(keyword);
		        }
		      });

    		} else {
    			console.error(err);
    		}
    	});
	}  
}

var getReasoning = function (msgin, callback) {

	if (msgin) {
		var finalAns; // {end: true/false, candiate: []}
		var requestData = {
	        "payload": {
	            "Concept": msgin
	        }
	    };

		request({
			method: 'POST',
			uri: 'http://eva-reasoner.mybluemix.net',
			json: requestData
		}, function (err, res, body) {
			if (!err) {

				var result = body.Result;

				if (result.length > 0) {
					if (result[0].Confidence >= 70) {
						finalAns = {end: true, candidate: [body.BestAnswer]};
					} else if (result[0].Confidence >= 40) {
						var candidate = [];
						for (var i = 0; i < 3; i++) {
							candidate.push(result[i].Question);
						}
						finalAns = {end: false, candidate: candidate};
					} else {
						finalAns = {end: true, candidate: ['您可以再問一次嗎？給我多點提示^^']};
					}
				} else {
					finalAns = {end: true, candidate: ['您可以再問一次嗎？給我多點提示^^']};
				}
				console.log('Highgest level:' + result[0].Confidence);
		        callback(finalAns);
			} else {
				console.error(err);
			}
		});
	}
}
module.exports.getNLP = getNLP;
module.exports.getReasoning = getReasoning;