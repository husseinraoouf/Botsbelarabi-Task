const moment = require('moment');

let methods = {};

methods.extractParametars = (fields) => {
    let params = {};
  
    for (let k of Object.keys(fields)) {
        params[k] = fields[k][fields[k].kind];
    }

    return params;
}

methods.getLocation = async ({lat, long, city, country}) => {
    let result;

    if (lat && long) {
        result.lat = lat;
        result.long = long;
      } else if (city) {
        const geo = JSON.parse(await rp({
          "uri": "https://maps.googleapis.com/maps/api/geocode/json",
          "qs": {
            'key': process.env.GEOCODE_KEY,
            'address': `${city}, ${country}`
          },
          "method": "GET",
        }));

        result.lat = geo.results[0].geometry.location.lat;
        result.long = geo.results[0].geometry.location.lng;
      }

      return result;
}

methods.getTime = async ({date, time}) => {

    console.log(`ggggggggggggggg ${time} ${date}`);
    
    let withTime = true;
    let timeResult;

    if (date && time) {
      let temp = date.substr(0, date.indexOf('T')) + 'T' + time.substr(time.indexOf('T') + 1);

      timeResult = moment(temp).unix();

    } else if (date) {
      withTime = false;
      timeResult = moment(date).unix();
    } else {
      timeResult = moment().unix();
    }
    
    return {time: timeResult, withTime};
}

methods.convertToGMT = (time, timezone) => {
  return moment.unix(time).subtract(timezone, 'hours').unix();
}

methods.convertToTimezone = (time, timezone) => {
  return moment.unix(time).add(timezone, 'hours').unix();
}

module.exports = methods;