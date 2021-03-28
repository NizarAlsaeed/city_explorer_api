'use strict';

const express = require('express');
const cors = require('cors');
const PORT = 3000;

const app = express();
app.listen(PORT, ()=> console.log(`App is running on port: ${PORT}`));
app.use(cors());

app.get('/location', handleLocation);
//app.get('/weather', weatherHandler);


function handleLocation(request,response){
    console.log('request.query', request.query);
    const locationData = require('./data/location.json');
    console.log('locationData', locationData);
    const city = request.query.city;
    console.log('city', city);
    let resObj={
        search_query: city,
        formatted_query: locationData[0].display_name,
        latitude: locationData[0].lat,
        longitude: locationData[0].lon,
    };
    console.log('resObj', resObj);
    response.send(resObj);

}





