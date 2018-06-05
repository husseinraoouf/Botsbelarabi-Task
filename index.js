'use strict';

const path = require('path');
const fs = require('fs');
fs.writeFileSync('key.json', process.env.GOOGEL_KEY);
process.env['GOOGLE_APPLICATION_CREDENTIALS'] = path.join(`${__dirname}/key.json`);

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
  helper = require('./lib/helpers'),
  moment = require('moment');


const start = async () => {

  const Users = await connectDB(process.env.MONGODB_URI);
  
  app.use(bodyParser.json());
  app.use('/static', express.static('static'));
  
  // Adds support for GET requests to our webhook
  app.get('/webhook', (req, res) => {
  
    // Parse the query params
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];
  
    // Checks if a token and mode is in the query string of the request
    if (mode && token) {
  
      // Checks the mode and token sent is correct
      if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
  
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

      if (payload.action == "changeUnit") {
        
        let response = {
          "text": `Choose The Unit`,
          "quick_replies": [
            {
              "content_type":"text",
              "title":"Celsius",
              "payload": JSON.stringify({
                "action": "setUnit",
                "unit": "ca",
              })
            },
            {
              "content_type":"text",
              "title":"Fahrenheit",
              "payload": JSON.stringify({
                "action": "setUnit",
                "unit": "us"
              })
            }
          ]
        }
  
        await mesClient.callSendMessageAPI(sender_psid, response);

      } else if (payload.action == 'setUnit') {
        await Users.setUnit(sender_psid, payload.unit);
        await mesClient.sendText(sender_psid, `I Have Set Your Unit To ${payload.unit == 'ca'? 'Celsius' : 'Fahrenheit'}`);
      }

    } else if (received_message.text) {
      // Define session path
      const sessionPath = sessionClient.sessionPath(process.env.GOOGLE_PROJECT_ID, sender_psid);
  
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
  
          let params = helper.extractParametars(result.parameters.fields);
  
          if (result.action && result.action == 'getForcast') {
            
            const user = await Users.getUser(sender_psid);

            const {lat, long} = helper.getLocation(params);
  
            const weatherData = await weatherClient.getForcast(lat, long, params.numOfDays, user.unit, user.timezone);

            await mesClient.sendWeahterDay(sender_psid, weatherData, user.unit);
          } else if (result.action && result.action == 'getWeatherInTime') {
  
            const user = await Users.getUser(sender_psid);

            const {lat, long} = helper.getLocation(params);
  
            const {time , withTime} = helper.getTime(params);

            const weatherData = await weatherClient.getWeatherInTime(lat, long, time, withTime, user.unit, user.timezone);

            if (withTime) {
              await mesClient.sendWeahterTime(sender_psid, weatherData, user.unit);              
            } else {
              await mesClient.sendWeahterDay(sender_psid, weatherData, user.unit);
            }
  
          } else if (result.action && result.action == 'askAboutLocation') {
            
            const location = helper.getLocation(params);

            mesClient.sendLocationMenu(sender_psid, location);

          } else if (result.action && result.action == 'getWeatherInTimeNoPlace') {
            
            const user = await Users.getUser(sender_psid);

            if (user.location) {
      
              const {time , withTime} = helper.getTime(params);

              console.log(`qqqqqqqqqqq ${time}`);
              
              const weatherData = await weatherClient.getWeatherInTime(user.location.lat, user.location.long, time, withTime, user.unit, user.timezone);   
    
              if (withTime) {
                await mesClient.sendWeahterTime(sender_psid, weatherData, user.unit);
              } else {
                await mesClient.sendWeahterDay(sender_psid, weatherData, user.unit);
              }
            
            } else {
              await mesClient.sendText(sender_psid, 'Please Set a location First')
            }
            
  
          } else if (result.action && result.action == 'getForcastNoPlace') {
            const user = await Users.getUser(sender_psid);
            
            if (user.location) {

              const weatherData = await weatherClient.getForcast(user.location.lat, user.location.long, params.numOfDays, user.unit, user.timezone);
    
              await mesClient.sendWeahterDay(sender_psid, weatherData, user.unit);

            } else {
              await mesClient.sendText(sender_psid, 'Please Set a location First')
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
        const long = received_message.attachments[0].payload.coordinates.long;
        
        mesClient.sendLocationMenu(sender_psid, {lat, long});
      } else {
        // Gets the URL of the message attachment
        let attachment_url = received_message.attachments[0].payload.url;
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

      await Users.createUser(sender_psid, user.timezone);
      await mesClient.callSendMessageAPI(sender_psid, response);

    } else if (payload.action == 'setLocation') {

      const location = JSON.parse(payload.location);

      await Users.setLocation(sender_psid, location);

      const user = await Users.getUser(sender_psid);

      await mesClient.sendText(sender_psid, "I Have Set Yor Location");

      const weatherData = await weatherClient.getWeatherInTime(location.lat, location.long, moment().unix(), true, user.unit, 0);
    
      await mesClient.sendWeahterTime(sender_psid, weatherData, user.unit);
      
    } else if (payload.action == 'checkWeather') {

      const location = JSON.parse(payload.location);

      const user = await Users.getUser(sender_psid);

      const weatherData = await weatherClient.getWeatherInTime(location.lat, location.long, moment().unix(), true, user.unit, 0);
    
      await mesClient.sendWeahterTime(sender_psid, weatherData, user.unit);

    } else if (payload.action == 'checkForecast') {

      const location = JSON.parse(payload.location);
  
      const user = await Users.getUser(sender_psid);

      const weatherData = await weatherClient.getForcast(location.lat, location.long, 7, user.unit, user.timezone);

      await mesClient.sendWeahterDay(sender_psid, weatherData, user.unit);

    } else if (payload.action === 'menu') {

      let response = {
        "text": `What do you want to change?`,
        "quick_replies": [
          {
            "content_type":"text",
            "title":"Unit",
            "payload": "{\"action\":\"changeUnit\"}",
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