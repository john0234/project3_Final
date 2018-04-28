
var fs = require('fs');
var path = require('path');
var http = require('http');
var url = require('url');
var express = require('express');
var sqlite3 = require('sqlite3').verbose();
var imdb_poster = require(__dirname+'/imdb_poster.js');

var port = 8007;

var app = express();


app.use(express.static(__dirname));

app.get('/', function (req,res) {
    res.sendFile('index.html');
    res.sendFile('index.js');
    res.sendFile('index.css');
});

app.get('/results',function (req,res) {
    res.sendFile(__dirname+'/resultsPage.html');
    res.sendFile(__dirname+'/index.js');
});

app.post('/results',function (req,res) {
    var search = req.param('search');
    var dropDown = req.param('dropDown');
    var db = new sqlite3.Database('C:\\Users\\freak_000\\Desktop\\Repos\\Database Project3\\imdb.sqlite3');
    var rows = [];

    search = search.replace('*','%');
    search = search.replace('(','');
    search = search.replace(')','');
    //
    //console.log(search);

    if(dropDown === 'Titles'){

        db.serialize(function () {

            db.each('SELECT * FROM Titles WHERE primary_title LIKE "'+search+'"', function (err, row) {

                var fields = {field0:'', field1:'', field2:'',field3:'', const:'',pg:''};

                if(err === null){
                    if(row.primary_title !== undefined && row.primary_title !== null){
                        fields.field0 = row.primary_title;
                    } else {
                        fields.field0 = 'NA';
                    }
                    if(row.title_type !== undefined && row.title_type !== null){
                        fields.field1 = row.title_type;
                    } else {
                        fields.field1 = 'NA';
                    }
                    if(row.start_year !== undefined && row.start_year !== null){
                        fields.field2 = row.start_year;
                    } else {
                        fields.field2 = 'NA';
                    }
                    if(row.end_year !== undefined && row.end_year !== null){
                        fields.field3 = row.end_year;
                    } else {
                        fields.field3 = 'NA';
                    }
                    fields.const = row.tconst;
                    fields.pg = 'title';
                    rows.push(fields);

                } else {
                    console.log('ERROR: ' + err);
                }
            }, function(err,num){
                if(err === null){
                    res.send(JSON.stringify(rows));
                    res.end();
                } else {
                    console.log('ERROR: ' + err);
                }
            });
        });
    } else {
        db.serialize(function () {

            db.each('SELECT * FROM Names WHERE primary_name LIKE "'+search+'"', function (err, row) {
                var fields = {field0:'', field1:'', field2:'',field3:'', const:'', pg:''};

                //If error is null, then do operations
                if(err === null){
                    if(row.primary_name !== undefined && row.primary_name !== null){
                        fields.field0 = row.primary_name;
                    } else {
                        fields.field0 = 'NA';
                    }
                    if(row.birth_year !== undefined && row.birth_year !== null){
                        fields.field1 = row.birth_year;
                    } else {
                        fields.field1 = 'NA';
                    }
                    if(row.death_year !== undefined && row.death_year !== null){
                        fields.field2 = row.death_year;
                    } else {
                        fields.field2 = 'Present';
                    }
                    if(row.primary_professions !== undefined && row.primary_professions !== null){
                        fields.field3 = row.primary_professions;
                    } else {
                        fields.field3 = 'NA';
                    }

                    fields.const = row.nconst;
                    fields.pg = 'person';
                    rows.push(fields);

                } else {
                    console.log('ERROR: ' + err);
                }

            }, function(err,num){
                if(err === null){
                    res.send(JSON.stringify(rows));
                    res.end();
                } else {
                    console.log('ERROR: ' + err);
                }
            });
        });
    }
    db.close();
});


app.get('/person', function(req,res){
    var nconst = req.param('const');
    //console.log(nconst);
    var db = new sqlite3.Database('C:\\Users\\freak_000\\Desktop\\Repos\\Database Project3\\imdb.sqlite3');

    db.serialize(function(){
        db.all('SELECT * FROM Names WHERE nconst = "' + nconst+'"', function (err,rows) {

            if(err){
                console.log('ERROR: '+err);
            }
            //console.log(rows);
            var name = rows[0].primary_name;
            var birth_year = rows[0].birth_year;
            var death_year = rows[0].death_year;
            //checks if date of death is null
            if(death_year === null){
                death_year = 'Present';
            }

            var primary_professions = rows[0].primary_profession;
            var known_for_titles = rows[0].known_for_titles;
            var titles = known_for_titles.split(',');

            var promise = new Promise(function (resolve,reject) {

                imdb_poster.GetPosterFromNameId(nconst,function(err,data){
                    if(err){
                        reject(err);
                    }else{

                        //console.log(data);
                        resolve('https://'+data.host + '/'+ data.path);
                    }
                });
            });



            fs.readFile(__dirname+'/personHTMLPage.html','utf8',function (err,data) {

                if(err){
                    console.log('ERROR: '+ err);
                }

                var html_string = data.replace('primary_name',name);
                html_string = html_string.replace('primary_name','Name: '+name);
                html_string = html_string.replace('birth_year',birth_year);
                html_string = html_string.replace('death_year',death_year);
                html_string = html_string.replace('primary_professions','Primary Professions: '+primary_professions);
                html_string = html_string.replace('known_for_titles','Popular Titles: '+known_for_titles);

                var actual_titles = [];

                for(i=0;i<titles.length;i++){
                    db.all('SELECT * FROM Titles WHERE tconst="'+titles[i]+'"',function(err,rows){

                        actual_titles.push(rows[0].primary_title);

                    });
                }
                var interval = setInterval(function () {

                    if(actual_titles.length === titles.length){
                        clearInterval(interval);

                        for(i=0; i<actual_titles.length; i++){
                            html_string = html_string.replace(''+titles[i],'<a href="/title?const='+titles[i]+'">'+actual_titles[i]+'</a>');
                        }

                        Promise.all([promise]).then(function (value) {

                            html_string = html_string.replace('poster_img',""+value);
                            res.send(html_string);

                        });

                        db.close();
                    }

                },50);

            });
        });
    });

});

