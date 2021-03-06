const express = require('express');
const app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const xml2js = require('xml2js');
const fs = require("fs");

//begin listening at port 8089
http.listen(8089);
console.log("listening at port 8089......");

//student information
let studentProfile = [];
//the message of severity 1
let allFinalMsg = [];

//teacher information
let teacherID = null;
let teacherSocket = null;
//Theoretically step number is based on tutorial, but now it is hard coding
let stepNumber = 5;


io.on('connection', function (socket)
{

  //when a teacher login
  socket.on('teacherLogin',function () {
    console.log("teacher connected. ID: "+socket.id);
    teacherID = socket.id;
    teacherSocket = socket;
  });

  //when a student login
  socket.on('studentLogin',function(){
    //initialize
    console.log("student connected. ID: "+socket.id);
    let student = {};
    student.id = socket.id;
    student.socket = socket;
    student.time = new Date().getTime();
    student.reviewTimes = 0;
    student.sort = [];
    student.errorRecord = [];
    student.log = [];
    studentProfile.push(student);
  });

  //when disconnect
  socket.on('disconnect',function () {


    //if teacher disconnected
    if(socket.id === teacherID){
      console.log("teacher disconnected. ID: "+socket.id);
      teacherSocket = null;
      teacherID = null;
    }

    //if student disconnected
    else{
      console.log("student disconnected. ID: "+socket.id);
      studentProfile.splice(studentProfile.findIndex((element) => (element.id === socket.id)),1);
    }
  });


  //when student sends his sorting
  socket.on('sort',function(sortList)
  {
    console.log('Receive the sorting of'+socket.id + ": "+sortList);
    studentProfile[studentProfile.findIndex((element) => (element.id === socket.id))].sort = sortList;
  });

  //add severity
  socket.on('photo', function (img,behavior,severity)
  {
    console.log('receive photo');
    let fromUser = socket.id;
    //when finished table is 1, the state is "submitted" but not "approved"
    studentProfile[studentProfile.findIndex((element) => (element.id === socket.id))].errorRecord[behavior] = 0;
    studentProfile[studentProfile.findIndex((element) => (element.id === socket.id))].time = new Date().getTime();

    //target is influenced by reviewTimes, time and random factor
    let maxWeight = 0;
    let toUser = null;
    for(let i = 0; i < studentProfile.length; i += 1){
      let user = studentProfile[i].id;
      if(user !== fromUser){
        console.log("user now: "+user);
        let timeNow = new Date().getTime();
        let timeDif = timeNow - studentProfile[i].time;
        let timeWeight = ((timeDif > 3000)? 0:timeDif/3000);
        console.log(timeWeight+" --timeWeight");
        let randomWeight = Math.random();
        console.log(randomWeight + " --randomWeight");
        let reviewTimes = studentProfile[i].reviewTimes;
        let reviewWeight = (stepNumber - reviewTimes)/stepNumber;
        console.log(reviewWeight + " --reviewWeight");
        let weightAll = 0.6*timeWeight + 0.3*reviewWeight + 0.1*randomWeight;
        console.log(weightAll+"___weightAll");
        console.log(maxWeight);
        if(weightAll > maxWeight){
          maxWeight = weightAll;
          toUser = user;
        }
        console.log(toUser);
      }
    }
    
    studentProfile[studentProfile.findIndex((element) => (element.id === toUser))].reviewTimes += 1;
    let target = studentProfile[studentProfile.findIndex((element) => (element.id === toUser))].socket;
    console.log("toUser: "+toUser);
    if(target)
    {
      target.emit("photoToJudge",img,behavior,fromUser,severity);
    }
  });

  socket.on('review', function(review,img,behavior,toUser,text,severity)
  {
    console.log("receive review: to" + toUser);
    //if miss the review,find another reviewer
    if(review === null){
      console.log("no reply..send to next");
      studentProfile[studentProfile.findIndex((element) => (element.id === socket.id))].reviewTimes -= 1;
      //target is influenced by reviewTimes, time and random factor
      let maxWeight = 0;
      let toAnotherUser = null;
      for(let i = 0; i < studentProfile.length; i += 1){
        let user = studentProfile[i].id;
        if(user !== toUser){
          console.log("user now: "+user);
          let timeNow = new Date().getTime();
          let timeDif = timeNow - studentProfile[i].time;
          let timeWeight = ((timeDif > 3000)? 0:timeDif/3000);
          console.log(timeWeight+" --timeWeight");
          let randomWeight = Math.random();
          console.log(randomWeight + " --randomWeight");
          let reviewTimes = studentProfile[i].reviewTimes;
          let reviewWeight = (stepNumber - reviewTimes)/stepNumber;
          console.log(reviewWeight + " --reviewWeight");
          let weightAll = 0.6*timeWeight + 0.3*reviewWeight + 0.1*randomWeight;
          console.log(weightAll+"___weightAll");
          console.log(maxWeight);
          if(weightAll > maxWeight){
            maxWeight = weightAll;
            toAnotherUser = user;
          }
          console.log(toAnotherUser);
        }
      }
      let target = studentProfile[studentProfile.findIndex((element) => (element.id === toAnotherUser))].socket;
      studentProfile[studentProfile.findIndex((element) => (element.id === toAnotherUser))].reviewTimes += 1;
      target.emit("photoToJudge",img,behavior,toUser,severity);
    }

    //if review is positive
    if(review === 1){
      //move towards behavior developed
      studentProfile[studentProfile.findIndex((element) => (element.id === toUser))].errorRecord[behavior] -= 1;
      //record it
      studentProfile[studentProfile.findIndex((element) => (element.id === toUser))].log.push({
        behavior:behavior,
        state:'success',
        time:new Date().getTime()
      });
    }
    //else if review is negative
    else if(review === 0){
      //when facing an error, student should get three positive reviews continuously to develop his behavior
      studentProfile[studentProfile.findIndex((element) => (element.id === toUser))].errorRecord[behavior] = 1;
      studentProfile[studentProfile.findIndex((element) => (element.id === toUser))].log.push({
        behavior:behavior,
        state:'failure',
        time:new Date().getTime()
      });
    }

    //if severity is 1, store the review instead of sending it
    if(severity === 1){
      let finalMsg = {};
      finalMsg.toUser = toUser;
      finalMsg.status = review;
      finalMsg.behavior = behavior;
      finalMsg.text = text;
      allFinalMsg.push(finalMsg);
    }
    else{
      let target = studentProfile[studentProfile.findIndex((element) => (element.id === toUser))].socket;
      target.emit("reviewResult",1,behavior,text);
    }

    //If the behavior is formed, tell the student
    //There is still a 30 percent chance to check the answer
    if (studentProfile[studentProfile.findIndex((element) => (element.id === toUser))].errorRecord[behavior] === -2){
      let target = studentProfile[studentProfile.findIndex((element) => (element.id === toUser))].socket;
      target.emit("behaviorDeveloped",behavior);
    }
  });

  //when a student finished his circuit, he receives the reviews of severity 1
  socket.on('finished', function () {
    let tmpId = socket.id;
    let allMsg = [];
    for(let i = 0 ; i < allFinalMsg.length; i++){
      if(allFinalMsg[i].toUser === tmpId){
        allMsg.push(allFinalMsg[i]);
      }
    }
    let target = studentProfile[studentProfile.findIndex((element) => (element.id === tmpId))].socket;
    target.emit('allMsgLeft',allMsg);
  });

  //a student tries to get his personal log
  socket.on('getLog',function () {
    let tmpId = socket.id;
    let target = studentProfile[studentProfile.findIndex((element) => (element.id === tmpId))].socket;
    let log = studentProfile[studentProfile.findIndex((element) => (element.id === tmpId))].log;
    target.emit('allMsgLeft',log);
  });

  // a student wants to get review from teacher
  socket.on('photoToTeacher',function(img,behavior,severity){
    let target = teacherSocket;
    target.emit('photoToJudgeByTeacher',img,behavior,socket.id,severity);
  });

  // teacher sends back review
  socket.on('teacherReview',function (review,img,behavior,toUser,text,severity) {
    let target = studentProfile[studentProfile.findIndex((element) => (element.id === toUser))].socket;

    //if review is positive
    if(review === 1){
      //move towards behavior developed
      studentProfile[studentProfile.findIndex((element) => (element.id === toUser))].errorRecord[behavior] -= 1;
      //record it
      studentProfile[studentProfile.findIndex((element) => (element.id === toUser))].log.push({
        behavior:behavior,
        state:'success',
        time:new Date().getTime()
      });
    }
    //else if review is negative
    else if(review === 0){
      //when facing an error, student should get three positive reviews continuously to develop his behavior
      studentProfile[studentProfile.findIndex((element) => (element.id === toUser))].errorRecord[behavior] = 1;
      studentProfile[studentProfile.findIndex((element) => (element.id === toUser))].log.push({
        behavior:behavior,
        state:'failure',
        time:new Date().getTime()
      });
    }

    //if severity is 1, store the review instead of sending it
    if(severity === 1){
      let finalMsg = {};
      finalMsg.toUser = toUser;
      finalMsg.status = review;
      finalMsg.behavior = behavior;
      finalMsg.text = text;
      allFinalMsg.push(finalMsg);
    }
    else{
      let target = studentProfile[studentProfile.findIndex((element) => (element.id === toUser))].socket;
      target.emit("reviewResult",1,behavior,text);
    }

    //If the behavior is formed, tell the student
    //There is still a 30 percent chance to check the answer
    if (studentProfile[studentProfile.findIndex((element) => (element.id === toUser))].errorRecord[behavior] === -2){
      let target = studentProfile[studentProfile.findIndex((element) => (element.id === toUser))].socket;
      target.emit("behaviorDeveloped",behavior);
    }
  });

  //reminder
  socket.on('reminder',function (studentId,text) {
    let target = studentProfile[studentProfile.findIndex((element) => (element.id === studentId))].socket;
    target.emit("reminderToStudent",text);
  });

  //praise
  socket.on('praise',function (studentId,text) {
    let target = studentProfile[studentProfile.findIndex((element) => (element.id === studentId))].socket;
    target.emit("praiseToStudent",text);
  });

});
