const rp = require('request-promise-native');


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
