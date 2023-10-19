import { Universe, createViewer, fetchTle } from "satsim";
import { Math as CMath, JulianDate, viewerCesiumInspectorMixin, ClockRange, ClockStep, defined, Color } from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import "./index.css";


CMath.setRandomNumberSeed(42);


//////////////////////
// Init universe    //
//////////////////////
const universe = new Universe();
const viewer = createViewer("cesiumContainer", universe);
const start = JulianDate.now();
viewer.clock.startTime = start.clone();
viewer.clock.stopTime = JulianDate.addSeconds(start, 60 * 60 * 24, new JulianDate());
viewer.clock.currentTime = start.clone();
viewer.clock.clockRange = ClockRange.LOOP_STOP;
viewer.clock.clockStep = ClockStep.SYSTEM_CLOCK;

console.log(viewer);
viewer.extend(viewerCesiumInspectorMixin);


//////////////////////
// Main application //
//////////////////////
loadSatellites('assets/celestrak_sat_elem.txt');
loadSensors('assets/sites.json');

const lastTrackTime = JulianDate.clone(start);
viewer.scene.preUpdate.addEventListener((scene, time) => {
  if(Math.abs(JulianDate.secondsDifference(lastTrackTime, time)) > 15) {
    const gimbals = universe.gimbals;
    randomTrack(gimbals[Math.floor(Math.random() * gimbals.length)], time);
    JulianDate.clone(time, lastTrackTime);
  }
});


//////////////////////
// Helper functions //
//////////////////////
async function loadSatellites(url) {
  fetchTle(url, 3, (line1, line2, line3) => {
    const satellite = universe.addSGP4Satellite(line2, line3, 'nadir', line1, true);
    const description = `<div><b>${line1}</b><br><br>${line2}<br>${line3}<br><br>Period: ${(satellite.period / 60).toFixed(2)} min<br><br></div>`;
    const color = new Color.fromRandom({alpha: 1.0});
    viewer.addObjectVisualizer(satellite, description, {
      path: {
        show: false,
        leadTime: satellite.period / 2,
        trailTime: satellite.period / 2,
        resolution: satellite.period / 300,
        material: color,
        width: 1      
      },
      point: { 
        pixelSize: Math.random() * 4 + 1, 
        color: color,
      }
    });
  });
}

async function loadSensors(url) {
  const response = await fetch(url);
  const json = await response.json();
  for (let i = 0; i < json.length; i++) {
    const obs = json[i]
    const o = universe.addGroundElectroOpticalObservatory(obs.name, obs.latitude, obs.longitude, obs.altitude, 'AzElGimbal', obs.height, obs.width, obs.y_fov, obs.x_fov, obs.field_of_regard);
    const description = `<div><b>${o.site.name}</b><br><br>Latitude: ${o.site.latitude} deg<br>Longitude: ${o.site.longitude} deg<br>Altitude: ${o.site.altitude} m<br><br></div>`;
    viewer.addObservatoryVisualizer(o, description);
    o.gimbal.trackMode = 'rate';
    randomTrack(o.gimbal, viewer.clock.currentTime);
  }
}

function randomTrack(gimbal, time) {
  let maxIterations = 500;
  let keys = Object.keys(universe.objects);

  showTrackedPath(gimbal, false);

  while(true) {
    let ob = universe._objects[keys[Math.floor(Math.random() * keys.length)]];
    if(defined(ob)) {
      gimbal.trackObject = ob;
      gimbal.update(time, universe);
      if(ob.period < 2000 * 60 && gimbal.el > 30 || maxIterations < 0) {
        break;
      }
    }
    maxIterations--;
  }

  showTrackedPath(gimbal, true);
}

function showTrackedPath(gimbal, show) {
  if(defined(gimbal.trackObject)) {
    if(defined(gimbal.trackObject.visualizer)) {
      if(defined(gimbal.trackObject.visualizer.path)) {
        gimbal.trackObject.visualizer.path.show = show;
      }
    }
  }
}
