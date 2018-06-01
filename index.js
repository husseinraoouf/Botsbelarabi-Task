'use strict';

const path = require('path');
process.env['GOOGLE_APPLICATION_CREDENTIALS'] = path.join(`${__dirname}/Botsbelarabi-Task-d38fc640e5a8.json`);

// Imports dependencies and set up http server
const
  express = require('express'),
  bodyParser = require('body-parser'),
  app = express(),
  rp = require('request-promise-native'),
  dialogflow = require('dialogflow'),
  sessionClient = new dialogflow.SessionsClient(),
  messenger = require('./lib/messenger'),
  mesClient = messenger(process.env.FB_PAGE_ACCESS_TOKEN),
  darksky = require('./lib/darksky'),
  weatherClient = darksky(process.env.DARKSKY_KEY),
  connectDB = require('./lib/users'),
  moment = require('moment');


const start = async () => {

  const Users = await connectDB(process.env.MONGODB_URI);
  
  app.use(bodyParser.json());
  app.use('/static', express.static('static'));
  
  // Adds support for GET requests to our webhook
  app.get('/webhook', (req, res) => {
  
    // Your verify token. Should be a random string.
    let VERIFY_TOKEN = "secret"
  
    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];
  
    // Checks if a token and mode is in the query string of the request
    if (mode && token) {
  
      // Checks the mode and token sent is correct
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
  
        // Responds with the challenge token from the request
        console.log('WEBHOOK_VERIFIED');
        res.status(200).send(challenge);
  
      } else {
        // Responds with '403 Forbidden' if verify tokens do not match
        res.sendStatus(403);
      }
    }
  });
  
  
  
  // Creates the endpoint for our webhook
  app.post('/webhook', (req, res) => {
  
    // Parse the request body from the POST
    let body = req.body;
  
    // Check the webhook event is from a Page subscription
    if (body.object === 'page') {
  
      // Iterate over each entry - there may be multiple if batched
      for (var i in body.entry) {
        // Gets the body of the webhook event
        let webhook_event = body.entry[i].messaging[0];
        console.log(JSON.stringify(webhook_event));
  
  
        // Get the sender PSID
        let sender_psid = webhook_event.sender.id;
        console.log('Sender PSID: ' + sender_psid);
  
        // Check if the event is a message or postback and
        // pass the event to the appropriate handler function
        if (webhook_event.message) {
          handleMessage(sender_psid, webhook_event.message);
        } else if (webhook_event.postback) {
          handlePostback(sender_psid, webhook_event.postback);
        }
      }
  
      // Return a '200 OK' response to all events
      res.status(200).send('EVENT_RECEIVED');
  
    } else {
      // Return a '404 Not Found' if event is not from a page subscription
      res.sendStatus(404);
    }
  
  });
  
  
  async function handleMessage(sender_psid, received_message) {
  
    if (received_message.quick_reply) {

      let payload = JSON.parse(received_message.quick_reply.payload);

      if (payload == "changeLocation") {


      } else if (payload == "changeUnit") {



      }

      await mesClient.sendText(sender_psid, `ma3lesh`);

    } else if (received_message.text) {
      // Define session path
      const sessionPath = sessionClient.sessionPath(process.env.projectId, sender_psid);
  
      // The text query request.
      const request = {
        session: sessionPath,
        queryInput: {
          text: {
            text: received_message.text,
            languageCode: 'en-US',
          },
        },
      };
  
  
      sessionClient
        .detectIntent(request)
        .then(async (responses) => {
          const result = responses[0].queryResult;
          console.log(result.parameters.fields);
  
          let params = {};
  
          for (let k of Object.keys(result.parameters.fields)) {
            params[k] = result.parameters.fields[k][result.parameters.fields[k].kind];
          }
  
          console.log(params);
          if (result.action && result.action == 'getForcast') {
            let lat, long, numOfDays;
  
            if (params.lat && params.long) {
              lat = params.lat;
              long = params.long;
            } else if (params.city) {
              const geo = JSON.parse(await rp({
                "uri": "https://maps.googleapis.com/maps/api/geocode/json",
                "qs": {
                  'key': process.env.GEOCODE_KEY,
                  'address': `${params.city}, ${params.country}`
                },
                "method": "GET",
              }));
  
              console.log(geo);
  
              lat = geo.results[0].geometry.location.lat;
              long = geo.results[0].geometry.location.lng;
            } else {
              await mesClient.sendText(sender_psid, `Please Enter A place`);
            }
  
  
            numOfDays = params.numOfDays;
  
            const user = await Users.getUser(sender_psid);

            const weatherData = await weatherClient.getForcast(lat, long, numOfDays, user.unit);
  
            console.log(weatherData);
  
  
            let response = {
              "attachment": {
                "type": "template",
                "payload": {
                  "template_type": "generic",
                  "elements": []
                }
              }
            }
  
            for (let i = 0; i < numOfDays; i++) {
              response.attachment.payload.elements.push({
                "title": `${moment.unix(weatherData[i].time).format('dddd')} Max: ${weatherData[i].max} Min: ${weatherData[i].min}`,
                "image_url": `https://botsbelaraby-task.herokuapp.com/static/icons/${weatherData[i].icon}.png`,
                "subtitle": `${weatherData[i].subtitle}
  Data For the Day ${moment.unix(weatherData[i].time).format('dddd DD-MM-YYYY')}`,
              })
            }
  
            await mesClient.callSendMessageAPI(sender_psid, response);
            // await mesClient.sendText(sender_psid, `Weather (Forecast) For Location lat: ${lat} long: ${long} For ${numOfDays} days`);
          } else if (result.action && result.action == 'getWeatherInTime') {
            let lat, long, time, withTime = false;
  
            if (params.lat && params.long) {
              lat = params.lat;
              long = params.long;
            } else if (params.city) {
              const geo = JSON.parse(await rp({
                "uri": "https://maps.googleapis.com/maps/api/geocode/json",
                "qs": {
                  'key': process.env.GEOCODE_KEY,
                  'address': `${params.city}, ${params.country}`
                },
                "method": "GET",
              }));
  
              console.log(geo);
  
              lat = geo.results[0].geometry.location.lat;
              long = geo.results[0].geometry.location.lng;
  
            } else {
              await mesClient.sendText(sender_psid, `Please Enter A place`);
            }
  
  
            if (params.date && params.time) {
              withTime = true;
              let temp = params.date.substr(0, params.date.indexOf('T')) + 'T' + params.time.substr(params.time.indexOf('T') + 1);
  
              time = moment(temp).unix();
  
            } else if (params.date) {
              time = moment(params.date).unix();
            } else {
              time = moment().unix();
            }
  
            
            const user = await Users.getUser(sender_psid);

            console.log(withTime);
            const weatherData = await weatherClient.getWeatherInTime(lat, long, time, withTime, user.unit);
  
            console.log(weatherData);
  
  
            let response = {
              "attachment": {
                "type": "template",
                "payload": {
                  "template_type": "generic",
                  "elements": []
                }
              }
            }
  
  
            if (withTime) {
              response.attachment.payload.elements.push({
                "title": `${moment.unix(weatherData.time).format('dddd')} Temperature: ${weatherData.temperature} Humidity: ${weatherData.humidity}`,
                "image_url": `https://botsbelaraby-task.herokuapp.com/static/icons/${weatherData.icon}.png`,
                "subtitle": `${weatherData.subtitle}
  Data For the Day ${moment.unix(weatherData.time).format('dddd DD-MM-YYYY')} at ${moment.unix(weatherData.time).format('hh a')}`,
              })
            } else {
              response.attachment.payload.elements.push({
                "title": `${moment.unix(weatherData.time).format('dddd')} Max: ${weatherData.max} Min: ${weatherData.min}`,
                "image_url": `https://botsbelaraby-task.herokuapp.com/static/icons/${weatherData.icon}.png`,
                "subtitle": `${weatherData.subtitle}
  Data For the Day ${moment.unix(weatherData.time).format('dddd DD-MM-YYYY')}`,
              })
            }
  
            await mesClient.callSendMessageAPI(sender_psid, response);
  
            // await mesClient.sendText(sender_psid, `Weather (Time) For Location lat: ${lat} long: ${long} and Time: ${time} for ${withTime ? `Spacific Time` : `all Day`}`);
          } else if (result.action && result.action == 'askAboutLocation') {
            let lat, long;
  
            if (params.lat && params.long) {
              lat = params.lat;
              long = params.long;
            } else if (params.city) {
              const geo = JSON.parse(await rp({
                "uri": "https://maps.googleapis.com/maps/api/geocode/json",
                "qs": {
                  'key': process.env.GEOCODE_KEY,
                  'address': `${params.city}, ${params.country}`
                },
                "method": "GET",
              }));
  
              console.log(geo);
  
              lat = geo.results[0].geometry.location.lat;
              long = geo.results[0].geometry.location.lng;
            } else {
              await mesClient.sendText(sender_psid, `Please Enter A place`);
            }

            let response = {
              "attachment": {
                "type": "template",
                "payload": {
                  "template_type": "button",
                  "text": "What Do You Want To Do?",
                  "buttons": [
                    {
                      "type": "postback",
                      "title": "Set As My Location",
                      "payload": JSON.stringify({
                        "action": 'setLocation',
                        "location": JSON.stringify({
                          "lat": lat,
                          "long": long
                        })
                      }) 
                    },
                    {
                      "type": "postback",
                      "title": "Check The Weather",
                      "payload": JSON.stringify({
                        "action": 'checkWeather',
                        "location": JSON.stringify({
                          "lat": lat,
                          "long": long
                        })
                      })
                    },
                    {
                      "type": "postback",
                      "title": "Check The Forecast",
                      "payload": JSON.stringify({
                        "action": 'checkForecast',
                        "location": JSON.stringify({
                          "lat": lat,
                          "long": long
                        })
                      })
                    }
                  ]
                }
              }
            } 
    
            await mesClient.callSendMessageAPI(sender_psid, response);

          } else if (result.action && result.action == 'getWeatherInTimeNoPlace') {
            
            const user = await Users.getUser(sender_psid);

            if (user.location) {
              let time, withTime = false;
      
              if (params.date && params.time) {
                withTime = true;
                let temp = params.date.substr(0, params.date.indexOf('T')) + 'T' + params.time.substr(params.time.indexOf('T') + 1);
    
                time = moment(temp).unix();
    
              } else if (params.date) {
                time = moment(params.date).unix();
              } else {
                time = moment().unix();
              }
    
              
              
              console.log(withTime);
              const weatherData = await weatherClient.getWeatherInTime(user.location.lat, user.location.long, time, withTime, user.unit);
    
              console.log(weatherData);
    
    
              let response = {
                "attachment": {
                  "type": "template",
                  "payload": {
                    "template_type": "generic",
                    "elements": []
                  }
                }
              }
    
    
              if (withTime) {
                response.attachment.payload.elements.push({
                  "title": `${moment.unix(weatherData.time).format('dddd')} Temperature: ${weatherData.temperature} Humidity: ${weatherData.humidity}`,
                  "image_url": `https://botsbelaraby-task.herokuapp.com/static/icons/${weatherData.icon}.png`,
                  "subtitle": `${weatherData.subtitle}
    Data For the Day ${moment.unix(weatherData.time).format('dddd DD-MM-YYYY')} at ${moment.unix(weatherData.time).format('hh a')}`,
                })
              } else {
                response.attachment.payload.elements.push({
                  "title": `${moment.unix(weatherData.time).format('dddd')} Max: ${weatherData.max} Min: ${weatherData.min}`,
                  "image_url": `https://botsbelaraby-task.herokuapp.com/static/icons/${weatherData.icon}.png`,
                  "subtitle": `${weatherData.subtitle}
    Data For the Day ${moment.unix(weatherData.time).format('dddd DD-MM-YYYY')}`,
                })
              }
    
              await mesClient.callSendMessageAPI(sender_psid, response);
            
            } else {
              await mesClient.sendText(sender_psid, 'Please Set a location Firest')
            }
            
  
          } else if (result.action && result.action == 'getForcastNoPlace') {
            const user = await Users.getUser(sender_psid);
            
            if (user.location) {


              const numOfDays = params.numOfDays;
  
              const weatherData = await weatherClient.getForcast(user.location.lat, user.location.long, numOfDays, user.unit);
    
              console.log(weatherData);
    
    
              let response = {
                "attachment": {
                  "type": "template",
                  "payload": {
                    "template_type": "generic",
                    "elements": []
                  }
                }
              }
    
              for (let i = 0; i < numOfDays; i++) {
                response.attachment.payload.elements.push({
                  "title": `${moment.unix(weatherData[i].time).format('dddd')} Max: ${weatherData[i].max} Min: ${weatherData[i].min}`,
                  "image_url": `https://botsbelaraby-task.herokuapp.com/static/icons/${weatherData[i].icon}.png`,
                  "subtitle": `${weatherData[i].subtitle}
    Data For the Day ${moment.unix(weatherData[i].time).format('dddd DD-MM-YYYY')}`,
                })
              }
    
              await mesClient.callSendMessageAPI(sender_psid, response);
            
            } else {
              await mesClient.sendText(sender_psid, 'Please Set a location Firest')
            }
            
          } else {
            await mesClient.sendText(sender_psid, result.fulfillmentText);
          }
  
  
  
          if (result.intent) {
            console.log(`  Intent: ${result.intent.displayName}`);
          } else {
            console.log(`  No intent matched.`);
          }
        })
        .catch(err => {
          console.error('ERROR:', err);
        });
  
    } else if (received_message.attachments) {
  
      if (received_message.attachments[0].type == "location") {
        const lat = received_message.attachments[0].payload.coordinates.lat;
        const long = received_message.attachments[0].payload.coordinates.lng;

        console.log(`qqqqqqqqqqqqqqqqqqqqqqq: ${lat}    ${long}`);
        
        let response = {
          "attachment": {
            "type": "template",
            "payload": {
              "template_type": "button",
              "text": "What Do You Want To Do?",
              "buttons": [
                {
                  "type": "postback",
                  "title": "Set As My Location",
                  "payload": JSON.stringify({
                    "action": 'setLocation',
                    "location": JSON.stringify({
                      "lat": lat,
                      "long": long
                    })
                  }) 
                },
                {
                  "type": "postback",
                  "title": "Check The Weather",
                  "payload": JSON.stringify({
                    "action": 'checkWeather',
                    "location": JSON.stringify({
                      "lat": lat,
                      "long": long
                    })
                  })
                },
                {
                  "type": "postback",
                  "title": "Check The Forecast",
                  "payload": JSON.stringify({
                    "action": 'checkForecast',
                    "location": JSON.stringify({
                      "lat": lat,
                      "long": long
                    })
                  })
                }
              ]
            }
          }
        }

        await mesClient.callSendMessageAPI(sender_psid, response);
      } else {
        // Gets the URL of the message attachment
        let attachment_url = received_message.attachments[0].payload.url;
        await mesClient.sendText(sender_psid, 'ma3lesh');
      }
  
    }
  
  }
  
  
  async function handlePostback(sender_psid, received_postback) {
  
    // Get the payload for the postback
    let payload = JSON.parse(received_postback.payload);
  
    // Set the response based on the postback payload
    if (payload.action == 'getstarted') {
  
      var user = await mesClient.getUserInfo(sender_psid);

      await mesClient.sendText(sender_psid, `Welcome ${user.first_name}`);
      await mesClient.sendText(sender_psid, 'I\'am Weather Bot, And I\'am here To help you');


      await mesClient.sendText(sender_psid, `Enter Your Location by:`)
      await mesClient.sendText(sender_psid, `text`)
      await mesClient.sendText(sender_psid, `long/latitude`)
      await mesClient.sendText(sender_psid, `sending location in messenger`)
      // await mesClient.sendText(sender_psid, `talk to me And I will Understand`)
      
      let response = {
        "text": `clicking on the bubble below`,
        "quick_replies": [{
          "content_type": "location"
        }]
      }

      await Users.createUser(sender_psid);
  
      await mesClient.callSendMessageAPI(sender_psid, response);
    } else if (payload.action == 'setLocation') {

      const location = JSON.parse(payload.location);
      await Users.setLocation(sender_psid, location);

      console.log(location);
      

      await mesClient.sendText(sender_psid, "I Have Set Yor Location");


      const weatherData = await weatherClient.getWeatherInTime(location.lat, location.long, moment().unix(), true);
    
  
      let response = {
        "attachment": {
          "type": "template",
          "payload": {
            "template_type": "generic",
            "elements": []
          }
        }
      }


      response.attachment.payload.elements.push({
        "title": `${moment.unix(weatherData.time).format('dddd')} Max: ${weatherData.max} Min: ${weatherData.min}`,
        "image_url": `https://botsbelaraby-task.herokuapp.com/static/icons/${weatherData.icon}.png`,
        "subtitle": `${weatherData.subtitle}
Data For the Day ${moment.unix(weatherData.time).format('dddd DD-MM-YYYY')}`,
      })

      await mesClient.callSendMessageAPI(sender_psid, response);

    } else if (payload.action == 'checkWeather') {

      const location = JSON.parse(payload.location);

      const user = await Users.getUser(sender_psid);

      const weatherData = await weatherClient.getWeatherInTime(location.lat, location.long, moment().unix(), true, user.unit);
    
  
      let response = {
        "attachment": {
          "type": "template",
          "payload": {
            "template_type": "generic",
            "elements": []
          }
        }
      }


      response.attachment.payload.elements.push({
        "title": `${moment.unix(weatherData.time).format('dddd')} Max: ${weatherData.max} Min: ${weatherData.min}`,
        "image_url": `https://botsbelaraby-task.herokuapp.com/static/icons/${weatherData.icon}.png`,
        "subtitle": `${weatherData.subtitle}
Data For the Day ${moment.unix(weatherData.time).format('dddd DD-MM-YYYY')}`,
      })

      await mesClient.callSendMessageAPI(sender_psid, response);

    } else if (payload.action == 'checkForecast') {

      const location = JSON.parse(payload.location);

      const numOfDays = 7;
  
      const user = await Users.getUser(sender_psid);

      const weatherData = await weatherClient.getForcast(location.lat, location.long, numOfDays, user.unit);

      console.log(weatherData);


      let response = {
        "attachment": {
          "type": "template",
          "payload": {
            "template_type": "generic",
            "elements": []
          }
        }
      }

      for (let i = 0; i < numOfDays; i++) {
        response.attachment.payload.elements.push({
          "title": `${moment.unix(weatherData[i].time).format('dddd')} Max: ${weatherData[i].max} Min: ${weatherData[i].min}`,
          "image_url": `https://botsbelaraby-task.herokuapp.com/static/icons/${weatherData[i].icon}.png`,
          "subtitle": `${weatherData[i].subtitle}
Data For the Day ${moment.unix(weatherData[i].time).format('dddd DD-MM-YYYY')}`,
        })
      }

      await mesClient.callSendMessageAPI(sender_psid, response);

    } else if (payload === 'menu') {

      let response = {
        "text": `What do you want to change?`,
        "quick_replies": [
          {
            "content_type":"text",
            "title":"Unit",
            "payload":"changeUnit",
          },
        ]
      }

      await mesClient.callSendMessageAPI(sender_psid, response);
    } 
  }
  
  
  
  
  
  const PORT = process.argv[2] || 5050;
  app.listen(PORT, () => {
    console.log(`CodingBot server running on port ${PORT}.`)
  });


}


start();