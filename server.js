'use strict';

const express = require('express');
const cors = require('cors');
const PORT = 3000;

const app = express();
app.listen(PORT, ()=> console.log(`App is running on port: ${PORT}`));
app.use(cors());
app.get('/cors', (req, res) => {
    res.send('Access-Control-Allow-Origin: Ok');
    res.setHeader('Access-Control-Allow-Origin', '*');
});
app.get('/location', locationHandler);
app.get('/weather', weatherHandler);

function LocationResposeData (search_query,formatted_query,latitude,longitude){
    this.search_query= search_query;
    this.formatted_query= formatted_query;
    this.latitude= latitude;
    this.longitude= longitude;
}
function WeatherResposeData (forecast,time){
    this.forecast= forecast;
    this.time= time;
}



function locationHandler(request,response){
    console.log('request.query', request.query);
    const locationData = require('./data/location.json');
    console.log('locationData', locationData);
    const city = request.query.city;
    console.log('city', city);
    const resObj= new LocationResposeData(city,locationData[0].display_name,locationData[0].lat,locationData[0].lon);

    console.log('resObj', resObj);
    response.send(resObj);

}

function weatherHandler(request,response){
    console.log('request.query', request.query);
    const weatherData = require('./data/weather.json');
    console.log('weatherData', weatherData);
    const city = request.query.city;
    console.log('city', city);
    let resArr=[];
    weatherData.data.forEach(obj=> {
        resArr.push( new WeatherResposeData(obj.weather.description,obj.datetime));
    });
    console.log('resArr', resArr);
    response.send(resArr);

}




