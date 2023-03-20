require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
const _ = require("lodash");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
  secret:"Our little secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.set({strictQuery: true});
mongoose.connect("mongodb+srv://admin-irfan:Irf6360944@cluster0.jo7etur.mongodb.net/newClassDB")




// Creating new Schemas

const periodSchema = new mongoose.Schema({
  day: String,
  start: String,
  end: String,
  subject: String
});
const Period = mongoose.model("Period", periodSchema);

const attendanceSchema = new mongoose.Schema({
  subject: String,
  present: Number,
  absent: Number
});
const Attendance = mongoose.model("Attendance", attendanceSchema);

const absentSchema = new mongoose.Schema({
  subject: String,
  date: String,
  start: String,
  end: String
});
const Absent = mongoose.model("Absent", absentSchema);

const taskSchema = new mongoose.Schema({
  task: String
});
const Task = mongoose.model("Task",taskSchema);

const completeTaskSchema = new mongoose.Schema({
  completeTask: String
});
const CompleteTask = mongoose.model("CompleteTask",completeTaskSchema);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  name: String,
  dob: String,
  degree: String,
  college: String,
  period: [periodSchema],
  attendance: [attendanceSchema],
  absent: [absentSchema],
  task: [taskSchema],
  completeTask: [completeTaskSchema]
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done){
  done(null, user.id);
});
passport.deserializeUser(function(id, done){
User.findById(id, function(err, user){
  done(err, user);
});
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://class-umi-apps.onrender.com/auth/google/class",
    userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

// To set the error raised by favicon.ico

app.use(function(req, res, next) {
  if (req.originalUrl && req.originalUrl.split("/").pop() === 'favicon.ico') {
    return res.sendStatus(204);
  }
  next();
});



// Home page

app.get("/", function(req, res) {
  res.render("login");
});


app.get("/auth/google", passport.authenticate('google', {scope: ["profile"]}));
app.get("/auth/google/class", passport.authenticate('google', {failureRedirect: '/login'}),
  function(req, res){
    res.redirect("/home");
});

app.get("/login",function(req,res){
  res.render("login");
});

app.get("/register",function(req,res){
  res.render("register");
});

app.get("/profile",function(req,res){
  const id = req.user.id;
    User.findOne({_id: id}, function(err, user){
        if (!err){
          res.render("profile", {keyUser: user});
        }
    });
});



app.post("/register", function(req, res){

  User.register({username: req.body.username}, req.body.password, function(err, user){
    if(err){
      console.log(err);
      res.redirect("/register");
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/home");
      });
    }
  });
});

app.post("/login", function(req, res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/home");
      });
    }
  });
});

app.post("/profile", function(req, res){
  const id = req.user.id;
  const name = req.body.name;
  const dob =req.body.dob;
  const degree =req.body.degree;
  const college =req.body.college;

  User.updateOne({_id: id}, {$set: {name: name, dob: dob, degree: degree, college: college}}, function(err){
    if(err){
      console.log(err);
    }
  });
  res.redirect("/profile");
});

app.post("/editProfile", function(req, res){
  res.redirect("/editProfile");
});

app.post("/backProfile", function(req,res){
  res.redirect("/profile");
});

app.post("/logout", function(req, res){
  res.redirect("/");
})

app.get("/home", function(req, res) {
  const id = req.user.id;
    User.findOne({_id: id}, function(err, user){
        if (!err){
          res.render("home", {keyName: user.name});
        }
    });
});

// Time Table

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




// Passing attendance & absent details with respective subject

app.get("/attendance", function(req, res){
  const id = req.user.id;
    User.findOne({_id: id}, function(err, user){
        if (!err){
          res.render("attendance", {keyAttendance: user.attendance, keyAbsent: user.absent});
        }
    });
});



// Overall Attendance

