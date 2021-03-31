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
app.get('/movies', moviesHandler);
app.get('/yelp', yelpHandler);

app.use(errorHandler);

function errorHandler(err, request, response,next) {

    console.log('err',err );
    response.status(500).send('something is wrong in server');
}
client.on('error', err => console.log('Error in pg DataBase',err) );




//-----------------------------------------------Constructor functions------------------------------------------

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

function MoviesResposeData (title,overview,average_votes,total_votes,image_url,popularity,released_on){
    this.title= title;
    this.overview= overview;
    this.average_votes=average_votes;
    this.total_votes=total_votes;
    this.image_url=image_url;
    this.popularity=popularity;
    this.released_on=released_on;
    MoviesResposeDataArr.push(this);
}
let MoviesResposeDataArr=[];

function YelpResposeData (name,image_url,price,rating,url){
    this.name= name;
    this.image_url= image_url;
    this.price=price;
    this.rating=rating;
    this.url=url;
    YelpResposeDataArr.push(this);
}
let YelpResposeDataArr=[];

//-----------------------------------------------Handlers------------------------------------------

let dataBaseOperationPromise = new Promise((resolve,reject)=>{console.log('using general promis');});

function locationHandler(request,response){
    const city = request.query.city;
    let SQL = `SELECT * FROM city_location WHERE lower(search_query)='${city.toLowerCase()}'`;
    client.query(SQL).then(result=> {
        let cashed=result.rows[0];
        if(!cashed){
            let key = process.env.GEOCODE_API_KEY;
            const url = `https://eu1.locationiq.com/v1/search.php?key=${key}&q=${city}&statecode=1&addressdetails=1&format=json`;

            superagent.get(url).then(locationData=>{
                const resObj= new LocationResposeData(city,locationData.body[0].display_name,locationData.body[0].lat,locationData.body[0].lon);
                response.send(resObj);
                console.log('resObj', resObj);
                saveToSQLDB(resObj);
                // get countr/state code and save it to DB
                let sql = `INSERT INTO all_country_and_state_codes(country,display_name,state_code,country_code) VALUES($1,$2,$3,$4) RETURNING *`;
                let values = [];
                values[0]=(locationData.body[0].address.country);
                values[1]=(locationData.body[0].display_name);
                values[2]=(locationData.body[0].address.state_code);
                values[3]=(locationData.body[0].address.country_code);
                dataBaseOperationPromise = client.query(sql, values);
            }).catch(err=>{
                console.log('ERROR IN LOCATION API');
                console.log(err);
            });
        }else{
            console.log('cashed from location', cashed);
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
    dataBaseOperationPromise.then(result=> {
        console.log('Saved state code to DataBase >',result.rows);

        let sql = `SELECT state_code FROM all_country_and_state_codes WHERE lower(display_name) like'${cityInfo.formatted_query.toLowerCase()}'`;
        client.query(sql).then(result=> {
            console.log('result', result);
            let stateCode = result.rows[0].state_code;
            if(stateCode){
                console.log('stateCode', stateCode);

                let SQL = `SELECT name,address,fee,description,url FROM national_parks WHERE lower(state_code) like'${stateCode.toLowerCase()}'`;
                client.query(SQL).then(result=> {
                    let cashed=result.rows;
                    console.log('park at the begining', cashed);
                    if(!cashed.length){
                        const url = `https://developer.nps.gov/api/v1/parks?stateCode=${stateCode}&limit=5&api_key=${key}`;
                        console.log('park url', url);
                        superagent.get(url).then(parksData=>{
                            let resArr = parksData.body.data.map(obj=> {
                                return new ParksResposeData(obj.fullName,obj.addresses[0].city,obj.entranceFees[0].cost,obj.description,obj.url);
                            });
                            response.send(resArr);
                            saveToSQLDB(resArr,stateCode,'park');
                        });
                    }else{
                        response.send(cashed);
                        console.log('park from else', cashed);
                    }
                });
            }
        });
    });
}
function moviesHandler(request,response){
    let key = process.env.MOVIE_API_KEY;
    const cityInfo = request.query;
    dataBaseOperationPromise.then(result=> {
        console.log('Saved country code to DataBase >',result.rows);
        let sql = `SELECT country_code FROM all_country_and_state_codes WHERE lower(display_name) like'${cityInfo.formatted_query.toLowerCase()}'`;
        client.query(sql).then(result=> {
            console.log('result', result);
            let countryCode = result.rows[0].country_code;
            console.log('countryCode', countryCode);
            if(countryCode){
                let SQL = `SELECT title,overview,average_votes,total_votes,image_url,popularity,released_on FROM movies WHERE lower(country_code) like'${countryCode.toLowerCase()}'`;
                client.query(SQL).then(result=> {
                    let cashed=result.rows;
                    console.log('movie at the begining', cashed);

                    if(!cashed.length){
                        const url = `https://api.themoviedb.org/3/search/movie?query=${countryCode[0]}&api_key=${key}&region=${countryCode}&language=ar-AR`;
                        console.log('movies url', url);
                        superagent.get(url).then(moviesData=>{
                            let resArr = moviesData.body.results.map(obj=> {
                                //MoviesResposeData (title,overview,average_votes,total_votes,image_url,popularity,released_on)
                                return new MoviesResposeData(obj.title,obj.overview,obj.vote_average,obj.vote_count,`https://image.tmdb.org/t/p/w500/${obj.poster_path}`,obj.popularity,obj.release_date);
                            });
                            response.send(resArr);
                            saveToSQLDB(resArr,countryCode,'movies');
                        });
                    }else{
                        response.send(cashed);
                        console.log('movies from else', cashed);
                    }
                });
            }
        });
    });
}
function yelpHandler(request,response){
    let key = process.env.YELP_API_KEY;
    const cityInfo = request.query;

    let SQL = `SELECT name,image_url,price,rating,url FROM yelp WHERE latitude = ${cityInfo.latitude} AND longitude = ${cityInfo.longitude}`;
    client.query(SQL).then(result=> {
        let cashed=result.rows;
        console.log('yelp at the begining', cashed);

        if(!cashed.length){
            const url = `https://api.yelp.com/v3/businesses/search?latitude=${cityInfo.latitude}&longitude=${cityInfo.longitude}`;
            console.log('yelp url', url);
            superagent.get(url)
                .set('Authorization',`Bearer ${key}`)
                .then(yelpData=>{
                    let resArr = yelpData.body.businesses.map(obj=> {
                        return new YelpResposeData(obj.name,obj.image_url,obj.price,obj.rating,obj.url);
                    });
                    response.send(resArr);
                    saveToSQLDB(resArr,undefined,'yelp',cityInfo.latitude,cityInfo.longitude);
                });
        }else{
            response.send(cashed);
            console.log('yelp from else', cashed);
        }
    });

}

//-----------------------------------------------DATABASE Manipulaton------------------------------------------

/*function isInSQLDB(city){
    //why i cant do it as a function!!
     let SQL = `SELECT * FROM city_location WHERE search_query='${city}'`;
    return client.query(SQL).then(result=> {
        console.log('dataFromSQL', result.rows);
        return result.rows;
    });
}*/

function saveToSQLDB(data,code=undefined,type=undefined,lat=undefined,lon=undefined){
    let SQL;
    if(Array.isArray(data) && data.length){
        switch (type) {
        case 'park':
            SQL = 'INSERT INTO national_parks(name,address,fee,description,url,state_code) VALUES($1, $2, $3, $4, $5,$6) RETURNING *';
            data.forEach(dataObj=>{
                let values = Object.values(dataObj);
                if(code){values.push(code);}
                client.query(SQL, values).then(result=> {
                    console.log('Saved parks to DataBase >',result.rows);
                });
            });
            break;
        case 'movies':
            SQL = 'INSERT INTO movies(title,overview,average_votes,total_votes,image_url,popularity,released_on,country_code) VALUES($1, $2, $3, $4, $5,$6,$7,$8) RETURNING *';
            data.forEach(dataObj=>{
                let values = Object.values(dataObj);
                if(code){values.push(code);}
                client.query(SQL, values).then(result=> {
                    console.log('Saved movies to DataBase >',result.rows);
                });
            });
            break;
        case 'yelp':
            SQL = 'INSERT INTO yelp(name,image_url,price,rating,url,latitude,longitude) VALUES($1, $2, $3, $4, $5,$6,$7) RETURNING *';
            data.forEach(dataObj=>{
                let values = Object.values(dataObj);
                values.push(lat);
                values.push(lon);
                client.query(SQL, values).then(result=> {
                    console.log('Saved yelp to DataBase >',result.rows);
                });
            });
            break;
        default:
            break;
        }
    }else if(Object.values(data).length){
        let SQL = 'INSERT INTO city_location(search_query,formatted_query,latitude,longitude) VALUES($1, $2, $3, $4) RETURNING *';
        let values = Object.values(data);
        client.query(SQL, values).then(result=> {
            console.log('Saved to DataBase >',result.rows);
        });
    }
}

//-----------------------------------------------run the app------------------------------------------

client.connect().then(()=> {
    console.log('connected to postgreSQL');
    app.listen(PORT, ()=> console.log(`App is running on port: ${PORT}`));
});

