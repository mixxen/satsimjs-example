import { generateGroundObservatoryVisualizer, generateSatelliteVisualizer } from "satsim/src/engine/cesium/ObjectVisulaizer.js";
import { Universe, createViewer, fetchTle, getVisibility, southEastZenithToAzEl } from "satsim";
import { Math as CMath, JulianDate, viewerCesiumInspectorMixin, ClockRange, ClockStep, defined, Color, Cartesian3, defaultValue, Viewer, CallbackProperty } from "cesium";

function jsonToHtmlBullets(json, indent = 0) {
  let html = '';
  const indentString = ' '.repeat(indent);

  for (let key in json) {
      if (json.hasOwnProperty(key)) {
          html += `${indentString}• ${key}`;

          if (typeof json[key] === 'object' && json[key] !== null) {
              // Recursively process nested objects with increased indentation
              html += '<br>' + jsonToHtmlBullets(json[key], indent + 4);
          } else {
              html += `: ${json[key]}<br>`;
          }
      }
  }

  return html;
}

async function loadSatellites(universe, viewer, url, linesPerTle=3, showPath=false, showLabel=false) {
  const response = await fetchTle(url, linesPerTle, (line1, line2, line3) => {
    if(universe.hasObject(line1))
      return;
    const satellite = universe.addSGP4Satellite(line1, line2, line3, 'nadir', true);
    satellite.model = {
      mode: 'lambertianSphere',
      diameter: 1.0,
      albedo: 0.25,
    }

    let description = 'TLE:<br>' + line2 + '<br>' + line3 + '<br><br>Model:<br>' + jsonToHtmlBullets(satellite.model) ;
    generateSatelliteVisualizer(universe, viewer, satellite, description)
  });

  return response;
}

async function loadSensors(universe, viewer, url) {
  const response = await fetch(url);
  const json = await response.json();
  for (let i = 0; i < json.length; i++) {
    const obs = json[i]
    const o = universe.addGroundElectroOpticalObservatory(obs.name, obs.latitude, obs.longitude, obs.altitude, 'AzElGimbal', obs.height, obs.width, obs.y_fov, obs.x_fov, obs.field_of_regard);
    generateGroundObservatoryVisualizer(universe, viewer, o)
    o.gimbal.trackMode = 'rate';
  }
}

function randomTrack(universe, observatory, time, maxIterations=500) {
  showTrackedPath(observatory.gimbal, false);
  const numTrackables = universe._trackables.length;
  if(numTrackables === 0) {
    return;
  }
  const localPos = new Cartesian3();
  while(true) {
    let ob = universe._trackables[Math.floor(Math.random() * numTrackables)];
    if(defined(ob)) {
      observatory.site.transformPointFromWorld(ob.worldPosition, localPos);
      let [az, el, r] = southEastZenithToAzEl(localPos)
      if(ob.period < 2000 * 60 && el > 30) {
        observatory.gimbal.trackObject = ob;
        observatory.gimbal.update(time, universe);
        break;
      } else if(maxIterations < 0) {
        break;
      }
    }
    maxIterations--;
  }
  showTrackedPath(observatory.gimbal, true);
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


export {
  loadSatellites,
  loadSensors,
  randomTrack,
  showTrackedPath
}