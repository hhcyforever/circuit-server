//init tutorial
const xml2js = require('xml2js');
const fs = require('fs');
const Step = require('step');
let stepNumber = 10;
let parser = new xml2js.Parser();
let fileName = "C:/america_2019/fritzing/fritzing-app/fzzs/Leds/Leds.fz";
let components = [];

function parseFile(filePath,callback){
  fs.readFile(filePath,'utf-8',(err,data) => {
    if (err) {console.log("error reading file"); throw err;}
    parser.parseString(data,function (err,res) {
      if(err) throw err;
      var instances = res.module.instances[0].instance;
      for(var i = 0; i < instances.length ; i += 1){
        let instance = instances[i];
        //console.log(instance);
        if(instance.$.moduleIdRef === "Arduino Nano3(fix)"){
          let component = {};
          component.type = 'Arduino Nano3(fix)';
          component.id = instance.$.modelIndex;
          component.flag = 0;
          let connectors = instance.views[0].breadboardView[0].connectors;
          let connector = connectors[0].connector;
          for(connectid in connector){
            if(connector[connectid].$.connectorId === "connector30"){
              component.end0 = connector[connectid].connects[0].connect[0].$.connectorId;
            }
            if(connector[connectid].$.connectorId === "connector31"){
              component.end1 = connector[connectid].connects[0].connect[0].$.connectorId;
            }
          }
          //console.log(component);
          components.push(component);
        }
        else if(instance.$.moduleIdRef === "5mmColorLEDModuleID"){
          let component = {};
          component.type = 'led';
          component.id = instance.$.modelIndex;
          component.flag = 0;
          let connectors = instance.views[0].breadboardView[0].connectors;
          let connector = connectors[0].connector;
          for(connectid in connector){
            if(connector[connectid].$.connectorId === "connector0"){
              let connect = connector[connectid].connects[0].connect;
              for(cid in connect){
                if(connect[cid].$.layer === "breadboardbreadboard"){
                  component.end0 = connect[cid].$.connectorId;
                }
              }
            }
            if(connector[connectid].$.connectorId === "connector1"){
              let connect = connector[connectid].connects[0].connect;
              for(let cid in connect){
                if(connect[cid].$.layer === "breadboardbreadboard"){
                  component.end1 = connect[cid].$.connectorId;
                }
              }
            }
          }
          //console.log(component);

          components.push(component);
        }
        else if(instance.$.moduleIdRef === "WireModuleID"){
          let component = {};
          if(!instance.views[0].breadboardView) continue;
          component.type = 'wire';
          component.id = instance.$.modelIndex;
          component.flag = 0;
          let connectors = instance.views[0].breadboardView[0].connectors;
          let connector = connectors[0].connector;
          for(connectid in connector){
            if(connector[connectid].$.connectorId === "connector0"){
              let connect = connector[connectid].connects[0].connect;
              for(cid in connect){
                if(connect[cid].$.connectorId > "pin"){
                  component.end0 = connect[cid].$.connectorId;
                }
                else{
                  component.end0 = {};
                  component.end0.targetEnd = connect[cid].$.connectorId;
                  component.end0.target = connect[cid].$.modelIndex;
                }
              }
            }
            if(connector[connectid].$.connectorId === "connector1"){
              let connect = connector[connectid].connects[0].connect;
              for(cid in connect){
                if(connect[cid].$.connectorId > "pin"){
                  component.end1 = connect[cid].$.connectorId;
                }
                else{
                  component.end1 = {};
                  component.end1.targetEnd = connect[cid].$.connectorId;
                  component.end1.target = connect[cid].$.modelIndex;
                }
              }
            }
          }
          if(component.end1 && component.end0) components.push(component);
        }
        else if(instance.$.moduleIdRef === "lijaeag5654yx6narfd346gnn-ResistorModuleID"){
          let component = {};
          component.type = 'resistor';
          component.id = instance.$.modelIndex;
          component.flag = 0;
          let connectors = instance.views[0].breadboardView[0].connectors;
          let connects0 = connectors[0].connector[0].connects[0].connect;
          for(let connect in connects0){
            //console.log(connects0[connect]);
            if(connects0[connect].$.layer === "breadboardbreadboard"){
              component.end0 = connects0[connect].$.connectorId;
            }
          }
          let connects1 = connectors[0].connector[1].connects[0].connect;
          //console.log(connects1);
          for(let connect in connects1){
            //console.log(connects1[connect]);
            if(connects1[connect].$.layer === "breadboardbreadboard"){
              component.end1 = connects1[connect].$.connectorId;
            }
          }
          //console.log(component);
          components.push(component);
        }
      }
      console.log(components);
      //to cut wire
      for(let i = components.length-1; i >= 0; i--){
        //final: flag === 2
        if(!components[i].end0.target && !components[i].end1.target){
          components[i].flag = 2;
        }
        if(components[i].end0.target && (!components[i].end1.target)){
          // visited: flag === 1
          if(components[i].flag === 1){
            continue;
          }
          components[i].flag = 2;
          components[i].end0 = otherEnd(components[i].end0);
        }
        if(!components[i].end0.target && components[i].end1.target){
          // visited: flag === 1
          if(components[i].flag === 1){
            continue;
          }
          components[i].flag = 2;
          components[i].end1 = otherEnd(components[i].end1);
        }
      }
      for(let i = components.length-1; i >= 0; i--){
        if(components[i].flag !== 2){
          components.splice(i,1);
        }
      }
      console.log("_______________________________________")
      console.log(components);
    })
  });

}

function otherEnd(end) {
  if(!end.target){
    return end;
  }
  else{
    let toWire = end.target;
    let toEnd = end.targetEnd;
    let find = 0;
    for(let i = 0; i < components.length; i++){
      if( components[i].id === toWire){
        find = 1;
        components[i].flag = 1;
        if(toEnd === 'connector0'){
          return otherEnd(components[i].end1);
        }
        else if(toEnd === 'connector1'){
          return otherEnd(components[i].end0);
        }
      }
    }
    if(find === 0){
      return "not found";
    }
  }
}

parseFile(fileName);



