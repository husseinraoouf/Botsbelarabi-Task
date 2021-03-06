const moment = require('moment');
const rp = require('request-promise-native');
const fs = require('fs');

module.exports = () => {

  let iconNames = [];

  fs.readdirSync('./static/icons').forEach(file => {
    iconNames.push(file.substr(0, file.indexOf('.')));
  })

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

  methods.getTime = ({date, time}, timezone) => {
      let result = {};
      
      result.withTime = true;
      
      if (date && time) {      
        let temp = date.substr(0, date.indexOf('T')) + 'T' + time.substr(time.indexOf('T') + 1);

        result.time = moment(temp).unix();

      } else if (date) {
        result.withTime = false;
        result.time = moment(date).unix();
      } else {
        result.time = moment().add(timezone, 'hours').unix();
      }
      
      return result;
  }

  methods.getIcon = (icon) => {
    if (iconNames.includes(icon)) {
      return icon;
    } else {
      return 'default';
    }
  }

  methods.convertToGMT = (time, timezone) => {
    return moment.unix(time).subtract(timezone, 'hours').unix();
  }

  methods.convertToTimezone = (time, timezone) => {
    return moment.unix(time).add(timezone, 'hours').unix();
  }

  return methods;
}