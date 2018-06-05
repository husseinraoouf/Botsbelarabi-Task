const rp = require('request-promise-native');
const helper = require('./helpers')();
const moment = require('moment');

module.exports = (facebookPageAccessToken) => {
    let methods = {};


    methods.callSendAPI = async (sender_psid, request_body) => {

        // Send the HTTP request to the Messenger Platform
        await rp({
            "uri": "https://graph.facebook.com/v2.6/me/messages",
            "qs": { "access_token": facebookPageAccessToken },
            "method": "POST",
            "json": request_body
        })
    
        console.log('message sent!');
    }
    
    
    methods.callSendMessageAPI = async (sender_psid, response) => {
        // Construct the message body
        let request_body = {
            "recipient": {
                "id": sender_psid
            },
            "message": response
        }
    
        await methods.callSendAPI(sender_psid, request_body);
    }
    
    methods.sendText = async (sender_psid, text) => {
    
        const response = {
            text,
        }
    
        // Send the response message
        await methods.callSendMessageAPI(sender_psid, response);
    }
    
    methods.sendTemplates = async (sender_psid, templates) => {

        let response = {
            "attachment": {
              "type": "template",
              "payload": {
                "template_type": "generic",
                "elements": templates
              }
            }
          }
    
        // Send the response message
        await methods.callSendMessageAPI(sender_psid, response);
    }

    methods.sendWeahterTime = async (sender_psid, weatherData, unit) => {
        
        const unitSympol = (unit == 'ca'? '\u2103' : '\u2109');

        let templates = [];

        for (let i = 0; i < weatherData.length; i++) {
          templates.push({
            "title": `${weatherData[i].temperature}${unitSympol} | ${weatherData[i].subtitle}`,
            "image_url": `https://botsbelaraby-task.herokuapp.com/static/icons/${weatherData[i].icon}.png`,
            "subtitle": `Humidity: ${weatherData[i].humidity} | ${weatherData[i].chanceOfRain.toFixed(2)}% chance of rain
Data For the Day ${moment.unix(weatherData[i].time).format('dddd DD-MM-YYYY')} at ${moment.unix(weatherData[i].time).format('hh a')}`,
            'buttons': [
                {
                    "type":"element_share"
                }
            ]
          })
        }

        await methods.sendTemplates(sender_psid, templates);

    }



    methods.sendWeahterDay = async (sender_psid, weatherData, unit) => {
        
        const unitSympol = (unit == 'ca'? '\u2103' : '\u2109');

        let templates = [];

        for (let i = 0; i < weatherData.length; i++) {
          templates.push({
            "title": `Max: ${weatherData[i].max}${unitSympol} Min: ${weatherData[i].min}${unitSympol}`,
            "image_url": `https://botsbelaraby-task.herokuapp.com/static/icons/${weatherData[i].icon}.png`,
            "subtitle": `${weatherData[i].subtitle}
${weatherData[i].chanceOfRain.toFixed(2)}% chance of rain
Data For the Day ${moment.unix(weatherData[i].time).format('dddd DD-MM-YYYY')}`,
            'buttons': [
                {
                    "type":"element_share"
                }
            ]
          })
        }

        await methods.sendTemplates(sender_psid, templates);
    }


    methods.sendLocationMenu = async (sender_psid, {lat, long}) => {
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
  
          await methods.callSendMessageAPI(sender_psid, response);
    }
    
    methods.typeOn = async (sender_psid) => {
    
        let request_body = {
            "recipient": {
                "id": sender_psid
            },
            "sender_action":"typing_on"
        }
    
        await methods.callSendAPI(request_body, sender_psid);
    }
    
    methods.typeOff = async (sender_psid) => {
    
        let request_body = {
            "recipient": {
                "id": sender_psid
            },
            "sender_action":"typing_off"
        }
    
        await methods.callSendAPI(request_body, sender_psid);
    
    }


    methods.getUserInfo = async (sender_psid) => {
    
        return await rp({
            "uri": "https://graph.facebook.com/v2.6/" + sender_psid,
            "qs": { "access_token": facebookPageAccessToken },
            "method": "GET",
            json: true,
        })
    
    }
    
    return methods;
};
