 DROP TABLE city_location;
 DROP TABLE national_parks;
 DROP TABLE movies;
 DROP TABLE all_country_and_state_codes;
 DROP TABLE yelp;

 CREATE TABLE IF NOT EXISTS city_location(search_query varchar(50),formatted_query varchar(250),latitude  NUMERIC,longitude  NUMERIC);
 
 CREATE TABLE IF NOT EXISTS national_parks(
     name varchar(200),
     address varchar(250),
     fee  NUMERIC,
     description  varchar(500),
     url varchar(250),
     state_code char(2)
);

 CREATE TABLE IF NOT EXISTS movies(
     title varchar(100),
     overview varchar(500),
     average_votes  NUMERIC,
     total_votes  INT,
     image_url varchar(250),
     popularity NUMERIC,
     released_on varchar(50),
     country_code char(2)
);

CREATE TABLE IF NOT EXISTS all_country_and_state_codes(
    country varchar(50),
    display_name varchar(250),
    state_code char(2),
    country_code char(2)
);
 CREATE TABLE IF NOT EXISTS yelp(
     name varchar(100),
     image_url varchar(500),
     price  varchar(10),
     rating NUMERIC,
     url varchar(500),
     latitude  NUMERIC,
     longitude  NUMERIC
);

