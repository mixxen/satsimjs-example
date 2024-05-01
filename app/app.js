import { Universe, applyIau2006XysDataPatch } from "satsim";
import { Math as CMath, JulianDate } from "cesium";
import fs from 'fs';

applyIau2006XysDataPatch();  // required when running in nodejs

CMath.setRandomNumberSeed(42);

//////////////////////
// Init universe    //
//////////////////////

const universe = new Universe();


//////////////////////
// Load Objects     //
//////////////////////

// load sensors
const json = JSON.parse(fs.readFileSync('app/assets/sites.json'));
for (let i = 0; i < json.length; i++) {
    const obs = json[i]
    const o = universe.addGroundElectroOpticalObservatory(obs.name, obs.latitude, obs.longitude, obs.altitude, 'AzElGimbal', obs.height, obs.width, obs.y_fov, obs.x_fov, obs.field_of_regard);
    o.gimbal.trackMode = 'rate';
}

// load satellites
const text = fs.readFileSync('app/assets/celestrak_sat_elem.txt').toString();
const lines = text.split('\n');
const count = lines.length - 1;
for (let i = 0; i < count; i += 3) {
    const line1 = lines[i].trim();
    const line2 = lines[i+1].trim();
    const line3 = lines[i+2].trim();
    if (!universe.hasObject(line1)) {
        universe.addSGP4Satellite(line1, line2, line3, 'nadir', false);
    }
}


//////////////////////
// Main             //
//////////////////////

const start = JulianDate.now();
const end = JulianDate.addSeconds(start, 60*60, new JulianDate());
universe.update(start);
console.log('starting simulation at', start.toString());

// Run the simulation from start to end
for (let t = start.clone(); JulianDate.compare(t, end) < 0; t = JulianDate.addSeconds(t, 60, new JulianDate())) {
    universe.update(t);
    console.log(universe.getObject('ISS (ZARYA)').worldPosition);
}

console.log('simulation complete at', end.toString());
