'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');
const PORT = process.env.PORT;
const client = new pg.Client(process.env.DATABASE_URL);
const app = express();
app.use(cors());
app.get('/location', locationHandler);
app.get('/weather', weatherHandler);
app.get('/parks', parksHandler);
app.use(errorHandler);

function errorHandler(err, request, response,next) {

    console.log('err',err );
    response.status(500).send('something is wrong in server');
}
client.on('error', err => console.log('Error in pg DataBase',err) );

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
    let SQL = `SELECT * FROM city_location WHERE lower(search_query)='${city.toLowerCase()}'`;
    client.query(SQL).then(result=> {
        let cashed=result.rows[0];
        console.log('cashed at the begining', cashed);
        if(!cashed){
            let key = process.env.GEOCODE_API_KEY;
            const url = `https://eu1.locationiq.com/v1/search.php?key=${key}&q=${city}&format=json`;

            superagent.get(url).then(locationData=>{
                const resObj= new LocationResposeData(city,locationData.body[0].display_name,locationData.body[0].lat,locationData.body[0].lon);
                response.send(resObj);
                console.log('resObj', resObj);
                saveToSQLDB(resObj);
            }).catch(err=>{
                console.log('ERROR IN LOCATION API');
                console.log(err);
            });
        }else{
            console.log('cashed from else', cashed);
            response.send(cashed);
        }
    }).catch(err=>{
        console.log('ERROR IN DATABASE Reading');
        console.log(err);
    });
}
function weatherHandler(request,response){
    let key = process.env.WEATHERBIT_API_KEY;
    const cityInfo = request.query;

    const url = `https://api.weatherbit.io/v2.0/current?lat=${cityInfo.latitude}&lon=${cityInfo.longitude}&key=${key}&include=minutely`;

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
    let SQL = `SELECT * FROM national_parks WHERE lower(address) like'%${cityInfo.search_query.toLowerCase()}%'`;
    console.log('SQL', SQL);
    client.query(SQL).then(result=> {
        let cashed=result.rows;
        console.log('weather at the begining', cashed);
        if(!cashed.length){
            const url = `https://developer.nps.gov/api/v1/parks?q=${cityInfo.formatted_query}&limit=3&api_key=${key}`;
            superagent.get(url).then(parksData=>{
                let resArr = parksData.body.data.map(obj=> {
                    return new ParksResposeData(obj.fullName,obj.addresses[0].city,obj.entranceFees[0].cost,obj.description,obj.url);
                });
                response.send(resArr);
                saveToSQLDB(resArr);
            });
        }else{
            response.send(cashed);
            console.log('weather from else', cashed);
        }
    });
}

function isInSQLDB(city){
    //why i cant do it as a function!!
/*     let SQL = `SELECT * FROM city_location WHERE search_query='${city}'`;
    return client.query(SQL).then(result=> {
        console.log('dataFromSQL', result.rows);
        return result.rows;
    }); */
}

function saveToSQLDB(data){

    if(Array.isArray(data) && data.length){
        let SQL = 'INSERT INTO national_parks(name,address,fee,description,url) VALUES($1, $2, $3, $4, $5) RETURNING *';
        data.forEach(dataObj=>{

            let values = Object.values(dataObj);
            client.query(SQL, values).then(result=> {
                console.log('Saved to DataBase >',result.rows);
            });
        });
    }else if(Object.values(data).length){
        let SQL = 'INSERT INTO city_location(search_query,formatted_query,latitude,longitude) VALUES($1, $2, $3, $4) RETURNING *';
        let values = Object.values(data);
        client.query(SQL, values).then(result=> {
            console.log('Saved to DataBase >',result.rows);
        });
    }
}


client.connect().then(()=> {
    console.log('connected to postgreSQL');
    app.listen(PORT, ()=> console.log(`App is running on port: ${PORT}`));
});