app.post("/overallAttendance", function(req, res){
  var oPresent = 0;
  var oAbsent = 0;
  const id = req.user.id;

  User.findOne({_id: id}, function(err, user){
    if(!err){
      user.attendance.forEach(function(period){
        oPresent += period.present;
        oAbsent += period.absent;
      });
      res.render("overallAttendance", {keyPresent: oPresent, keyAbsent: oAbsent});
    }
  });
});



// Back in Overall Attendance

app.post("/backAttendance", function(req,res){
  res.redirect("/attendance");
});



// Tasks

app.post("/tasks", function(req, res) {
  const task = req.body.newTask;
  const id = req.user.id;
  const newTask = new Task({
    task: task
  });

  User.findOne({_id: id}, function(err, user){
    user.task.push(newTask);
    user.save();
  });
  res.redirect("/tasks");
});

app.get("/tasks", function(req, res){
  const id = req.user.id;
  User.findOne({_id: id}, function(err, user){
    if (!err){
      res.render("tasks", {keyTask: user.task, keyCompleteTask: user.completeTask});
    }
  });
});

app.post("/deleteTask", function(req,res){
  const deleteTask = req.body.deleteTask;
  const id = req.user.id;
  User.updateOne({_id: id}, {$pull: {task: {task: deleteTask}}}, function(err, user){
    if(err){console.log(err);}
  });
  res.redirect("/tasks");
});

app.post("/deleteCompleteTask", function(req,res){
  const deleteCompleteTask = req.body.deleteCompleteTask;
  const id = req.user.id;
  User.updateOne({_id: id}, {$pull: {completeTask: {completeTask: deleteCompleteTask}}}, function(err, user){
    if(err){console.log(err);}
  });
  res.redirect("/tasks");
});

app.post("/completeTask", function(req,res){
  const completeTask = req.body.checkbox;
  const id = req.user.id;
  User.updateOne({_id: id}, {$pull: {task: {task: completeTask}}}, function(err, user){
    if(err){console.log(err);}
  });
  const newCompleteTask = new CompleteTask({
    completeTask: completeTask
  });
  User.findOne({_id: id}, function(err, user){
    user.completeTask.push(newCompleteTask);
    user.save();
  });
  res.redirect("/tasks");
});

app.post("/notCompleteTask", function(req,res){
  const notCompleteTask = req.body.checkbox2;
  const id = req.user.id;
  User.updateOne({_id: id}, {$pull: {completeTask: {completeTask: notCompleteTask}}}, function(err, user){
    if(err){console.log(err);}
  });
  const newNotCompleteTask = new Task({
    task: notCompleteTask
  });
  User.findOne({_id: id}, function(err, user){
    user.task.push(newNotCompleteTask);
    user.save();
  });
  res.redirect("/tasks");
});



// Passing periods to respective day of timtable

app.get("/:day", function(req, res){
    const id = req.user.id;
    const day = req.params.day;

    // User.find({_id: id, period: {$elemMatch: {day: day}}});

    User.findOne({_id: id}, function(err, user){
        if (!err){
              res.render(day, {keyPeriod: user.period, day: day});
            }
          });
       // }
    // });

});



// Redirecting to add new Class & delete Class page

app.post("/day1", function(req, res) {
  const id = req.user.id;
  User.findOne({_id: id}, function(err, user){
    if (!err){
       res.render("deleteClass", {keyPeriod: user.period});
    }
  });
});

app.post("/day2", function(req, res) {
  res.render("addClass");
});



// Deleting period