app.get('/title',function(req,res){
    var tconst = req.param('const');
    var db = new sqlite3.Database('C:\\Users\\freak_000\\Desktop\\Repos\\Database Project3\\imdb.sqlite3');
    db_close = false;

    var allPromises = [];
    var namePromises = [];

    //ALL BASIC INFO
    var promise1 = new Promise(function(resolve,reject){
        db.all('SELECT * FROM Titles WHERE tconst="'+tconst.trim()+'"',function (err,rows){
            if(err){
                reject(err);
            }else{
                resolve(rows);
            }
        });
    });

    allPromises.push(promise1);

    //POSTER
    var poster_promise = new Promise(function (resolve,reject) {

        imdb_poster.GetPosterFromTitleId(tconst,function(err,data){
            if(err){
                reject(err);

            }else{
                resolve('https://'+data.host + '/'+ data.path);
            }
        });
    });

    allPromises.push(poster_promise);

    //RATINGS
    var promise2 = new Promise(function (resolve,reject) {

        db.all('SELECT * FROM Ratings WHERE tconst="'+tconst.trim()+'"',function (err,rows) {
            if(err){
                reject(err);
            }else{
                resolve(rows);
            }
        });

    });

    allPromises.push(promise2);

    var promise3 = new Promise(function (resolve,reject) {

        db.all('SELECT * FROM Crew WHERE tconst="'+tconst.trim()+'"',function(err,rows){

            //TODO: get the crew members (might also need to get them from Principals Table)
            if(err){

                console.log(err);
                reject(err);

            }else{

                var top_billed_cast = "";
                var full_cast = [];
                var full_cast_names = [];

                var directors = rows[0].directors.split(',');
                var writers = rows[0].writers.split(',');

                for(i = 0; i < writers.length; i++){
                    directors.push(writers[i]);
                }

                for(i=0; i < directors.length; i++){
                    if(i === directors.length-1){
                        top_billed_cast += directors[i];
                    }else{
                        top_billed_cast += directors[i] + ', '
                    }

                    full_cast.push(directors[i]);
                }
                resolve(full_cast);
            }
        });
    });

    allPromises.push(promise3);

    var promise4 = new Promise(function (resolve,reject) {

        Promise.all([promise3]).then(function (value) {

            //console.log("PROMISE 3 VALUES: " + value[0].length);

            var stuff = value[0];

            for(i=0; i<stuff.length; i++){

                var name_promise = new Promise(function (resolve,reject) {

                    if(stuff[i] !== undefined){

                        db.all('SELECT * FROM Names WHERE nconst="'+stuff[i]+'"', function(err,rows){

                            if(err){
                                console.log(err);
                                reject(rows);
                            }
                            else{
                                if(rows[0] !== undefined){
                                    resolve(rows[0].primary_name);
                                }else{
                                    resolve("unknown");
                                }
                            }
                        });
                    }
                });
                namePromises.push(name_promise);
            }

        });

        Promise.all([namePromises]).then(function (values) {

            if(values === undefined){
               reject("ERROR");
            }
            //console.log("PROMISE 4 VALUES: "+ values);
            var name_array = [];
            for(i = 0; i < values.length; i++){
                name_array.push(values[i]);
            }
            //console.log(name_array);
            resolve(name_array);
        });

    });

    allPromises.push(promise4);

    Promise.all(allPromises).then(function(values) {

        //basic info
        var first = values[0];

        //url for poster
        var second = values[1];

        //movie ratings
        var third = values[2];

        //cast ids
        var fourth = values[3];

        //names?
        var fifth = values[4];

        //console.log(values);
        //console.log("TESTING -> : "+fifth[0]);

        //Promise1 values
        var primary_title = first[0].primary_title;
        var title_type = first[0].title_type;
        var start_year = first[0].start_year;
        var end_year = first[0].end_year;
        if(end_year === null){
            end_year = 'NA';
        }
        var run_time = first[0].runtime_minutes;
        var genres = first[0].genres;

        //Promise2
        var average_rating = third[0].average_rating;
        var num_votes = third[0].num_votes;

        //Promise3
        var top_billed_cast = "";

        for(i = 0; i < fourth.length; i++){

            if(i===(fourth.length-1)){
                top_billed_cast += fourth[i];
            } else {
                top_billed_cast += fourth[i] + ' ';
            }
        }

        /*
        //Promise4

        */

        //After All Promises/Values
        fs.readFile(__dirname+'/titleHTMLPage.html','utf8',function (err,data) {
            if(err){
                console.log('ERROR: '+ err);
            }

            var html_string = data.replace('primary_title',primary_title);
            html_string = html_string.replace('primary_title',primary_title);
            html_string = html_string.replace('title_type',title_type);
            html_string = html_string.replace('start_year',start_year);
            html_string = html_string.replace('end_year',end_year);
            html_string = html_string.replace('runtime_minutes',run_time + ' Minutes');
            html_string = html_string.replace('genres',genres);

            if(second !== undefined && second !== null){
                html_string = html_string.replace('poster_img',second);
            }else{
                console.log("Poster Not Found");
            }

            html_string = html_string.replace('average_rating',average_rating);
            html_string = html_string.replace('num_votes',num_votes);

            //Promise3
            html_string = html_string.replace('top_billed_cast',top_billed_cast);


            //Promise4

            for(i=0; i<fourth.length; i++){

                var replace_string = ''+fourth[i].trim().replace('\'"<a href>',"");
                var hyper_link = "<a href=\"person?const="+fourth[i]+"\">"+fourth[i]+"</a>";

                html_string = html_string.replace(replace_string,hyper_link);
            }


            res.send(html_string);
        });

    });

});


