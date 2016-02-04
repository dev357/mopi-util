'use strict'

const mopiapi = require('./mopiapi');
const exec = require('child_process').exec;

const mopi = new mopiapi.mopiapi();

// CONFIG
const battery = 1; // which port on the MoPi is the backup battery connected to
const mainPower = 2; // which port on the MoPi is the main power connected to
const timer = 11; // how long should we wait before deciding the main power is gone
const mainLowVoltage = 10; // when the main battery drops below this, start timer
const pollingInterval = 2; // how often should we check if voltage has dropped, in s
const shutdownDelay = 35; // how long to wait until power is cut, in seconds(min 30s)

mopi.connect(function(err) {
  if (err) return console.log(err);

  function isMainVoltageGood() {
    return new Promise((resolve, reject) => {
      mopi.getVoltage(mainPower, (err, voltage) => {
        if (err) {
          console.log('checkVoltage error', err);
          resolve(false);
        }
        console.log('voltage: ' + voltage);
        if (voltage < mainLowVoltage * 1000) resolve(false);
        resolve(true);
      });
    });
  }

  const timerCounter = Math.ceil(timer / pollingInterval);
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
    let delay = shutdownDelay - 30 < 0 ? 0 : shutdownDelay - 30;
    mopi.setShutdownDelay(delay, (err) => {
      if (err) return console.log("Error", err);
      mopi.getShutdownDelay((err, value) => {
        if (err) return console.log("Error", err);

        console.log(JSON.stringify(value));
      });
    });
    exec("shutdown -h now");
  }

  let shutdownInterval = setInterval(shouldShutdown, pollingInterval * 1000);

  doShutdown();

});
