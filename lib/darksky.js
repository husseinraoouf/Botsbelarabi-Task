const rp = require('request-promise-native');


module.exports = (darkSkyKey) => {
    let methods = {};

    methods.getForcast = async (lat, long, numOfDays) => {

        const data = await rp({
            "uri": `https://api.darksky.net/forecast/${darkSkyKey}/${lat},${long}`,
            'qs': {
                'units': 'ca',
                'exclude': 'currently,minutely,hourly,alerts,flags',
            },
            "method": "GET",
            json: true,
        })

        let result = []
        for(let i = 0; i < numOfDays; i++) {
            result[i] = {
                'max': data.daily.data[i].temperatureHigh,
                'min': data.daily.data[i].temperatureLow,
                'subtitle': data.daily.data[i].summary,
                'icon': data.daily.data[i].icon,
                'time': data.daily.data[i].time,
            }
        }

        return result;
    }


    methods.getWeatherInTime = async (lat, long, time, withTime) => {

        const data = await rp({
            "uri": `https://api.darksky.net/forecast/${darkSkyKey}/${lat},${long},${time}`,
            'qs': {
                'units': 'ca',
                'exclude': 'minutely,hourly,alerts,flags',
            },
            "method": "GET",
            json: true,
        })

        let result;

        if (withTime) {
            result = {
                'temperature': data.currently.temperature,
                'humidity': data.currently.humidity,
                'subtitle': data.currently.summary,
                'icon': data.currently.icon,
                'time': data.currently.time,
            }
        } else {
            result = {
                'max': data.daily.data[0].temperatureHigh,
                'min': data.daily.data[0].temperatureLow,
                'subtitle': data.daily.data[0].summary,
                'icon': data.daily.data[0].icon,
                'time': data.daily.data[0].time,
            }
        }

        return result;

    }

        
    return methods;
};
