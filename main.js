const mopiapi = require('mopiapi');
const mopi = new mopiapi.mopiapi();

// CONFIG
const battery = 1; // which port on the MoPi is the backup battery connected to
const mainPower = 2; // which port on the MoPi is the main power connected to
const timer = 30; // how long should we wait before deciding the main power is gone
const mainLowVoltage = 9000; // when the main battery drops below this, start timer
const pollingInterval = 2000; // how often should we check if voltage has dropped, in ms


mopi.connect(function(err){
    if (err) return console.log(err);

    mopi.getStatus(function (err, status){
        if (err) return console.log("Error", err);

        status = new mopiapi.status(status);

        status.StatusDetail(function(err, detail){
            if (err) return console.log("Error", err);
            console.log(detail);
        });
    });

    function checkVoltage() {
      console.log('calling getVoltage');
      mopi.getVoltage(mainPower, (err, voltage) => {
        if (err) return console.log("Error", err);
        console.log('voltage: ' + voltage);
        if (voltage < mainLowVoltage) return false;
        return true;
      });
    }

    setInterval(this.checkVoltage, pollingInterval);

});
