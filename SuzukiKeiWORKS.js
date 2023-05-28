//invoked only the first time the model is loaded, or upon reload
function init_chassis()
{
  var wheelparam = {
    radius: 0.25,                      
    width: 0.325,
    suspension_max: 0.2,              
    suspension_min: -0.15,
    suspension_stiffness: 30.0,
    damping_compression: 0.15,
    damping_relaxation: 0.15,
    slip: 1.8,
    roll_influnce: 0.1,
}
 
  this.add_wheel('LF', wheelparam);
  this.add_wheel('RF', wheelparam);
  this.add_wheel('LR', wheelparam);
  this.add_wheel('RR', wheelparam);
  this.geom = this.get_geomob(0)
  this.swheel = this.geom.get_joint("Steering");
   //inputs
  this.register_switch("car/lights/passing", function(v) {
    if(v>0) this.autolights = false;
    this.light_mask(0xf, v>0);
  });
 this.register_switch("car/lights/cabin", function(v) { this.light(lcabin, v>0); });
 //sounds
  snd1 = this.load_sound("starter.ogg");  
  snd2 = this.load_sound("i4-idle.ogg"); 
  
  //lights
  var fp = {size:0.1, angle:54, edge:0.08, fadeout:0.2, range:50};
  this.add_spot_light({x:0.525,y:1.627,z:0.527}, {y:1}, fp);
  this.add_spot_light({x:-0.525,y:1.627,z:0.527}, {y:1}, fp);
  
  //brakes
  fp = {size:0.034, angle:54, edge:0.8, intensity:0.3, fadeout:0.2, range:5, color:{x:1,y:1e-3}, fadeout:0.2};
  var brake =
  this.add_spot_light({x:0.594,y:-1.536,z:0.939}, {y:-1}, fp);
  this.add_spot_light({x:-0.594,y:-1.536,z:0.939}, {y:-1}, fp);
  brakemask = 0xf<<brake;
 
  //cabin light
  fp = {size:0.05, angle:150, edge:1, range:2, intensity:2, color:{x:1,y:0.8,z:0.7}, fadeout:0.4};
  lcabin = this.add_spot_light({x:0.0,y:-0.144,z:1.30}, {z:-1}, fp);

    return {mass:2600, com:{x: 0.0, y: 0.0, z: -8.0}, steering:3.0, steering_ecf:60, centering: 3.0, centering_ecf: 40};
}

//invoked for each new instance of the vehicle
function init_vehicle()
{
  this.set_fps_camera_pos({x:0.386,y:-0.271473,z:1.1942});	
  this.snd = this.sound();
  this.sound_source1 = this.snd.create_source("EXHAUST");   
  this.sound_source2 = this.snd.create_source("EXHAUST");   
  this.snd.set_gain(this.sound_source1 , 1);             
  this.snd.set_gain(this.sound_source2 , 0.7);             
  this.snd.set_ref_distance(this.sound_source1, 9);      
  this.snd.set_ref_distance(this.sound_source2, 9);      
 
  this.started = 0;
}

function engine(start)
{
  if(start) {
    this.started=1;
    this.snd.play(this.sound_source1, snd1, false, false);   
  }else {                                                         
    if (this.started==2){                                           
      this.snd.stop(this.sound_source2);                                        
    }                                                              
  }                                                                 
}

const EF = 38000.0;
const BF = 13000.0;
const maxkmh = 220;
const forceloss = EF / (0.4*maxkmh + 2);

//invoked each frame to handle inputs and animate the model
function update_frame(dt, engine, brake, steering)
{
  var kmh = this.speed()*3.6;
  
  //reduce engine force with speed (hack)
  var redux = engine>=0 ? 0.2 : 0.6;
  var esign = engine<0 ? -1 : 1;
  engine = EF*Math.abs(engine);
  var force = (esign>0) == (kmh>=0)
        ? engine/(redux*Math.abs(kmh) + 1)
        : engine;
  force -= forceloss;
  force = Math.max(0.0, Math.min(force, engine));
  engine = esign*force;


  steering *= 0.7;
  this.steer(0, steering);
  this.steer(1, steering);

  var steerAngle = steering *= 1.0;
	this.geom.rotate_joint_orig(this.swheel, steerAngle, {x:-0.364,y:-0.931,z:0.0});

  if(this.started>1)
    this.wheel_force(0, engine);
    this.wheel_force(1, engine);
  
  brake *= BF;
  this.wheel_brake(-1, brake);
 if(this.started==1 && !this.snd.is_playing(snd1)) { 
    this.started=2;
 this.snd.play(this.sound_source2, snd2, true, false); 
  }
  else if(this.started==2) {
    var pitch = Math.abs(kmh)/20.0;
    var g = kmh>0 ? Math.floor(pitch) : 0;
    var f = pitch - g;
    f += 0.5*g;
    this.snd.set_pitch(this.sound_source2, 0.5*f + 1.0); 
  }
  this.animate_wheels();  
}
