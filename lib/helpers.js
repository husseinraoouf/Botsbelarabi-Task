const moment = require('moment');
const rp = require('request-promise-native');

let methods = {};

methods.extractParametars = (fields) => {
    let params = {};
  
    for (let k of Object.keys(fields)) {
        params[k] = fields[k][fields[k].kind];
    }

    return params;
}

methods.getLocation = async ({lat, long, city, country}) => {
    let result = {};

    console.log(`qqqqqqqq ${lat}  ${long}   ${city}   ${country}`);
    
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

methods.getTime = ({date, time}) => {
    let result = {};
    
    result.withTime = true;
    
    if (date && time) {
      console.log(`1 1`);
      
      let temp = date.substr(0, date.indexOf('T')) + 'T' + time.substr(time.indexOf('T') + 1);

      result.time = moment(temp).unix();

    } else if (date) {
      console.log(`2 2`);
      result.withTime = false;
      result.time = moment(date).unix();
    } else {
      console.log(`3 3`);
      result.time = moment().unix();
    }
    
    return result;
}

methods.convertToGMT = (time, timezone) => {
  return moment.unix(time).subtract(timezone, 'hours').unix();
}

methods.convertToTimezone = (time, timezone) => {
  return moment.unix(time).add(timezone, 'hours').unix();
}

module.exports = methods;