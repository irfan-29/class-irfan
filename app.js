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
  saveUninitialized: false,
  cookie: { maxAge: 1 * 60 * 60 * 1000 }   // cookie session timings in milliseconds - for 1 hrs
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.set({strictQuery: true});
mongoose.connect("mongodb+srv://admin-irfan:Irf6360944@cluster0.jo7etur.mongodb.net/newClassDB")



// Creating new Schemas

const periodSchema = new mongoose.Schema({
  day: String,
  period: Number,
  start: String,
  end: String,
  subject: String
});
const Period = mongoose.model("Period", periodSchema);

const timingSchema = new mongoose.Schema({
  period: Number,
  start: String,
  end: String,
});
const Timing = mongoose.model("Timing", timingSchema);

const attendanceSchema = new mongoose.Schema({
  subject: String,
  present: Number,
  absent: Number
});
const Attendance = mongoose.model("Attendance", attendanceSchema);

const presentSchema = new mongoose.Schema({
  subject: String,
  date: String,
  start: String,
  end: String
});
const Present = mongoose.model("Present", presentSchema);

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


// 
// MongoDB Schema and Model
const ImageSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  url: { type: String, required: true },
});

const Image = mongoose.model('Image', ImageSchema);
// 



const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  name: String,
  dob: String,
  degree: String,
  college: String,
  modifyDate: String,
  period: [periodSchema],
  timing: [timingSchema],
  attendance: [attendanceSchema],
  present: [presentSchema],
  absent: [absentSchema],
  task: [taskSchema],
  completeTask: [completeTaskSchema],
  image: ImageSchema
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
    callbackURL: "https://class-umi-apps.onrender.com/auth/google/class",   // works for the hosting url
    // callbackURL: "https://localhost:3000/auth/google/class",   // works for the local url, configure in the google
    userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));



// To fix the error raised by favicon.ico

app.use(function(req, res, next) {
  if (req.originalUrl && req.originalUrl.split("/").pop() === 'favicon.ico') {
    return res.sendStatus(204);
  }
  next();
});



app.use((req, res, next) => {
  if (req.isAuthenticated()) {
    const id = req.user.id;
    User.findOne({ _id: id }, function (err, user) {
      if (!err && user) {
        if (user.image && typeof user.image.url !== 'undefined') {
          res.locals.userImageUrl = user.image.url; // Set user image URL to res.locals
        } else {
          res.locals.userImageUrl = "images/user.png"; // Fallback image URL
        }
      }
      next();
    });
  } else {
    next();
  }
});







// login with google

app.get("/auth/google", passport.authenticate('google', {scope: ["profile"]}));
app.get("/auth/google/class", passport.authenticate('google', {failureRedirect: '/login'}),
  function(req, res){
    res.redirect("/home");
});











const admin = require('firebase-admin');

const jsonData = process.env.FIREBASE_SERVICE_ACCOUNT;
const parsedData = JSON.parse(jsonData);

// const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(parsedData),
  storageBucket: 'class-umi-apps-db.appspot.com' // Replace with your Firebase Storage bucket name
});

const bucket = admin.storage().bucket();


const multer = require('multer');
const path = require('path');
const fs = require('fs');
// const { v4: uuidv4 } = require('uuid'); // For generating unique filenames

// Ensure 'uploads' directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Upload File to Firebase Storage
const uploadFileToFirebase = async (file, userId) => {
  try {
    const fileName = `${userId}-${file.originalname}`;
    const fileUpload = bucket.file(fileName);
    const stream = fileUpload.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
      fs.createReadStream(file.path).pipe(stream);
    });

    const [url] = await fileUpload.getSignedUrl({
      action: 'read',
      expires: '03-09-2491', // Adjust the expiration date as needed
    });

    return url;
  } catch (error) {
    console.log(error.message);
    return null;
  }
};

// Multer Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });










// const multer = require('multer');
// const { google } = require('googleapis');
// const path = require('path');
// const fs = require('fs');

// // Ensure 'uploads' directory exists
// if (!fs.existsSync('uploads')) {
//   fs.mkdirSync('uploads');
// }



// const oauth2Client = new google.auth.OAuth2(
//   CLIENT_ID,
//   CLIENT_SECRET,
//   REDIRECT_URI
// );

// oauth2Client.setCredentials({ refresh_token: REFRESH_TOKEN });

// const drive = google.drive({ version: 'v3', auth: oauth2Client });

