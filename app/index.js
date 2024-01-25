import { Universe, createViewer } from "satsim";
import { Math as CMath, JulianDate, viewerCesiumInspectorMixin, ClockRange, ClockStep, defined, Color, Cartesian3 } from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import "cesium/Build/Cesium/Widgets/InfoBox/InfoBoxDescription.css"
import "./index.css";
import { loadSensors, randomTrack, loadTwoBodies, loadSatellites } from "./common.js";


CMath.setRandomNumberSeed(42);


//////////////////////
// Init universe    //
//////////////////////
const universe = new Universe();
const viewer = createViewer("cesiumContainer", universe, {
  showWeatherLayer: true,
  showNightLayer: true,
  weatherApiKey: '7095421a34694ea9cb80a0c531ca5e24'
});
const start = JulianDate.now();
viewer.clock.startTime = start.clone();
viewer.clock.stopTime = JulianDate.addSeconds(start, 60 * 60 * 24, new JulianDate());
viewer.clock.currentTime = start.clone();
viewer.clock.clockRange = ClockRange.LOOP_STOP;
viewer.clock.clockStep = ClockStep.SYSTEM_CLOCK;

// debug
// console.log(viewer);
// viewer.extend(viewerCesiumInspectorMixin);


//////////////////////
// Main application //
//////////////////////
loadSensors(universe, viewer, 'assets/sites.json').then(() => {
  loadSatellites(universe, viewer, 'assets/celestrak_sat_elem.txt').then(() => {

    // track something    
    universe.update(start);
    universe._observatories.forEach((o) => {
      randomTrack(universe, o, start);
    });

    // random track
    const lastTrackTime = new JulianDate();
    viewer.scene.preUpdate.addEventListener((scene, time) => {
      if(Math.abs(JulianDate.secondsDifference(lastTrackTime, time)) > 15) {
        const observatories = universe._observatories;
        randomTrack(universe, observatories[Math.floor(Math.random() * observatories.length)], time);
        JulianDate.clone(time, lastTrackTime);   
      }
    });
    
  });
});


window.sel = function() {
  console.log('sel');
}