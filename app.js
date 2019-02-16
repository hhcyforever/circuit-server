const express = require('express');
const app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
const xml2js = require('xml2js');
const fs = require("fs");

//begin listening
http.listen(8089);
console.log("listening at port 8089......");

let arrAllSocket = []; //map between socketid to socket
let userFinishedTable = []; //student <-> behaviours finished by him
let userSortTable = []; //student and his behaviour sort
let finishedStudent = []; //behaviours <-> student finishing it
let studentLog = []; //log of student and his behaviours
let reviewRecord = []; //student and times of review he makes
let teacherName,teacherSocket; //teacher information
let timeTable = [];
let tutorialInf = [];



//init tutorial
var stepNumber = 10;
var parser = new xml2js.Parser();
// fs.readFile("C:/america_2019/fritzing/fritzing-app/fzzs/Leds/Leds.fz",'utf-8',function (err,data) {
//   if (err) {console.log("error reading file"); throw err;}
//   parser.parseString(data,function (err,res) {
//     if(err) throw err;
//     var instances = res.module.instances[0].instance;
//     for(var i = 0; i < instances.length ; i += 1){
//       if(instances.$.modelIdRef === "Arduino Nano3(fix)"){
//
//       }
//       else if(instances.$.modelIdRef === "5mmColorLEDModuleID"){
//
//       }
//       else if(instances.$.modelIdRef === "WireModuleID"){
//
//       }
//       else if(instances.$.modelIdRef === "lijaeag5654yx6narfd346gnn-ResistorModuleID"){
//
//       }
//     }
//   })
// });





