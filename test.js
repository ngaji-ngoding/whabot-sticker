const schedule = require('node-schedule');

let waktu = new Date("2022-11-20T07:34:55");

const job = schedule.scheduleJob(waktu, function(){
 const date = new Date();
  console.log(date.toString());
});
