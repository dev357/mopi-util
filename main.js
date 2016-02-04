'use strict';


// CONFIG - edit these ########################################################################
const config = {
  battery: 1, // which port on the MoPi is the backup battery connected to
  mainPower: 2, // which port on the MoPi is the main power connected to
  timer: 11,  // how long should we wait before deciding the main power is gone for good
  mainLowVoltage: 10,  // when the main battery drops below this, start timer
  pollingInterval: 2,  // how often should we check if voltage has dropped, in s
  shutdownDelay: 35  // how long to wait until power is cut, in seconds(min 30s)
}
// ############################################################################################

// DO NOT EDIT BEYOND THIS POINT
const mopiapi = require('./mopiapi');
const exec = require('child_process').exec;

const mopi = new mopiapi.mopiapi();

mopi.connect(function(err) {
  if (err) return console.log(err);

  function isMainVoltageGood() {
    return new Promise((resolve) => {
      mopi.getVoltage(config.mainPower, (err, voltage) => {
        if (err) {
          console.log('checkVoltage error', err);
          resolve(false);
        }
        console.log('voltage: ' + voltage);
        if (voltage < config.mainLowVoltage * 1000) resolve(false);
        resolve(true);
      });
    });
  }

  const timerCounter = Math.ceil(config.timer / config.pollingInterval);
  let shutdownCounter = 0;

  function shouldShutdown() {
    isMainVoltageGood().then(value => {
      if (value === false) {
        shutdownCounter++;
        console.log(`counter: ${shutdownCounter}`);
        if (shutdownCounter >= timerCounter) {
          doShutdown();
        }
      } else {
        shutdownCounter = 0;
      }

    });

    mopi.getStatus((err, status) => {
      if (err) return console.log("Error", err);

      status = new mopiapi.status(status);

      if (status.ForcedShutdown()) {
        doShutdown();
      }
    });
  }

  function doShutdown() {
    clearInterval(shutdownInterval);
    console.log('SHUTTING DOWN!');
    let delay = config.shutdownDelay - 30 < 0 ? 0 : config.shutdownDelay - 30;
    mopi.setShutdownDelay(delay, (err) => {
      if (err) return console.log("Error", err);
      mopi.getShutdownDelay((err, value) => {
        if (err) return console.log("Error", err);

        console.log(JSON.stringify(value));
      });
    });
    exec("shutdown -h now");
  }

  let shutdownInterval = setInterval(shouldShutdown, config.pollingInterval * 1000);
});
