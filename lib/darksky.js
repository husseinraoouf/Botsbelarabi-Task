const rp = require('request-promise-native');
const helper = require('./helpers')();

module.exports = (darkSkyKey) => {
    let methods = {};

    methods.getForcast = async (lat, long, numOfDays, unit, timezone) => {

        const data = await rp({
            "uri": `https://api.darksky.net/forecast/${darkSkyKey}/${lat},${long}`,
            'qs': {
                'units': unit,
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
                'icon': helper.getIcon(data.daily.data[i].icon),
                'time': helper.convertToTimezone(data.daily.data[i].time, timezone),
                'chanceOfRain': data.daily.data[i].precipProbability * 100,
            }
        }

        return result;
    }


    methods.getWeatherInTime = async (lat, long, time, withTime, unit = 'ca', timezone) => {

        const data = await rp({
            "uri": `https://api.darksky.net/forecast/${darkSkyKey}/${lat},${long},${helper.convertToGMT(time, timezone)}`,
            'qs': {
                'units': unit,
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
                'time': helper.convertToTimezone(data.currently.time, timezone),
                'chanceOfRain': data.currently.precipProbability * 100,
            }
        } else {
            result = {
                'max': data.daily.data[0].temperatureHigh,
                'min': data.daily.data[0].temperatureLow,
                'subtitle': data.daily.data[0].summary,
                'icon': data.daily.data[0].icon,
                'time': helper.convertToTimezone(data.daily.data[0].time, timezone),
                'chanceOfRain': data.daily.data[0].precipProbability * 100,
            }
        }

        return [result];

    }

        
    return methods;
};
