const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.set({strictQuery: true});
mongoose.connect("mongodb+srv://admin-irfan:Irf6360944@cluster0.jo7etur.mongodb.net/classDB")

app.get("/", function(req, res) {
  res.render("home");
});

const periodSchema = new mongoose.Schema({
  day: String,
  start: String,
  end: String,
  subject: String
});

const Period = mongoose.model("Period",periodSchema);

app.post("/timeTable", function(req, res) {
  const day = req.body.day;
  res.redirect(String(day));
});

//to set the error raised by favicon.ico
app.use(function(req, res, next) {
  if (req.originalUrl && req.originalUrl.split("/").pop() === 'favicon.ico') {
    return res.sendStatus(204);
  }
  next();
});

app.get("/timeTable",function(req,res){
  const weekday = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];

   const d = new Date();
   let day = weekday[d.getDay()];
  res.redirect("/"+day);;
});

app.get("/:day", function(req, res) {
  const day = req.params.day;

  Period.find({day: day},function(err,period){
    if(!err){
      res.render(day,{keyPeriod: period});
    }
  });
});




app.post("/day", function(req, res) {
  res.render("addClass");
});



app.post("/addClass", function(req, res) {
  const day = _.lowerCase(req.body.day);
  var s = String(req.body.start);
  var e = String(req.body.end);
  const subject = req.body.subject;

//To convert the 24hrs format to 12hrs format
  var splitStart = s.split(":");
  if(splitStart[0]<12){
    if(splitStart[0]=="0" || splitStart[0]=="00"){
      splitStart[0] = "12";
    }
    s = splitStart[0]+":"+splitStart[1]+"AM";
  }else{
    splitStart[0] = splitStart[0] % 12;
    if(splitStart[0]=="0" || splitStart[0]=="00"){
      splitStart[0] = "12";
    }
    s = splitStart[0]+":"+splitStart[1]+"PM";
  }

  var splitEnd = e.split(":");
  if(splitEnd[0]<12){
    if(splitEnd[0]=="0" || splitEnd[0]=="00"){
      splitEnd[0] = "12";
    }
    e = splitEnd[0]+":"+splitEnd[1]+"AM";
  }else{
    splitEnd[0] = splitEnd[0] % 12;
    if(splitEnd[0]=="0" || splitEnd[0]=="00"){
      splitEnd[0] = "12";
    }
    e = splitEnd[0]+":"+splitEnd[1]+"PM";
  }

  const period = new Period({
    day: day,
    start: s,
    end: e,
    subject: subject
  });
  period.save();
  res.redirect("/timeTable");
});





app.listen(process.env.PORT || 3000, function() {
  console.log("Server started at port 3000");
});