// // Upload File to Google Drive
// const uploadFile = async (file) => {
//   try {
//     const response = await drive.files.create({
//       requestBody: {
//         name: file.originalname,
//         mimeType: file.mimetype,
//       },
//       media: {
//         mimeType: file.mimetype,
//         body: fs.createReadStream(file.path),
//       },
//     });

//     await drive.permissions.create({
//       fileId: response.data.id,
//       requestBody: {
//         role: 'reader',
//         type: 'anyone',
//       },
//     });

//     const result = await drive.files.get({
//       fileId: response.data.id,
//       fields: 'webViewLink, webContentLink',
//     });

//     return result.data;
//   } catch (error) {
//     console.log(error.message);
//     return null;
//   }
// };

// // Multer Configuration
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'uploads/');
//   },
//   filename: (req, file, cb) => {
//     cb(null, `${Date.now()}-${file.originalname}`);
//   },
// });

// const upload = multer({ storage });























// to check for authentication on mentioned url, and redirect to login page if not

function requireLogin(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.redirect('/login');
  }
  next();
}



// Home page

app.get("/", function(req, res) {
  res.render("login", {keyNote: ""});
});



// login and register

app.get("/login",function(req,res){
  res.render("login", {keyNote: ""});
});

app.post("/login", function(req, res, next){
  passport.authenticate("local", function(err, user) {
    if(err){ 
      return next(err); 
    }
    if(!user){
      return res.render("login", {keyNote: "*Invalid username and password"}); 
    }
    req.logIn(user, function(err) {
      if(err){ 
        return next(err); 
      }
      return res.redirect("/home");
    });
  })(req, res, next);
});


app.get("/register",function(req,res){
  res.render("register", {keyNote: "", keyEmail: ""});
});

app.post("/register", function(req, res){
  if(req.body.password !== req.body.cpassword){
    return res.render("register", {keyNote: "*Passwords do not match", keyEmail: req.body.username});
  }
  User.register({username: req.body.username}, req.body.password, function(err, user){
    if(err){
      console.log(err);
      return res.render("register", {keyNote: "*User already registered", keyEmail: ""});
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/home");
      });
    }
  });
});




// logout

app.get('/logout', (req, res) => {
  req.logout(err => {
    if (err) {
      return res.status(500).send("Error logging out.");
    }
    req.session.destroy(err => {
      if (err) {
        return res.status(500).send("Error ending session.");
      }
      res.clearCookie('connect.sid'); // Clears the cookie
      res.redirect('/login');
    });
  });
});



// render home page after login

app.get("/home", requireLogin, function(req, res) {
  const id = req.user.id;
    User.findOne({_id: id}, function(err, user){
        if (!err){
          res.render("home", {keyName: user.name});
        }
    });
});










// User profile
app.get('/profile', requireLogin, function (req, res) {
  const id = req.user.id;
  User.findOne({ _id: id }, function (err, user) {
    if (!err && user) {
      if (user.image && typeof user.image.url !== 'undefined') {
        res.render('profile', { keyUser: user, keyImg: user.image.url });
      } else {
        res.render('profile', { keyUser: user, keyImg: "images/user.png" });
      }
    }
  });
});


const deleteFileFromFirebase = async (fileName) => {
  try {
    await bucket.file(fileName).delete();
  } catch (error) {
    console.log(`Failed to delete previous image: ${fileName}`, error.message);
  }
};

app.post('/upload', upload.single('file'), async (req, res) => {
  const id = req.user.id;

  if (req.user.image && typeof req.user.image.url !== 'undefined') {
    const oldFileName = `${id}-${req.user.image.filename}`;
    await deleteFileFromFirebase(oldFileName); // Delete the previous image
  }
  
  const fileData = await uploadFileToFirebase(req.file, id);

  const newImage = {
    filename: req.file.originalname,
    url: fileData,
  };

  User.updateOne({ _id: id }, { $set: { image: newImage } }, function (err) {
    if (err) {
      console.log(err);
    }
  });

  fs.unlinkSync(req.file.path); // Remove the file from the server

  res.redirect('/profile');
});








// User profile

// app.get("/profile", requireLogin, function(req,res){
//   const id = req.user.id;
//     User.findOne({_id: id}, function(err, user){
//         if (!err){
//           var keyImg = user.image.url;
//           keyImg=keyImg.replace("https://drive.google.com/file/d/", "https://drive.usercontent.google.com/download?id=");
//           keyImg=keyImg.replace("/view?usp=drivesdk", "&export=view&authuser=0");                                                          
          
          
//           res.render("profile", {keyUser: user, keyImg: keyImg}); 
//           // res.render("profile", {keyUser: user, keyImg: "11nC8dSrLiRU4D1WcMvgMuk8cCsmTal9Q"});
//         }
//     });
// });