app.post("/updateGenre", function (req,res) {
    var db = new sqlite3.Database('C:\\Users\\freak_000\\Desktop\\Repos\\Database Project3\\imdb.sqlite3');
    var genre_string = req.param('genre_string');
    var blah = req.param('const');

    var temp = blah.split('=');
    var tconst = temp[1];
    tconst = tconst.replace('\'',"");


    console.log("connection: "+ genre_string + " " + tconst);
    db.serialize(function () {

        db.all("UPDATE Titles SET genres = '"+genre_string+"' WHERE tconst = '"+tconst+"'",function (err,rows) {
            if(err){
                console.log(err);
            }
        });

        db.close();
    });

    res.send('success');

});

app.post("/updateType", function (req,res) {
    var db = new sqlite3.Database('C:\\Users\\freak_000\\Desktop\\Repos\\Database Project3\\imdb.sqlite3');
    var media_type = req.param('media_type');
    var blah = req.param('const');

    var temp = blah.split('=');
    var tconst = temp[1];
    tconst = tconst.replace('\'',"");


    console.log("connection: "+ media_type + " " + tconst);
    db.serialize(function () {

        db.all("UPDATE Titles SET title_type = '"+media_type+"' WHERE tconst = '"+tconst+"'",function (err,rows) {
            if(err){
                console.log(err);
            }
        });

        db.close();
    });

    res.send('success');

});

app.post("/updateBday",function (req,res) {
    var db = new sqlite3.Database('C:\\Users\\freak_000\\Desktop\\Repos\\Database Project3\\imdb.sqlite3');
    var bday = req.param('bday');
    var blah = req.param('const');

    var temp = blah.split('=');
    var nconst = temp[1];
    nconst = nconst.replace('\'',"");


    console.log("connection: "+ bday + " " + nconst);
    db.serialize(function () {

        db.all("UPDATE Names SET birth_year = '"+bday+"' WHERE nconst = '"+nconst+"'",function (err,rows) {
            if(err){
                console.log(err);
            }
        });

        db.close();
    });

    res.send('success');


});


app.post("/updateDeathYear",function (req,res) {
    var db = new sqlite3.Database('C:\\Users\\freak_000\\Desktop\\Repos\\Database Project3\\imdb.sqlite3');
    var dday = req.param('dday');
    var blah = req.param('const');

    var temp = blah.split('=');
    var nconst = temp[1];
    nconst = nconst.replace('\'',"");


    console.log("connection: "+ dday + " " + nconst);
    db.serialize(function () {

        db.all("UPDATE Names SET death_year = '"+dday+"' WHERE nconst = '"+nconst+"'",function (err,rows) {
            if(err){
                console.log(err);
            }
        });

        db.close();
    });

    res.send('success');



});

app.post("/updateProfessions",function (req,res) {

    var db = new sqlite3.Database('C:\\Users\\freak_000\\Desktop\\Repos\\Database Project3\\imdb.sqlite3');
    var prof = req.param('prof');
    var blah = req.param('const');

    var temp = blah.split('=');
    var nconst = temp[1];
    nconst = nconst.replace('\'',"");


    console.log("connection: "+ prof + " " + nconst);
    db.serialize(function () {

        db.all("UPDATE Names SET primary_profession = '"+prof+"' WHERE nconst = '"+nconst+"'",function (err,rows) {
            if(err){
                console.log(err);
            }
        });

        db.close();
    });

    res.send('success');

});


app.listen(port);



