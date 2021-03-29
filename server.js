'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const PORT = process.env.PORT;

const app = express();
app.listen(PORT, ()=> console.log(`App is running on port: ${PORT}`));
app.use(cors());
app.get('/location', locationHandler);
app.get('/weather', weatherHandler);
app.get('/parks', parksHandler);
app.use(errorHandler);

function errorHandler(err, request, response,next) {

    console.log('err',err );
    response.status(500).send('something is wrong in server');
}

function LocationResposeData (search_query,formatted_query,latitude,longitude){
    this.search_query= search_query;
    this.formatted_query= formatted_query;
    this.latitude= latitude;
    this.longitude= longitude;
    LocationResposeDataArr.push(this);
}
let LocationResposeDataArr=[];

function WeatherResposeData (forecast,time){
    this.forecast= forecast;
    this.time= time;
    WeatherResposeDataArr.push(this);
}
let WeatherResposeDataArr=[];

function ParksResposeData (name,address,fee,description,url){
    this.name= name;
    this.address= address;
    this.fee=fee;
    this.description=description;
    this.url=url;
    ParksResposeDataArr.push(this);
}
let ParksResposeDataArr=[];


function locationHandler(request,response){
    const city = request.query.city;
    let cashed = false;
    LocationResposeDataArr.forEach(obj=>{if(obj.search_query===city){cashed=true; response.send(obj); console.log('cashed')}});
    if(!cashed){
        let key = process.env.GEOCODE_API_KEY;
        const url = `https://eu1.locationiq.com/v1/search.php?key=${key}&q=${city}&format=json`;

        superagent.get(url).then(locationData=>{
            const resObj= new LocationResposeData(city,locationData.body[0].display_name,locationData.body[0].lat,locationData.body[0].lon);
            console.log('LocationResposeDataArr',LocationResposeDataArr);
            response.send(resObj);
        }).catch(err=>{
            console.log('ERROR IN LOCATION API');
            console.log(err);
        });
    }

}
function weatherHandler(request,response){
    let key = process.env.WEATHERBIT_API_KEY;
    const cityInfo = request.query;

    const url = `https://api.weatherbit.io/v2.0/current?lat=${cityInfo.latitude}&lon=${cityInfo.longitude}&key=${key}&include=minutely`;
    console.log('url', url);

    superagent.get(url).then(weatherData=>{
        let resArr = weatherData.body.data.map(obj=> {
            return new WeatherResposeData(obj.weather.description,obj.datetime);
        });
        response.send(resArr);
    });
}
function parksHandler(request,response){
    let key = process.env.PARKS_API_KEY;
    const cityInfo = request.query;
    const url = `https://developer.nps.gov/api/v1/parks?q=${cityInfo.formatted_query}&limit=3&api_key=${key}`;
    console.log('url', url);
    superagent.get(url).then(parksData=>{
        let resArr = parksData.body.data.map(obj=> {
            return new ParksResposeData(obj.fullName,obj.addresses[0].city,obj.entranceFees[0].cost,obj.description,obj.url);
        });
        response.send(resArr);
    });
}