// app.post('/upload', upload.single('file'), async (req, res) => {
//   const id = req.user.id;
//   const fileData = await uploadFile(req.file);

//   const newImage = new Image({
//     filename: req.file.originalname,
//     url: fileData.webViewLink,
//   });

//   // await img.save();
//   User.updateOne({_id: id}, {$set: {image: newImage}}, function(err){
//     console.log(err);
//   });

//   fs.unlinkSync(req.file.path); // Remove the file from the server

//   res.redirect("/profile");
// });



app.post("/profile", requireLogin, function(req, res){
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



app.get('/editProfile', requireLogin, function (req, res) {
  const id = req.user.id;
  User.findOne({ _id: id }, function (err, user) {
    if (!err && user) {
      if (user.image && typeof user.image.url !== 'undefined') {
        res.render('editProfile', { keyUser: user, keyImg: user.image.url });
      } else {
        res.render('editProfile', { keyUser: user, keyImg: "images/user.png" });
      }
    }
  });
});

app.post("/editProfile", requireLogin, function(req, res){
  res.redirect("/editProfile");
});

app.post("/backProfile", requireLogin, function(req,res){
  res.redirect("/profile");
});



// Tasks

app.get("/tasks", requireLogin, function(req, res){
  const id = req.user.id;
  User.findOne({_id: id}, function(err, user){
    if (!err){
      setTimeout(function () {
        res.render("tasks", {keyTask: user.task, keyCompleteTask: user.completeTask});
       }, 1000); 
    }
  });
});

app.post("/tasks", requireLogin, function(req, res) {
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

app.post("/deleteTask", requireLogin, function(req,res){
  const deleteTask = req.body.deleteTask;
  const id = req.user.id;
  User.updateOne({_id: id}, {$pull: {task: {task: deleteTask}}}, function(err, user){
    if(err){console.log(err);}
  });
  setTimeout(function () {
    res.redirect("/tasks");
   }, 1000); 
});

app.post("/deleteCompleteTask", requireLogin, function(req,res){
  const deleteCompleteTask = req.body.deleteCompleteTask;
  const id = req.user.id;
  User.updateOne({_id: id}, {$pull: {completeTask: {completeTask: deleteCompleteTask}}}, function(err, user){
    if(err){console.log(err);}
  });
  setTimeout(function () {
    res.redirect("/tasks");
   }, 1000); 
});

app.post("/completeTask", requireLogin, function(req,res){
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

app.post("/notCompleteTask", requireLogin, function(req,res){
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



// Time Table

app.get("/timeTable", requireLogin, function(req, res) {
  const weekday = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const d = new Date();
  let day = weekday[d.getDay()];
  res.redirect("/" + day);;
});

app.post("/timeTable", requireLogin, function(req, res) {
  const day = req.body.day;
  res.redirect(String(day));
});



//passing details to weekly timetable

app.get("/weeklyTimeTable", requireLogin, function(req, res) {
  const id = req.user.id;

  User.findOne({_id: id}, function(err, user){
    if (!err){
      res.render("weeklyTimeTable", {keyPeriod: user.period, keyTiming: user.timing});
    }
  });
});






// Edit classes

app.get("/editClass", requireLogin, function(req, res){
  const id = req.user.id;
  User.findOne({_id: id}, function(err, user){
    if (!err){
       res.render("editClass", {keyPeriod: user.period, keyTiming: user.timing});
    }
  });
});



// Period Timings

app.get("/timing", requireLogin, function(req,res){
  res.render("timing");
});

app.post("/timing", requireLogin, function(req, res){

  const id = req.user.id;
  const p1 = req.body.period;
  var s1 = String(req.body.start);
  var e1 = String(req.body.end);

  //To convert the 24hrs format to 12hrs format
  var splitStart = s1.split(":");
  if(splitStart[0] < 12){
    if(splitStart[0] == "0" || splitStart[0] == "00"){
        splitStart[0] = "12";
    }
    s1 = splitStart[0] + ":" + splitStart[1] + "AM";
  }else{
    splitStart[0] = splitStart[0] % 12;
    if (splitStart[0] == "0" || splitStart[0] == "00") {
      splitStart[0] = "12";
    }
    s1 = splitStart[0] + ":" + splitStart[1] + "PM";
  }

  var splitEnd = e1.split(":");
  if (splitEnd[0] < 12) {
    if (splitEnd[0] == "0" || splitEnd[0] == "00") {
      splitEnd[0] = "12";
    }
    e1 = splitEnd[0] + ":" + splitEnd[1] + "AM";
    } else {
        splitEnd[0] = splitEnd[0] % 12;
        if (splitEnd[0] == "0" || splitEnd[0] == "00") {
          splitEnd[0] = "12";
        }
        e1 = splitEnd[0] + ":" + splitEnd[1] + "PM";
    }
  User.findOne({_id: id}, function(err, user){
    if(!err){
      var i=0;
      user.timing.forEach(function(time){
        if(time.period==p1){
          i++;
        }
      });
      if(i==0){
        User.updateOne({_id: id}, {$push: {timing: {start: s1, end: e1, period: p1}}}, function(err){
          if(err){
            console.log(err);
          }
        });
      }else{
        User.updateOne({_id: id, "timing.period": p1}, {"timing.$.start": s1, "timing.$.end": e1}, function(err){
          if(err){
            console.log(err);
          }
        });
      }
    }
  });
  setTimeout(function () {
    res.redirect("/editClass");
   }, 1000);
});

app.post("/editTiming", requireLogin, function(req,res){
  res.redirect("/timing");
});

app.post("/backTiming", requireLogin, function(req,res){
  res.redirect("/editClass");
});



// Redirecting to add new Class from edit class

app.post("/day1", requireLogin, function(req, res) {
  res.render("addClass");
});



// Creating a new period

app.post("/addClass", requireLogin, function(req, res) {
  const day = _.lowerCase(req.body.day);
  const period = (req.body.period);
  const sub = req.body.subject;
  const id = req.user.id;

    const newClass = new Period({
      day: day,
      period: period,
      subject: sub
    });

    User.findOne({_id: id}, function(err, user){
      user.period.push(newClass);
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
    setTimeout(function () {
      res.redirect("/editClass");
     }, 1000); 
});



// Back in add class

app.post("/back", requireLogin, function(req,res){
  res.redirect("/editClass");
});



// Deleting period

app.post("/deleteClass", requireLogin, function(req, res){
   const deleteClass = req.body.deleteClass;
   const deletePeriod = deleteClass.split("-");
   const day = deletePeriod[0];
   const sub = deletePeriod[1];
   const period = deletePeriod[2];
   const start = deletePeriod[3];
   const end = deletePeriod[4];
   const id = req.user.id;

   User.updateOne({_id: id}, {$pull: {period: {day: day, subject: sub, period: period}}}, function(err){
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
              User.updateOne({_id: id}, {$pull: {present: {subject: sub}}}, function(err){
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
   setTimeout(function () {
    res.redirect("/editClass");
   }, 1000); 
});



// Delete All Periods

app.post("/deleteAllClass", requireLogin, function(req, res){
  const id = req.user.id;
  User.findOneAndUpdate({_id: id}, {$set: {period: [], attendance: [], absent: [], present: []}}, function(err){
    if(!err){
      setTimeout(function () {
        res.redirect("/editClass");
       }, 1000); 
    }
  });
});



// Passing attendance, present & absent details with respective subject to attendance page

app.get("/attendance", requireLogin, function(req, res){
  const id = req.user.id;
    User.findOne({_id: id}, function(err, user){
        if (!err){
          res.render("attendance", {keyAttendance: user.attendance, keyDate: user.modifyDate, keyPresent: user.present, keyAbsent: user.absent});
        }
    });
});



// Overall Attendance

app.post("/overallAttendance", requireLogin, function(req, res){
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

app.post("/backAttendance", requireLogin, function(req,res){
  res.redirect("/attendance");
});










// Passing periods to respective day of timetable

app.get("/:day", requireLogin, function(req, res){
  const id = req.user.id;
  const day = req.params.day;

  User.findOne({_id: id}, function(err, user){
    if (!err){
      res.render(day, {keyPeriod: user.period, keyTiming: user.timing, day: day});
    }
  });
});



// Attendance marking as Present or Absent

app.post("/:day", requireLogin, function(req, res){
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
            const newPresent = new Present({
              subject: sub2,
              date: d,
              start: start,
              end: end
            });
            user.present.push(newPresent);
            user.save();
          }
          else if(sub1 === "a"){
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
  User.updateOne({_id: id}, {$set: {modifyDate: d}}, function(err){
    if(err){
      console.log(err);
    }
  });
  setTimeout(function () {
    res.redirect("/" + day);
   }, 1000);  
});






app.listen(process.env.PORT || 3000, function(){
  console.log("Server started at port 3000");
});
