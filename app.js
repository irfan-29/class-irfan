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
  subject: String,
  present: Number,
  absent: Number
});
const Period = mongoose.model("Period", periodSchema);


const taskSchema = new mongoose.Schema({
  task: String
});
const Task = mongoose.model("Task",taskSchema);

const completeTaskSchema = new mongoose.Schema({
  completeTask: String
});
const CompleteTask = mongoose.model("CompleteTask",completeTaskSchema);

//to set the error raised by favicon.ico
app.use(function(req, res, next) {
  if (req.originalUrl && req.originalUrl.split("/").pop() === 'favicon.ico') {
    return res.sendStatus(204);
  }
  next();
});


app.get("/timeTable", function(req, res) {
  const weekday = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const d = new Date();
  let day = weekday[d.getDay()];
  res.redirect("/" + day);;
});

app.post("/timeTable", function(req, res) {
  const day = req.body.day;
  res.redirect(String(day));
});


app.get("/attendance", function(req, res){
    Period.find(function(err, period){
        if (!err){
           res.render("attendance", {keyAttendance: period});
        }
    });
});


//Tasks
app.post("/tasks", function(req, res) {
  const task = req.body.newTask;
  const newTask = new Task({
    task: task
  });
  newTask.save();
  res.redirect("/tasks");
});

app.get("/tasks", function(req, res){
    Task.find(function(err, task){
        if (!err){
          CompleteTask.find(function(err, completeTask){
            if(!err){
               res.render("tasks", {keyTask: task, keyCompleteTask: completeTask});
            }
          });
        }
    });
});

app.post("/deleteTask", function(req,res){
  const deleteTask = req.body.deleteTask;
  Task.deleteOne({task: deleteTask}, function(err){
    if(err){console.log();}
  });
  res.redirect("/tasks");
});

app.post("/deleteCompleteTask", function(req,res){
  const deleteCompleteTask = req.body.deleteCompleteTask;
  CompleteTask.deleteOne({completeTask: deleteCompleteTask}, function(err){
    if(err){console.log();}
  });
  res.redirect("/tasks");
});

app.post("/completeTask", function(req,res){
  const completeTask = req.body.checkbox;
  Task.deleteOne({task: completeTask}, function(err){
    if(err){console.log();}
  });
  const newCompleteTask = new CompleteTask({
    completeTask: completeTask
  });
  newCompleteTask.save();
  res.redirect("/tasks");
});

app.post("/notCompleteTask", function(req,res){
  const notCompleteTask = req.body.checkbox2;
  CompleteTask.deleteOne({completeTask: notCompleteTask}, function(err){
    if(err){console.log();}
  });
  const newNotCompleteTask = new Task({
    task: notCompleteTask
  });
  newNotCompleteTask.save();
  res.redirect("/tasks");
});

app.get("/:day", function(req, res){
    const day = req.params.day;
    Period.find({day: day}, function(err, period){
        if (!err){
          res.render(day, {keyPeriod: period});
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
  if(splitStart[0] < 12){
    if(splitStart[0] == "0" || splitStart[0] == "00"){
        splitStart[0] = "12";
    }
    s = splitStart[0] + ":" + splitStart[1] + "AM";
    }else{
        splitStart[0] = splitStart[0] % 12;
        if (splitStart[0] == "0" || splitStart[0] == "00") {
           splitStart[0] = "12";
        }
        s = splitStart[0] + ":" + splitStart[1] + "PM";
    }

      var splitEnd = e.split(":");
      if (splitEnd[0] < 12) {
        if (splitEnd[0] == "0" || splitEnd[0] == "00") {
          splitEnd[0] = "12";
        }
        e = splitEnd[0] + ":" + splitEnd[1] + "AM";
      } else {
        splitEnd[0] = splitEnd[0] % 12;
        if (splitEnd[0] == "0" || splitEnd[0] == "00") {
          splitEnd[0] = "12";
        }
        e = splitEnd[0] + ":" + splitEnd[1] + "PM";
      }

      const period = new Period({
        day: day,
        start: s,
        end: e,
        subject: subject,
        present: 0,
        absent: 0
      });
      period.save();

      res.redirect("/timeTable");
    });



app.post("/:day", function(req, res){
  if (req.params.day != "addClass"){
    const day = req.params.day;
    const sub = req.body.period;
    const subject = sub.split("-");
    const sub1 = subject[0];
    const sub2 = subject[1];

    Period.findOne({subject: sub2}, function(err, item){
      if (!err){
        if (sub1 === "p"){
          let present = item.present;
          present = present + 1;
          Period.updateOne({subject: sub2}, {present: present}, function(err){
              if(err){console.log(err);}
              });
        }else if (sub1 === "a"){
            let absent = item.absent;
            absent = absent + 1;
            Period.updateOne({subject: sub2}, {absent: absent}, function(err){
              if(err){console.log(err);}
            });
        }
      }
    });
    res.redirect("/" + day);
  }
});





app.listen(process.env.PORT || 3000, function(){
    console.log("Server started at port 3000");
});