//handle message
io.on('connection', function (socket)
{
  //initial
  console.log(socket.id+" new connection");
  let userName = socket.id;
  arrAllSocket.push(socket);
  let userData = [];
  userFinishedTable[userName] = userData;
  timeTable[userName] = new Date().getTime();
  //when a teacher login
  socket.on('teacherLogin',function (userTeacher) {
    teacherName = userTeacher;
    teacherSocket = socket;
    arrAllSocket.push(teacherSocket);
    for(var i = 0; i < stepNumber; i++){
      var finishedList = [];
      finishedList.push(teacherName);
      finishedStudent.push(finishedList);
    }
  });

  socket.on('disconnect',function () {
    console.log(socket.id + "is disconnect");
    delete timeTable[socket.id];
    delete userFinishedTable[socket.id];
    arrAllSocket.splice(arrAllSocket.findIndex((element) => (element.id === socket.id)),1);
    for(socket in arrAllSocket){
      console.log(arrAllSocket[socket].id);
    }
  });

  //get a map between user and user's socket
  socket.on('login', function (userName)
  {

  });

  //when student sends his sorts
  //to be judged
  socket.on('sort',function(userName,sortList)
  {
    userSortTable[userName] = sortList;
  });



  socket.on('photo', function (img,behaviour)
  {
    console.log('receive photo');
    let fromUser = socket.id;
    //when finished table is 1, the state is "submitted" but not "approved"
    userFinishedTable[fromUser][behaviour] = 1;
    timeTable[fromUser] = new Date().getTime();
    reviewRecord[fromUser] = 0;
    //target is the latest finished student

    let weightTable = [];
    let maxWeight = 0;
    let toUser;
    for(let user in timeTable){
      if(user !== fromUser){
        console.log("user now:"+user);
        let timeNow = new Date().getTime();
        let timeWeight = (timeNow - timeTable[user]) > 3000? 0: 1;
        console.log(timeWeight+"  timeWeight");
        let randomWeight = Math.random();
        console.log(randomWeight + "randomWeight");
        console.log(stepNumber);
        let reviewWeight = 0;
        console.log(reviewWeight + "reviewWeight");
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
    reviewRecord[toUser] += 1;
    let target = arrAllSocket[arrAllSocket.findIndex((element) => (element.id === toUser))];
    console.log(toUser);
    if(target)
    {
      target.emit("photoToJudge",img,behaviour,fromUser);
    }
  });

  socket.on('review', function(review,img,behaviour,toUser)
  {
    console.log("receive review: to" + toUser);
    //if miss the review,find another reviewer
    if(review === null){
      reviewRecord[socket.id] -= 1;
      let maxWeight = 0;
      let toAnotherUser;
      for(let user in timeTable){
        if(user !== toUser){
          let timeNow = new Date().getTime();
          let timeWeight = (timeNow - timeTable[user]) > 3000? 0: 1;
          let randomWeight = Math.random();
          let reviewWeight = (stepNumber - reviewRecord[user]/stepNumber);
          let weightAll = 0.5*timeWeight + 0.3*reviewWeight + 0.1*randomWeight;
          if(weightAll > maxWeight){
            maxWeight = weightAll;
            toAnotherUser = user;
          }
        }
      }
      let target = arrAllSocket[arrAllSocket.findIndex((element) => (element.id === toAnotherUser))];
      target.emit("photoToJudge",img,behaviour,toUser );
    }
    //if review is positive
    if(review === 1){
      let target = arrAllSocket[arrAllSocket.findIndex((element) => (element.id === toUser))];
      //finishedStudent[behaviour].push(toUser);
      //userFinishedTable[toUser][behaviour] = 2;
      target.emit("reviewResult",1,behaviour);
    }
    //if review is negative
    else{
      let target = arrAllSocket[arrAllSocket.findIndex((element) => (element.id === toUser))];
      target.emit("reviewResult",0,behaviour);
    }
  });

});



// function loadTutorial(){
//   var filename = "C:/america_2019/fritzing/fritzing-app/fzzs/Leds/Leds.fz";
//   TiXmlDocument doc;
//   if(!doc.LoadFile(filename)){
//     cout << "load error" << endl;
//
//   }
//   TiXmlElement* root = doc.RootElement();
//   if( root == NULL){
//     cout << "root error" << endl;
//     doc.Clear();
//   }
//   TiXmlElement* instances = root->FirstChildElement("instances");
//
//   for (TiXmlElement* elem = instances->FirstChildElement("instance"); elem != NULL; elem = elem->NextSiblingElement("instance")){
//     const char* module = elem->Attribute("moduleIdRef");
//     cout << module <<endl;
//     //arduino
// //        string big_corner = "";
// //        string small_corner = "";
//     if(strcmp(module,"Arduino Nano3(fix)") == 0){
//       simple_item item;
//       item.flag = 0;
//       item.type = "Arduino Nano3(fix)";
//       item.id =  elem->Attribute("modelIndex");
//       TiXmlElement* breadboard_views = elem->FirstChildElement("views")->FirstChildElement("breadboardView");
//       TiXmlElement* connectors = breadboard_views->FirstChildElement("connectors");
//       //cout << breadboard_views->Attribute("layer")<< endl;
//       for(TiXmlElement* connector = connectors->FirstChildElement("connector"); connector != NULL; connector = connector->NextSiblingElement("connector")){
//         if(strcmp(connector->Attribute("connectorId"),"connector31") == 0){
//           TiXmlElement* connect = connector->FirstChildElement("connects")->FirstChildElement("connect");
//           const char* connectId = connect->Attribute("connectorId");
//           string connectIdStr = connectId;
//           item.end1 = connectIdStr;
//         }
//         if(strcmp(connector->Attribute("connectorId"),"connector30") == 0){
//           TiXmlElement* connect = connector->FirstChildElement("connects")->FirstChildElement("connect");
//           const char* connectId = connect->Attribute("connectorId");
//           string connectIdStr = connectId;
//           item.end0 = connectIdStr;
//         }
//       }
//       if(item.end0 != "" && item.end1 != "")itemsStruct.push_back(item);
//     }
//
//     else if(strcmp(module,"WireModuleID") == 0){
//       TiXmlElement* breadboard_views = elem->FirstChildElement("views")->FirstChildElement("breadboardView");
//       if(breadboard_views != NULL){
//         simple_item item;
//         item.flag = 0;
//         item.type = "wire";
//         item.id =  elem->Attribute("modelIndex");
//         TiXmlElement* connectors = breadboard_views->FirstChildElement("connectors");
//
//         for(TiXmlElement* connector = connectors->FirstChildElement("connector"); connector != NULL; connector = connector->NextSiblingElement("connector")){
//           if(strcmp(connector->Attribute("connectorId"),"connector1") == 0){
//             TiXmlElement* connect = connector->FirstChildElement("connects")->FirstChildElement("connect");
//             for(;connect != NULL; connect = connect->NextSiblingElement("connect")){
//               if(strcmp(connect->Attribute("layer"),"breadboardbreadboard") == 0)
//               {
//                 const char* connectId = connect->Attribute("connectorId");
//                 string connectIdStr = connectId;
//                 item.end1 = connectIdStr;
//               }
//               else if(strcmp(connect->Attribute("layer"),"breadboardWire") == 0)
//               {
//                 const char* connectId = connect->Attribute("connectorId");
//                 string connectIdStr = connectId;
//                 const char* modelId = connect->Attribute("modelIndex");
//                 string modelIdStr = modelId;
//                 item.end1 = connectIdStr+"#"+modelIdStr;
//               }
//             }
//           }
//
//           if(strcmp(connector->Attribute("connectorId"),"connector0") == 0){
//             TiXmlElement* connect = connector->FirstChildElement("connects")->FirstChildElement("connect");
//             for(;connect != NULL; connect = connect->NextSiblingElement("connect")){
//               if(strcmp(connect->Attribute("layer"),"breadboardbreadboard") == 0)
//               {
//                 const char* connectId = connect->Attribute("connectorId");
//                 string connectIdStr = connectId;
//                 item.end0 = connectIdStr;
//               }
//               else if(strcmp(connect->Attribute("layer"),"breadboardWire") == 0)
//               {
//                 const char* connectId = connect->Attribute("connectorId");
//                 string connectIdStr = connectId;
//                 const char* modelId = connect->Attribute("modelIndex");
//                 string modelIdStr = modelId;
//                 item.end0 = connectIdStr+"#"+modelIdStr;
//               }
//             }
//           }
//
//         }
//         if(item.end0 != "" && item.end1 != "")itemsStruct.push_back(item);
//       }
//
//     }
//
//     else if(strcmp(module,"lijaeag5654yx6narfd346gnn-ResistorModuleID") == 0){
//       TiXmlElement* breadboard_views = elem->FirstChildElement("views")->FirstChildElement("breadboardView");
//       if(breadboard_views != NULL){
//         simple_item item;
//         item.flag = 0;
//         item.type = "resistor";
//         item.id =  elem->Attribute("modelIndex");
//         TiXmlElement* connectors = breadboard_views->FirstChildElement("connectors");
//
//         for(TiXmlElement* connector = connectors->FirstChildElement("connector"); connector != NULL; connector = connector->NextSiblingElement("connector")){
//           if(strcmp(connector->Attribute("connectorId"),"connector1") == 0){
//             TiXmlElement* connect = connector->FirstChildElement("connects")->FirstChildElement("connect");
//             for(;connect != NULL; connect = connect->NextSiblingElement("connect")){
//               if(strcmp(connect->Attribute("layer"),"breadboardbreadboard") == 0)
//               {
//                 const char* connectId = connect->Attribute("connectorId");
//                 string connectIdStr = connectId;
//                 item.end1 = connectIdStr;
//               }
//             }
//           }
//
//           if(strcmp(connector->Attribute("connectorId"),"connector0") == 0){
//             TiXmlElement* connect = connector->FirstChildElement("connects")->FirstChildElement("connect");
//             for(;connect != NULL; connect = connect->NextSiblingElement("connect")){
//               if(strcmp(connect->Attribute("layer"),"breadboardbreadboard") == 0)
//               {
//                 const char* connectId = connect->Attribute("connectorId");
//                 string connectIdStr = connectId;
//                 item.end0 = connectIdStr;
//               }
//             }
//           }
//
//         }
//         if(item.end0 != "" && item.end1 != "") itemsStruct.push_back(item);
//       }
//     }
//     else if(strcmp(module,"5mmColorLEDModuleID") == 0){
//       TiXmlElement* breadboard_views = elem->FirstChildElement("views")->FirstChildElement("breadboardView");
//       if(breadboard_views != NULL){
//         simple_item item;
//         item.flag = 0;
//         item.type = "led";
//         item.id =  elem->Attribute("modelIndex");
//         TiXmlElement* connectors = breadboard_views->FirstChildElement("connectors");
//
//         for(TiXmlElement* connector = connectors->FirstChildElement("connector"); connector != NULL; connector = connector->NextSiblingElement("connector")){
//           if(strcmp(connector->Attribute("connectorId"),"connector1") == 0){
//             TiXmlElement* connect = connector->FirstChildElement("connects")->FirstChildElement("connect");
//             for(;connect != NULL; connect = connect->NextSiblingElement("connect")){
//               if(strcmp(connect->Attribute("layer"),"breadboardbreadboard") == 0)
//               {
//                 const char* connectId = connect->Attribute("connectorId");
//                 string connectIdStr = connectId;
//                 item.end1 = connectIdStr;
//               }
//             }
//           }
//
//           if(strcmp(connector->Attribute("connectorId"),"connector0") == 0){
//             TiXmlElement* connect = connector->FirstChildElement("connects")->FirstChildElement("connect");
//             for(;connect != NULL; connect = connect->NextSiblingElement("connect")){
//               if(strcmp(connect->Attribute("layer"),"breadboardbreadboard") == 0)
//               {
//                 const char* connectId = connect->Attribute("connectorId");
//                 string connectIdStr = connectId;
//                 item.end0 = connectIdStr;
//               }
//             }
//           }
//
//         }
//         if(item.end0 != "" && item.end1 != "")itemsStruct.push_back(item);
//       }
//     }
//   }
//   for(int i = 0; i < itemsStruct.size(); i++){
//     if(itemsStruct[i].end1.compare("pin") < 0){
//       if(otherEnd(itemsStruct[i].end1,(itemsStruct[i].end1.compare("connector1") > 0)) == "")
//         itemsStruct[i].flag = 1;
//     }
//     if(itemsStruct[i].end0.compare("pin") < 0){
//       if(otherEnd(itemsStruct[i].end0,(itemsStruct[i].end0.compare("connector1") > 0)) == "")
//         itemsStruct[i].flag = 1;
//     }
//   }
//   for(vector<simple_item>::iterator it = itemsStruct.begin(); it != itemsStruct.end();){
//     if((*it).flag == 1){
//       it = itemsStruct.erase(it);
//     }
//   else it++;
//   }
// }
//
// string MainWindow::otherEnd(const string &a ,int flg){
//   vector<string> v;
//   boost::split( v, a, boost::is_any_of("#"));
//   if(flg == 0){
//     int find = 0;
//     for(int i = 0; i < itemsStruct.size();i++){
//
//       if(itemsStruct[i].id == v[1]){
//         find = 1;
//         if(itemsStruct[i].end1.compare("pin") > 0){
//           return itemsStruct[i].end1;
//         }
//         else if(itemsStruct[i].end1 != ""){
//           return otherEnd(itemsStruct[i].end1 , (itemsStruct[i].end1.compare("connector1") > 0));
//         }
//         else return "";
//       }
//     }
//     if(find == 0){
//       return "";
//     }
//   }
//   else{
//     int find = 0;
//     for(int i = 0; i < itemsStruct.size();i++){
//
//       if(itemsStruct[i].id == v[1]){
//         find = 1;
//         if(itemsStruct[i].end0.compare("pin") > 0){
//           return itemsStruct[i].end0;
//         }
//         else if(itemsStruct[i].end0 != ""){
//           return otherEnd(itemsStruct[i].end0 , (itemsStruct[i].end0.compare("connector1") > 0));
//         }
//         else return "";
//       }
//     }
//     if(find == 0) return "";
//   }
// }