app.post("/deleteClass", function(req, res){
   const deleteClass = req.body.deleteClass;
   const deletePeriod = deleteClass.split("-");
   const day = deletePeriod[0];
   const sub = deletePeriod[1];
   const start = deletePeriod[2];
   const end = deletePeriod[3];
   const id = req.user.id;

   User.updateOne({_id: id}, {$pull: {period: {day: day, subject: sub, start: start, end: end}}}, function(err){
     if(!err){

       User.findOne({_id: id}, function(err, user){
         if(!err){
           var i = 0;
           user.period.forEach(function(period){
             if(period.subject==sub){
               i++;
             }
           });
           if(i==0){
              User.updateOne({_id: id}, {$pull: {attendance: {subject: sub}}}, function(err){
                if(err){console.log(err);}
              });
              User.updateOne({_id: id}, {$pull: {absent: {subject: sub}}}, function(err){
                if(err){console.log(err);}
              });
            }
         }
       });
     }
   });

   res.redirect("/deleteClass");
});



// Delete All Periods

app.post("/deleteAllClass", function(req, res){
  const id = req.user.id;
  User.findOneAndUpdate({_id: id}, {$set: {period: [], attendance: [], absent: []}}, function(err){
    if(!err){
      res.redirect("/deleteClass");
    }
  });
});



// Creating a new period

app.post("/addClass", function(req, res) {
  const day = _.lowerCase(req.body.day);
  var s = String(req.body.start);
  var e = String(req.body.end);
  const sub = req.body.subject;
  const id = req.user.id;

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
      subject: sub
    });
    // period.save();



    User.findOne({_id: id}, function(err, user){
      user.period.push(period);
      user.save();
    });

    User.findOne({_id: id}, function(err, user){
      if(!err){
        var i = 0;
        user.attendance.forEach(function(period){
          if(period.subject===sub){
            i++;
          }
        });
        if(i==0){
          const attendance = new Attendance({
            subject: sub,
            present: 0,
            absent: 0
          });

          user.attendance.push(attendance);
          user.save();

        }
      }
    });
    res.redirect("/timeTable");
});



// Back in delete class and add class

app.post("/back", function(req,res){
  res.redirect("/timeTable");
});



// Attendance marking as Present or Absent

app.post("/:day", function(req, res){
    const day = req.params.day;
    const sub = req.body.period;
    const subject = sub.split("-");
    const sub1 = subject[0];
    const sub2 = subject[1];
    const start = subject[2];
    const end = subject[3];
    const d = new Date().toLocaleDateString("fr-FR");
    const id = req.user.id;


    User.findOne({_id: id}, function(err, user){
      if(!err){
        // console.log(user.attendance);
        user.attendance.forEach(function(period){
          if(period.subject === sub2){
            if(sub1 === "p"){
              let present = period.present;
              present = present + 1;
              User.updateOne({_id: id, "attendance.subject": sub2}, {$set: {"attendance.$.present": present}}, function(err, user){
                if(err){
                  console.log(err);
                }
              });
            }else if(sub1 === "a"){
              let absent = period.absent;
              absent = absent + 1;
              User.updateOne({_id: id, "attendance.subject": sub2}, {$set: {"attendance.$.absent": absent}}, function(err, user){
                if(err){
                  console.log(err);
                }
              });

              const newAbsent = new Absent({
                subject: sub2,
                date: d,
                start: start,
                end: end
              });
              user.absent.push(newAbsent);
              user.save();
            }
          }
        });
      }
    });


    // Attendance.findOne({subject: sub2}, function(err, item){
    //   if (!err){
    //     if (sub1 === "p"){
    //       let present = item.present;
    //       present = present + 1;
    //       Attendance.updateOne({subject: sub2}, {present: present}, function(err){
    //         if(err){console.log(err);}
    //       });
    //     }else if (sub1 === "a"){
    //       let absent = item.absent;
    //       absent = absent + 1;
    //       Attendance.updateOne({subject: sub2}, {absent: absent}, function(err){
    //         if(err){console.log(err);}
    //       });
    //       const newAbsent = new Absent({
    //         subject: sub2,
    //         date: d,
    //         start: start,
    //         end: end
    //       });
    //       newAbsent.save();
    //     }
    //   }
    // });

    res.redirect("/" + day);

});



app.listen(process.env.PORT || 3000, function(){
  console.log("Server started at port 3000");
});
