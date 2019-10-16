import {tiny, defs} from './assignment-4-resources.js';

const delta_x = 8;
const delta_y = 5;
const ddelta_x = 16;
const ddelta_y = 10;
const z_back = -20;
const z_fwd = 15;
const numSpheres = 15;
const BPM = 110;	// specific to our song
var secPerBeat = 60. / BPM;
var tLast = 0;
const delay = secPerBeat;
                                                                // Pull these names into this module's scope for convenience:
const { Vec, Mat, Mat4, Color, Light, Shape, Shader, Material, Texture,
         Scene, Canvas_Widget, Code_Widget, Text_Widget } = tiny;
const { Cube, Subdivision_Sphere, Transforms_Sandbox_Base, Moving_Spheres, genSpheres, touching, Square, ungravity, elastic_massequal, vect_dist, hash, Triangle, find_acc, noPosSpeed, fall, col2, col3, xbound,ybound, zbound, xzdist, col5 } = defs;

    // Now we have loaded everything in the files tiny-graphics.js, tiny-graphics-widgets.js, and assignment-4-resources.js.
    // This yielded "tiny", an object wrapping the stuff in the first two files, and "defs" for wrapping all the rest.

var GlobalScene;
var GlobalProgramState;

var audio, audiocontext, analyser, source, frequency_array;
var bass, treble, prevBass, prevTreble, prevTime = 0, bassDiff = 0, timeBtwn = 0, s3_peak = false, peakTime, lastPos, target;
var bool_grav = 1;

const Main_Scene =
class Project_Scene extends Scene
{
	constructor()
    {
      super();
                                                        // At the beginning of our program, load one of each of these shape
                                                        // definitions onto the GPU.  NOTE:  Only do this ONCE per shape.
                                                        // Don't define blueprints for shapes in display() every frame.

        this.scratchpad = document.createElement('canvas');
                                    // A hidden canvas for re-sizing the real canvas to be square:
        this.scratchpad_context = this.scratchpad.getContext('2d');
        this.scratchpad.width   = 256;
        this.scratchpad.height  = 256;                // Initial image source: Blank gif file:
        this.texture = new Texture( "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" );
      const Subdivision_Sphere_Flat = Subdivision_Sphere.prototype.make_flat_shaded_version();
      this.shapes = { 'box'  : new Cube(),
                      'ball' : new Moving_Spheres(),
      				'square' : new Square(),
      			  'triangle' : new Triangle() };

      const phong_shader      = new defs.Phong_Shader  (2);
      const texture_shader    = new defs.Textured_Phong(2);
      const texture_shader_2  = new defs.Fake_Bump_Map (2);
      const gouraud_shader    = new Gouraud_Shader     (2);
      const black_hole_shader = new Black_Hole_Shader();
      const ball_noise_shader = new Ball_Noise_Shader();
      const edge_detection_shader = new Edge_Shader();
      const r_wall_shader 	= new R_Wall_Shader();
      const l_wal_shader	= new L_Wall_Shader();



      this.materials = { plastic: new Material( phong_shader,
                                    { ambient: 0, diffusivity: 1, specularity: 0, color: Color.of( 1,1,1,1 ) } ),
                         playbutton:   new Material( phong_shader,
                                    { ambient: 1, diffusivity: 0, specularity: 1, color: Color.of( 1,1,1,1 ) } ),
	      				 backgrnd: new Material (gouraud_shader, { ambient: 1, metalness: 1,color:Color.of(1,.44,.85,.6)}),
                         test:    new Material( phong_shader,
                                    { ambient: 1,
                                      diffusivity: 0,
                                      specularity: 1,
                                      color: Color.of( 0,0,0,1 ) } ),


                         r_wall_material : new Material (r_wall_shader, {ambient:1, diffusivity:0, specularity:1, color:Color.of(1,1,1,1)}),
                         l_wall_material : new Material (l_wal_shader, {ambient:1, diffusivity:0, specularity:1, color:Color.of(1,1,1,1)}),
                         a: new Material( edge_detection_shader,{ ambient: 1, diffusivity: 0, specularity: 1, color: Color.of(1,1,1,1)}),
                         c: new Material(	texture_shader_2, { ambient:  1, diffusivity:0,specularity:1, texture: this.texture }),
                         b: new Material( ball_noise_shader,{ ambient: 1, diffusivity: 0, specularity: 1, color: Color.of(1,1,1,1)})
                       };

      audio = new Audio();
      audio.crossOrigin="anonymous";
      audiocontext = new (window.AudioContext || window.webkitAudioContext)();
      analyser = audiocontext.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.5;
      audio.src = "assets/music.mp3";
      source = audiocontext.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(audiocontext.destination);
      frequency_array = new Uint8Array(analyser.frequencyBinCount);
      this.isPlaying = false;

      audio.currentTime = 0;
      this.playtime = delay	+ secPerBeat*0;//DEBUG

	let id = Mat4.identity();
	this.backplane = id.times(Mat4.translation([0,0,z_back]))
	    			.times(Mat4.scale([delta_x, delta_y, 0]));
	this.backdrop = id.times(Mat4.translation([0,0,z_back]))
	    			.times(Mat4.scale([ddelta_x*2, ddelta_y*2, 0]));
	this.backplane = id.times(Mat4.translation([0,0,z_back]))
	    			.times(Mat4.scale([delta_x+1, delta_y+1, 0]));
	this.floor = id.times(Mat4.translation(Vec.of(0,-delta_y-1,-5)))
					.times( Mat4.scale([ -delta_x-1,.005,z_fwd]));
	this.floor2 = id.times(Mat4.translation(Vec.of(0,-delta_y-1,-5)))
					.times(Mat4.rotation(90, Vec.of(1,0,0)))
					.times( Mat4.scale([ 300,300,0 ]) );
	this.ceiling = id.times(Mat4.translation(Vec.of(0,delta_y+1,-5)))
					.times( Mat4.scale([ delta_x+1,.005,z_fwd ]) );
	this.right_wall = id.times(Mat4.translation([delta_x+1, 0,-5]))
					.times(Mat4.scale([.005,delta_y+1,z_fwd]));
	this.left_wall = id.times(Mat4.translation([-delta_x-1, 0,-5]))
				.times(Mat4.scale([.005,delta_y+1,z_fwd]));
      this.spheres = { array: [],
                       color: Color.of( Math.round(Math.random()*2)/2, Math.round(Math.random()*2)/2, Math.round(Math.random()*2)/2, 1 )};

      var x,y,z, tempspeed, temppos,temp_i;
      this.spheres.array = [];



    // let obj = new Moving_Spheres(Vec.of(x,y,z), Vec.of(0.1*Math.random()-.05, .1*Math.random()-.05,0.05 ), this.spheres.color);
        for ( let i = 0; i < numSpheres; i++)
           {
             x = -(delta_x)+Math.random()*ddelta_x;
             y = -(delta_y)+Math.random()*ddelta_y;
             z = -1* Math.random()*20;
	     temppos = Vec.of(x,y,z);
	     for ( let j = 0; j < i;)  //don't generate spheres on one another
		   {
			   temp_i = j;
			   while ( touching(this.spheres.array[temp_i], temppos))
				   {
                                     z = -1* Math.random()*20;
                                     y = -(delta_y)+Math.random()*ddelta_y;
                                     x = -(delta_x)+Math.random()*ddelta_x;
	     			     temppos = Vec.of(x,y,z);
				     j = -1;
				 }
			  j ++;
		   }
	     tempspeed = Vec.of(0.1*Math.random()-0.05, 0.1*Math.random()-0.05, 0.05);
            let obj = new Moving_Spheres(temppos,  tempspeed, this.spheres.color );
            this.spheres.array.push(obj);
           }

    	this.initScenes();
    }

	initScenes()
	{
		var tempcolor;

		this.scene1 = [];
		tempcolor = Color.of(Math.round(Math.random()*2)/2, Math.round(Math.random()*2)/2, Math.round(Math.random()*2)/2,1);
		if (tempcolor[0] == 0 && tempcolor[1] == 0 && tempcolor[2] == 0)
		{
    			tempcolor = Color.of(Math.round(Math.random()*2)/2, Math.round(Math.random()*2)/2, Math.round(Math.random()*2)/2,1);
		}
    	for (let i = 0; i < 16; i++)
    	{
    		this.scene1.push(new Moving_Spheres(undefined, undefined, tempcolor));
    	}

    	this.scene2 = [];
    	this.s2_color = Color.of(Math.round(Math.random()*2)/2, Math.round(Math.random()*2)/2, Math.round(Math.random()*2)/2,1);
    	for (let i = 0; i < 13; i++)
    	{
    		this.scene2.push(new Moving_Spheres( Vec.of(-6,0,0), undefined, this.s2_color ));
    	}
    	this.scene2.push(new Moving_Spheres( Vec.of(0,-1.75,0), undefined, this.s2_color ));

    	this.scene3 = [];
    	tempcolor = Color.of(Math.round(Math.random()*2)/2, Math.round(Math.random()*2)/2, Math.round(Math.random()*2)/2,1);
    	if (tempcolor[0] == 0 && tempcolor[1] == 0 && tempcolor[2] == 0)
	{
    		tempcolor = Color.of(Math.round(Math.random()*2)/2, Math.round(Math.random()*2)/2, Math.round(Math.random()*2)/2,1);
	}
	var f,m,l, temppos, temp_i;
    	for (let i = 0; i < 12; i++)
    	{
    		f = -delta_x + Math.random() * ddelta_x;
                m = -delta_y + Math.random() * ddelta_y;
                l  = -1 * Math.random() * 20;
		temppos = Vec.of(f,m,l);
		for ( let j = 0 ; j < i;)
		{
			temp_i = j;
			while(touching(this.scene3[temp_i], temppos))
			{
    				f = -delta_x + Math.random() * ddelta_x;
                		m = -delta_y + Math.random() * ddelta_y;
                		l  = -1 * Math.random() * 20;
				temppos = Vec.of(f,m,l);
				j = -1;
			}
			j++;
		}
    		let spd = Vec.of(0.2*Math.random()-0.1, 0.2*Math.random()-0.1, 0.2*Math.random()-0.1);
    		this.scene3.push( new Moving_Spheres( temppos, spd, tempcolor ) );
    	}

    	this.scene4 = [];
    	tempcolor = Color.of(Math.round(Math.random()*2)/2, Math.round(Math.random()*2)/2, Math.round(Math.random()*2)/2,1);
    	if (tempcolor[0] == 0 && tempcolor[1] == 0 && tempcolor[2] == 0)
    		tempcolor = Color.of(Math.round(Math.random()*2)/2, Math.round(Math.random()*2)/2, Math.round(Math.random()*2)/2,1);
    	for (let i = 0; i < 10; i++)
    	{
    		this.scene4.push(new Moving_Spheres( Vec.of(5,0,0), undefined, tempcolor ));
    	}
	}

    movSpheres(arr, active=true)
    {
      var temp, oldspeed;
      var newX, newY, newZ;
	var xch, ych, zch;
	arr.forEach(ball => ball.setpotpos( ball.getPos() ) );
      	arr.forEach(ball => ball.setc(-1)); //everyball starts off as not collided
      if(bool_grav== 1)
      {
      	for(let i = 0; i < arr.length; i++)
      	{
		xch = 0; //see if x speed changes
		ych = 0; //see if y val changes
		zch = 0;  //see ... z changes
        	temp = arr[i].getpotpos(); //should just be actual pos
		oldspeed = arr[i].getSpeed();
        	newX=temp[0] + oldspeed[0];
        	newY=temp[1] + oldspeed[1];
        	newZ=temp[2] + oldspeed[2];
        	if((newZ >= z_fwd) || (newZ <= z_back))
        	{
			arr[i].setSpeedZ((-1*oldspeed[2]));
			zch = 1; //the speed changed direcitons, don't wanna doubel change it

        	}
	//out of bounds check for x and y
		if ( newX <= -delta_x || newX >= delta_x )
		{
            		arr[i].setSpeedX((-1 *oldspeed[0])) ;
			xch = 1;
		}
        	if ( newY <= -delta_y || newY >= delta_y )
		{
            		arr[i].setSpeedY( (-1 * oldspeed[1]) );
			ych = 1;
		}
		arr[i].setpotpos( arr[i].getpotpos().plus( arr[i].getSpeed() ) );
		col3(arr,arr[i],i, xch, ych, zch, delta_x, delta_y, z_fwd, z_back);
	      //only change in translation so should be ok
      	}
      	arr.forEach(ball => ball.setc(-1)); //everyball starts off as not collided
         arr.forEach( ball => ball.setOldSpeed(ball.getSpeed()) );
	  if (active)
	      {
		      arr.forEach(ball => ball.setPos( ball.getPos().plus( ball.getSpeed() ) ));

	      }

      }
						//if (this.playtime > secPerBeat * 33) { arr[i].setRandCol(); }
	                     // 			break;


     else //gravity has been called
      {
         var len = arr.length;
         var temp,p1,p2, s1, s2, pos, speed, t;
        for ( let i =0; i < len ; i ++)
            {

                     fall(arr,arr[i],i);
            }
        arr.forEach(ball => ball.setc(-1)); //everyball starts off as not collided
      	}
    }


    playAudio()
    {
	    if (audiocontext.state == 'suspended')
		       audiocontext.resume();
        if (!this.isPlaying)
               audio.play();
        else
               audio.pause();
        this.isPlaying = !this.isPlaying;
    }

    reload()
    {
    	if (this.isPlaying)
    	{
    		audio.pause();
    		this.isPlaying=false;
    	}
    	audio.currentTime = 0;
    	this.playtime = delay;
    	this.initScenes();
    }

  grav()
  {
        bool_grav = (-1* bool_grav); //flip the val
        if (bool_grav == -1)
          {
                 //this.spheres.array.forEach(ball => ball.oldspeed = ball.getSpeed());
                  this.spheres.array.forEach(ball => ball.noPosSpeed());
                  this.spheres.array.forEach(ball => find_acc(ball));
          }
        else
          {

                  this.spheres.array.forEach(ball => ungravity(ball));
          }

  }

  make_control_panel()
    {                                 // make_control_panel(): Sets up a panel of interactive HTML elements, including
                                      // buttons with key bindings for affecting this scene, and live info readouts.
        this.key_triggered_button( "Play/Pause",  ["p"], this.playAudio  );
		this.key_triggered_button( "Reload Song", ["l"], this.reload 	 );
		this.key_triggered_button( "Gravity",     ["G"], this.grav 		 );
    }

  betweenBeats(start, end=start+1)
  {
  	  return (this.playtime > secPerBeat * start && this.playtime <= secPerBeat * end);
  }

  scene2_bounce(noteNum)
  {
  	  let target;
  	  let s2_1 = this.betweenBeats(73,105);
  	  let s2_2 = this.betweenBeats(105,137);
  	  for (let i = 0; i < 13; i++)
  	  {
  	  	  let ball = this.scene2[i];
  	  	  if (i == noteNum)
  	  	  {
  	  	  	  if ( s2_1 )
  	  	  	  	  target = Vec.of(-7.5,0,0);
  	  	  	  else if ( s2_2 )
  	  	  	  	  target = Vec.of(-8,0,0);
  	  	  	  else
  	  	  	  	  target = Vec.of(-9,0,0);

  	  	  	  ball.setColor( Color.of( 0,0,1,1 ) );
  	  	  }
  	  	  else
  	  	  {
  	  	  	  if ( s2_1 )
  	  	  	  	  target = Vec.of(-6,0,0);
  	  	  	  else if ( s2_2 )
  	  	  	  	  target = Vec.of(-6.25,0,0);
  	  	  	  else
  	  	  	  	  target = Vec.of(-6.5,0,0);
  	  	  	  ball.setColor( this.s2_color );
  	  	  }
	  	  ball.setPos( this.lerp( this.lerp( ball.getPos(), target ), this.lerp( target, Vec.of(-6,0,0) ) ) );
  	  }
  }

  display( context, program_state )
    {
    	// Get Audio Data
        analyser.getByteFrequencyData(frequency_array);
		// Audio Scaling
		var bassScale;
		var trebScale;
		bass = getBass();
		treble = getTreble();
		var ceiling_color = Color.of(1,.44,.85,.6);
		var ball_color = Color.of(0,0,1,1);
		if (!this.isPlaying || bass == 0)
		{
			bassScale = 1.0;

		}
		else
		{
			bassScale = bass/256 *1.5+0.1; // last 2 args: range of radius size, smallest possible radius
			ceiling_color = Color.of(bassScale/2,0, 1-bassScale/2,1);
			ball_color = Color.of(1-bassScale/2,0,bassScale/2, 1);
		}
        if( !context.scratchpad.controls )
          {
            this.children.push( context.scratchpad.controls = new defs.Movement_Controls() );
            //this.children.push( this.camera_teleporter = new Camera_Teleporter() );
            program_state.set_camera( Mat4.look_at( Vec.of( 0,0,20 ), Vec.of( 0,0,0 ), Vec.of( 0,1,0 ) ) );
            this.initial_camera_location = program_state.camera_inverse;
            program_state.projection_transform = Mat4.perspective( Math.PI/4, context.width/context.height, 1, 200 );
          }

        const t = program_state.animation_time / 1000;	// in seconds
        if (this.isPlaying)
        	this.playtime += (t - tLast);
        tLast = t;

        let model_transform = Mat4.identity();

        program_state.lights = [ new Light( Vec.of(0,5,20,1), Color.of(1,1,1,1), 1000 ) ];

		// Scene 1
		if (this.playtime > delay && this.playtime <= secPerBeat * 32.5)
		{
			var scaleDown = 1;

			if (!this.isPlaying || bass == 0)
				bassScale = 1.0;
			else
				bassScale = bass/256 *1.0+0.0;

			this.scene1.forEach( s => s.setRadius(bassScale) );

			if ( this.betweenBeats(4,5) )
			{
				for (let i = 0; i < this.scene1.length; i++)
				{
					if (i % 8 >= 2 && i % 8 <= 5)
						this.scene1[i].setPos( this.lerp( Vec.of(0,0,0), Vec.of(-2,0,0) ) );
					else
						this.scene1[i].setPos( this.lerp( Vec.of(0,0,0), Vec.of(2,0,0) ) );
				}
			}

			if ( this.betweenBeats(8,9) )
			{
				for (let i = 0; i < this.scene1.length; i++)
				{
					if (i % 8 == 0 || i % 8 == 1)
						this.scene1[i].setPos( this.lerp( Vec.of(2,0,0), Vec.of(2,2,0) ) );
					else if (i % 8 == 2 || i % 8 == 3)
						this.scene1[i].setPos( this.lerp( Vec.of(-2,0,0), Vec.of(-2,2,0) ) );
					else if (i % 8 == 4 || i % 8 == 5)
						this.scene1[i].setPos( this.lerp( Vec.of(-2,0,0), Vec.of(-2,-2,0) ) );
					else
						this.scene1[i].setPos( this.lerp( Vec.of(2,0,0), Vec.of(2,-2,0) ) );
				}
			}

			if ( this.betweenBeats(12,13) )
			{
				for (let i = 0; i < this.scene1.length; i+=2)
				{
					if (i % 8 == 0)
						this.scene1[i].setPos( this.lerp( Vec.of(2,2,0), Vec.of(2,0,0) ) );
					else if (i % 8 == 2)
						this.scene1[i].setPos( this.lerp( Vec.of(-2,2,0), Vec.of(0,2,0) ) );
					else if (i % 8 == 4)
						this.scene1[i].setPos( this.lerp( Vec.of(-2,-2,0), Vec.of(-2,0,0) ) );
					else
						this.scene1[i].setPos( this.lerp( Vec.of(2,-2,0), Vec.of(0,-2,0) ) );
				}
			}

			if ( this.betweenBeats(17,18) )
			{
				for (let i = 0; i < this.scene1.length; i++)
				{
					let target = 		Mat4.rotation( i * Math.PI / 4, Vec.of( 0,0,1 ) )
					     		.times( Mat4.translation( Vec.of( 2.5,0,0 ) ) )
						 		.times( Vec.of( 0,0,0,1 ) );
					this.scene1[i].setPos( this.lerp( this.scene1[i].getPos(), target ) );
				}
			}

			if ( this.betweenBeats(19,20) )
			{
				for (let i = 0; i < this.scene1.length/2; i++)
				{
					let target = 		Mat4.rotation( i * Math.PI / 4, Vec.of( 0,0,1 ) )
					     		.times( Mat4.translation( Vec.of( 4.5,0,0 ) ) )
						 		.times( Vec.of( 0,0,0,1 ) );
					this.scene1[i].setPos( this.lerp( this.scene1[i].getPos(), target ) );
				}
			}

			if ( this.betweenBeats(20,21) )
			{
				this.scene1.forEach( s => s.setPos( this.lerp( s.getPos(), Vec.of(0,0,0) ) ) );
			}

			if ( this.betweenBeats(21,22) )
			{
				for (let i = 0; i < this.scene1.length; i++)
				{
					let x = (i < 8) ? 4.5 : 2.5;
					let target = 	Mat4.rotation( i * Math.PI / 4, Vec.of( 0,0,1 ) )
					    	.times( Mat4.translation( Vec.of( x,0,0 ) ) )
				 			.times( Vec.of( 0,0,0,1 ) );
				 	this.scene1[i].setPos( this.lerp( this.scene1[i].getPos(), target ) );
				}
			}

			if (this.betweenBeats(32,32.5))
				scaleDown = this.lerpInt( 1,0,32,0.5 );
			else if (this.betweenBeats(32.5,33))
				scaleDown = 0;

			this.movSpheres(this.scene1, false);

			if ( this.betweenBeats(21,32.5) )
			{
				for (let i = 0; i < this.scene1.length; i++)
				{
					let s = this.scene1[i];
					let dir = (i < this.scene1.length/2) ? 1 : -1;
					s.draw( context, program_state,
							model_transform.times( Mat4.rotation( dir*t, Vec.of(0,0,1) ) )
										   .times( Mat4.translation( s.getPos() ) )
										   .times( Mat4.scale( Vec.of(scaleDown,scaleDown,scaleDown) ) )
							  			   .times( Mat4.scale( Vec.of(s.getRadius(),s.getRadius(),s.getRadius()) ) ),
				   		    this.materials.plastic.override( Color.of(0,0,0,1) ) );
				}
			} else
			{
				this.scene1.forEach( s => s.draw( context, program_state,
									 model_transform.times( Mat4.translation( s.getPos() ) )
													.times( Mat4.scale( Vec.of(scaleDown,scaleDown,scaleDown) ) )
													.times( Mat4.scale( Vec.of(s.getRadius(),s.getRadius(),s.getRadius()) ) ),
									 this.materials.plastic.override( Color.of(0,0,0,1) ) ) );
			}

		}

		// Scene 2
		else if ( this.betweenBeats(69,168) )
		{
			if (!this.isPlaying || bass == 0)
				bassScale = 0.75;
			else
				bassScale = bass/256 *0.5+0.5;

			if (!this.isPlaying || treble == 0)
				trebScale = 2.5;
			else
				trebScale = treble/256 *3.0+2.5;

			this.scene2.forEach( s => s.setRadius(bassScale) );

			var initScale;
			if ( this.betweenBeats(69,72) )
			{
				for (let i = 0; i < this.scene2.length; i++)
				{
					let tmpColor = this.scene2[i].getColor();
					initScale = this.lerp( Vec.of(0,0,0), Vec.of(1,1,1), 69, 3 );
					this.scene2[i].setColor( Color.of( tmpColor[0],tmpColor[1],tmpColor[2],this.lerpInt( 0, 1, 69, 3 ) ) );
				}
			} else if ( this.betweenBeats(165,168) )
			{
				initScale = this.lerp( Vec.of(1,1,1), Vec.of(0,0,0), 165, 3 );
			} else
			{
				initScale = Vec.of(1,1,1);
			}

			// pass 1
			if ( this.betweenBeats(73,165) )
			{
				var note;
				switch ( Math.floor( this.playtime / secPerBeat ) )
				{
					case 85: case 86: case 101: case 102:
						note = 0;
						break;
					case 87: case 103:
						note = 1;
						break;
					case 84: case 100:
						note = 2;
						break;
					case 89: case 93:
						note = 4;
						break;
					case 83: case 88: case 99: case 104:
						note = 5;
						break;
					case 77: case 78: case 82: case 94: case 98:
						note = 7;
						break;
					case 79: case 95:
						note = 8;
						break;
					case 81: case 97:
						note = 9;
						break;
					case 75: case 91: case 96:
						note = 10;
						break;
					case 73: case 74: case 76: case 80: case 90: case 92:
						note = 11;
						break;
					default:
						note = -1;
				}

				this.scene2_bounce(note);
			}

			// pass 2,3
			if ( this.betweenBeats(105,165) )
			{
				var eighth;
				switch ( Math.floor( this.playtime * 2 / secPerBeat ) / 2 )
				{
					case 117: case 119: case 133:
					case 149: case 151:
						eighth = 4;
						break;
					case 118: case 150:
						eighth = 6;
						break;
					case 114: case 120: case 130: case 134:
					case 146: case 152: case 162:
						eighth = 7;
						break;
					case 111: case 127: case 143: case 159:
						eighth = 8;
						break;
					case 113: case 115: case 116: case 129: case 131: case 132:
					case 145: case 147: case 148: case 161: case 163: case 164:
						eighth = 9;
						break;
					case 135:
						eighth = 10;
						break;
					case 105: case 106: case 107: case 108: case 109: case 110: case 112:
					case 121: case 122: case 123: case 124: case 125: case 126: case 128:
					case 137: case 138: case 139: case 140: case 141: case 142: case 144:
					case 153: case 154: case 155: case 156: case 157: case 158: case 160:
						eighth = 11;
						break;
					case 136:
						eighth = 12;
						break;

					case 118.5: case 150.5:
						eighth = 5;
						break;
					case 112.5: case 117.5: case 128.5:
					case 144.5: case 149.5: case 160.5:
						eighth = 7;
						break;
					case 116.5: case 132.5: case 133.5: case 148.5: case 164.5:
						eighth = 8;
						break;
					case 110.5: case 120.5: case 126.5: case 135.5:
					case 142.5: case 152.5: case 158.5: case 167.5:
						eighth = 9;
						break;
					case 115.5: case 131.5: case 136.5: case 147.5: case 163.5:
						eighth = 10;
						break;
					case 134.5:
						eighth = 11;
						break;
					case 107.5: case 109.5: case 123.5: case 125.5:
					case 139.5: case 141.5: case 155.5: case 157.5:
						eighth = 12;
						break;
					default:
						eighth = -1;
				}

				this.scene2_bounce(eighth);
			}

			for (let i = 0; i < this.scene2.length-1; i++)
			{
				let s = this.scene2[i];
				s.draw( context, program_state,
						model_transform.times( Mat4.translation( Vec.of(0,-1.75,0) ) )
									   .times( Mat4.rotation( (i-1.5) * -4/3*Math.PI/(this.scene2.length-2), Vec.of(0,0,1) ) )
									   .times( Mat4.translation( s.getPos() ) )
									   .times( Mat4.scale( initScale ) )
									   .times( Mat4.scale( Vec.of(s.getRadius(),s.getRadius(),s.getRadius()) ) ),
						this.materials.plastic.override( Color.of(0,0,0,1) ) );
			}
			let bigBall = this.scene2[this.scene2.length-1];
			bigBall.draw( context, program_state,
						  model_transform.times( Mat4.translation( bigBall.getPos() ) )
						  				 .times( Mat4.scale( initScale ) )
						  				 .times( Mat4.scale( Vec.of(trebScale, trebScale, trebScale) ) ),
						  this.materials.plastic.override( Color.of(0,0,0,1) ) );
		}

		// Scene 3 (random motion + bass drops)
		else if (this.betweenBeats(168,296))
		{
			var initScale, boundhit, temp,w;
			if (this.betweenBeats(168,169))
				initScale = this.lerp( Vec.of(0,0,0), Vec.of(1,1,1) );
			else if (this.betweenBeats(293,296))
				initScale = this.lerp( Vec.of(1,1,1), Vec.of(0,0,0), 293, 3 );
			else
				initScale = Vec.of(1,1,1);

			if (!this.isPlaying || bass == 0)
				bassScale = 1.0;
			else
				bassScale = bass/256 *1.0+0.5;
			this.scene3.forEach( ball => ball.setRadius(bassScale) );

			if ( this.betweenBeats(217,218) || this.betweenBeats(221,222) || this.betweenBeats(233,234) || this.betweenBeats(240,241) || this.betweenBeats(241,242) )
			{
				lastPos = [];
				target = [];
				for (let i = 0; i < this.scene3.length; i++)
				{
					let pos = this.scene3[i].getPos();
					lastPos.push(pos);
					target.push( Vec.of(pos[0],-delta_y,pos[2]) );
				}
			}

			if (this.betweenBeats(242,296))
			{
				if (this.isPeak(bass-prevBass, this.playtime-prevTime))
				{
					lastPos = [];
					target = [];
					for (let i = 0; i < this.scene3.length; i++)
					{
						let pos = this.scene3[i].getPos();
						lastPos.push( pos );
						target.push( Vec.of(pos[0],-delta_y,pos[2]) );
					}
					s3_peak = true;
					peakTime = this.playtime;
				}
			}

			if ( ( this.betweenBeats(217,218) || this.betweenBeats(221,222) || this.betweenBeats(233,234) || this.betweenBeats(240,241) || this.betweenBeats(241,242) ) ||
				 (s3_peak && this.playtime - peakTime <= secPerBeat) )
			{

				this.scene3.forEach(ball => ball.setc(-1));
				this.scene3.forEach(ball => ball.setpotpos(ball.getPos()));
			 	for( let i = 0; i < this.scene3.length; i ++)
				{
					col5(this.scene3, this.scene3[i], i), delta_x, delta_y, z_fwd, z_back;
				}

				this.scene3.forEach(ball => ball.setPos(ball.getpotpos()));
				for (let i = 0; i < this.scene3.length; i++)
				{
					this.scene3[i].setPos( this.lerp( this.lerp(this.scene3[i].getPos(),target[i]), this.lerp(target[i],Vec.of( lastPos[i][0],delta_y-2,lastPos[i][2] ) ) ) );
				}
			} else
				s3_peak = false;

			this.movSpheres( this.scene3 );
			this.scene3.forEach( ball => ball.draw( context, program_state,
													model_transform.times( Mat4.translation( ball.getPos() ) )
																   .times( Mat4.scale(initScale) )
																   .times( Mat4.scale( Vec.of(ball.getRadius(),ball.getRadius(),ball.getRadius()) ) ),
													this.materials.plastic.override( Color.of(0,0,0,1) ) ) );
		}

		// Scene 4 (ending)
		else if (this.betweenBeats(296,326))
		{
			var ballScale;

			if (!this.isPlaying || bass == 0)
				bassScale = 1.0;
			else
				bassScale = bass/256 *1.0+0.5;
			this.scene4.forEach( ball => ball.setRadius(bassScale) );

			if (this.betweenBeats(296,298))
			{
				ballScale = this.lerpInt( 0,1,296,2 );
			}

			for (let i = 0; i < this.scene4.length; i++)
			{
				let s = this.scene4[i];

				if ( this.betweenBeats(298+((9-i)/2),314+((9-i)/2)) )
				{
					s.setPos( this.lerp( Vec.of(5,0,0), Vec.of(0,0,0), 298+((9-i)/2), 16+((9-i)/2) ) );
					ballScale = this.lerpInt( 1, 0, 298+((9-i)/2), 16+((9-i)/2) );
				}
				else if ( this.betweenBeats(298,298+((9-i)/2)) )
				{
					s.setPos( Vec.of(5,0,0) );
					ballScale = 1;
				} else
					ballScale = 0;

				s.draw( context, program_state,
						model_transform.times( Mat4.rotation( (i+2*this.playtime)*2*Math.PI/this.scene4.length, Vec.of(0,0,1) ) )
					   				   .times( Mat4.translation( s.getPos() ) )
					   				   .times( Mat4.scale( Vec.of(ballScale,ballScale,ballScale) ) )
									   .times( Mat4.scale( Vec.of(s.getRadius(),s.getRadius(),s.getRadius() ) ) ),
						this.materials.plastic.override( Color.of(0,0,0,1) ) );
			}
		}

		// Reload after song done
		else if (this.playtime > secPerBeat * 326)
		{
			this.reload();
		}

		// Default (random motion and colors)
		else if (this.betweenBeats(32.5,69) || this.playtime != delay)
		{
			var scaleDown = 0;
			if ( this.betweenBeats(32.5,33) )
				scaleDown = this.lerpInt( 0, 1, 32.5, 0.5 );
			else if ( this.betweenBeats(65,69) )
				scaleDown = this.lerpInt( 1, 0, 65, 4 );
			else
				scaleDown = 1;

			if (this.betweenBeats(65,69))
				this.movSpheres(this.spheres.array,false);
			else
				this.movSpheres(this.spheres.array, true);

			this.spheres.array.forEach( ball => ball.setRadius(bassScale) );
			this.spheres.array.forEach( ball => ball.draw(context, program_state,
														  model_transform.times( Mat4.translation( ball.getPos() ) )
																		 .times( Mat4.scale( Vec.of(scaleDown,scaleDown,scaleDown) ) )
																		 .times( Mat4.scale( Vec.of(ball.getRadius(),ball.getRadius(),ball.getRadius()) ) ),
														  this.materials.plastic.override( Color.of(0,0,0,1) ) ) );
		}

// * * * * * * * * * * * * * * * * * * * * * * * * * * * * * DRAW SHADOWS * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *

		this.shapes.square.draw(context, program_state, this.floor2, this.materials.backgrnd.override(ceiling_color));
		this.scratchpad_context.drawImage( context.canvas, 0, 0, 256, 256 );
        this.texture.image.src  = this.scratchpad.toDataURL("image/png");
         if( this.skipped_first_frame )
            this.texture.copy_onto_graphics_card( context.context, false );
        this.skipped_first_frame = true;
        context.context.clear( context.context.COLOR_BUFFER_BIT | context.context.DEPTH_BUFFER_BIT);

		if (this.playtime - delay == 0)
            this.shapes.triangle.draw( context, program_state, model_transform.times(Mat4.scale([5,5,5])), this.materials.playbutton );

		// START SHADOWS
				// Scene 1
		if (this.playtime > delay && this.playtime <= secPerBeat * 32.5)
		{
			var scaleDown = 1;

			if (!this.isPlaying || bass == 0)
				bassScale = 1.0;
			else
				bassScale = bass/256 *1.0+0.0;

			this.scene1.forEach( s => s.setRadius(bassScale) );

			if ( this.betweenBeats(4,5) )
			{
				for (let i = 0; i < this.scene1.length; i++)
				{
					if (i % 8 >= 2 && i % 8 <= 5)
						this.scene1[i].setPos( this.lerp( Vec.of(0,0,0), Vec.of(-2,0,0) ) );
					else
						this.scene1[i].setPos( this.lerp( Vec.of(0,0,0), Vec.of(2,0,0) ) );
				}
			}

			if ( this.betweenBeats(8,9) )
			{
				for (let i = 0; i < this.scene1.length; i++)
				{
					if (i % 8 == 0 || i % 8 == 1)
						this.scene1[i].setPos( this.lerp( Vec.of(2,0,0), Vec.of(2,2,0) ) );
					else if (i % 8 == 2 || i % 8 == 3)
						this.scene1[i].setPos( this.lerp( Vec.of(-2,0,0), Vec.of(-2,2,0) ) );
					else if (i % 8 == 4 || i % 8 == 5)
						this.scene1[i].setPos( this.lerp( Vec.of(-2,0,0), Vec.of(-2,-2,0) ) );
					else
						this.scene1[i].setPos( this.lerp( Vec.of(2,0,0), Vec.of(2,-2,0) ) );
				}
			}

			if ( this.betweenBeats(12,13) )
			{
				for (let i = 0; i < this.scene1.length; i+=2)
				{
					if (i % 8 == 0)
						this.scene1[i].setPos( this.lerp( Vec.of(2,2,0), Vec.of(2,0,0) ) );
					else if (i % 8 == 2)
						this.scene1[i].setPos( this.lerp( Vec.of(-2,2,0), Vec.of(0,2,0) ) );
					else if (i % 8 == 4)
						this.scene1[i].setPos( this.lerp( Vec.of(-2,-2,0), Vec.of(-2,0,0) ) );
					else
						this.scene1[i].setPos( this.lerp( Vec.of(2,-2,0), Vec.of(0,-2,0) ) );
				}
			}

			if ( this.betweenBeats(17,18) )
			{
				for (let i = 0; i < this.scene1.length; i++)
				{
					let target = 		Mat4.rotation( i * Math.PI / 4, Vec.of( 0,0,1 ) )
					     		.times( Mat4.translation( Vec.of( 2.5,0,0 ) ) )
						 		.times( Vec.of( 0,0,0,1 ) );
					this.scene1[i].setPos( this.lerp( this.scene1[i].getPos(), target ) );
				}
			}

			if ( this.betweenBeats(19,20) )
			{
				for (let i = 0; i < this.scene1.length/2; i++)
				{
					let target = 		Mat4.rotation( i * Math.PI / 4, Vec.of( 0,0,1 ) )
					     		.times( Mat4.translation( Vec.of( 4.5,0,0 ) ) )
						 		.times( Vec.of( 0,0,0,1 ) );
					this.scene1[i].setPos( this.lerp( this.scene1[i].getPos(), target ) );
				}
			}

			if ( this.betweenBeats(20,21) )
			{
				this.scene1.forEach( s => s.setPos( this.lerp( s.getPos(), Vec.of(0,0,0) ) ) );
			}

			if ( this.betweenBeats(21,22) )
			{
				for (let i = 0; i < this.scene1.length; i++)
				{
					let x = (i < 8) ? 4.5 : 2.5;
					let target = 	Mat4.rotation( i * Math.PI / 4, Vec.of( 0,0,1 ) )
					    	.times( Mat4.translation( Vec.of( x,0,0 ) ) )
				 			.times( Vec.of( 0,0,0,1 ) );
				 	this.scene1[i].setPos( this.lerp( this.scene1[i].getPos(), target ) );
				}
			}

			if (this.betweenBeats(32,32.5))
				scaleDown = this.lerpInt( 1,0,32,0.5 );
			else if (this.betweenBeats(32.5,33))
				scaleDown = 0;

			this.movSpheres(this.scene1, false);

			if ( this.betweenBeats(21,32.5) )
			{
				for (let i = 0; i < this.scene1.length; i++)
				{
					let s = this.scene1[i];
					let dir = (i < this.scene1.length/2) ? 1 : -1;
					s.draw( context, program_state,
							model_transform.times( Mat4.rotation( dir*t, Vec.of(0,0,1) ) )
										   .times( Mat4.translation( s.getPos() ) )
										   .times( Mat4.scale( Vec.of(scaleDown,scaleDown,scaleDown) ) )
							  			   .times( Mat4.scale( Vec.of(s.getRadius(),s.getRadius(),s.getRadius()) ) ),
				   		    this.materials.b.override( s.getColor() ) );
				}
			} else
			{
				this.scene1.forEach( s => s.draw( context, program_state,
									 model_transform.times( Mat4.translation( s.getPos() ) )
													.times( Mat4.scale( Vec.of(scaleDown,scaleDown,scaleDown) ) )
													.times( Mat4.scale( Vec.of(s.getRadius(),s.getRadius(),s.getRadius()) ) ),
									 this.materials.b.override( s.getColor() ) ) );
			}

		}

		// Scene 2
		else if ( this.betweenBeats(69,168) )
		{
			if (!this.isPlaying || bass == 0)
				bassScale = 0.75;
			else
				bassScale = bass/256 *0.5+0.5;

			if (!this.isPlaying || treble == 0)
				trebScale = 2.5;
			else
				trebScale = treble/256 *3.0+2.5;

			this.scene2.forEach( s => s.setRadius(bassScale) );

			var initScale;
			if ( this.betweenBeats(69,72) )
			{
				for (let i = 0; i < this.scene2.length; i++)
				{
					let tmpColor = this.scene2[i].getColor();
					initScale = this.lerp( Vec.of(0,0,0), Vec.of(1,1,1), 69, 3 );
					this.scene2[i].setColor( Color.of( tmpColor[0],tmpColor[1],tmpColor[2],this.lerpInt( 0, 1, 69, 3 ) ) );
				}
			} else if ( this.betweenBeats(165,168) )
			{
				initScale = this.lerp( Vec.of(1,1,1), Vec.of(0,0,0), 165, 3 );
			} else
			{
				initScale = Vec.of(1,1,1);
			}

			// pass 1
			if ( this.betweenBeats(73,165) )
			{
				var note;
				switch ( Math.floor( this.playtime / secPerBeat ) )
				{
					case 85: case 86: case 101: case 102:
						note = 0;
						break;
					case 87: case 103:
						note = 1;
						break;
					case 84: case 100:
						note = 2;
						break;
					case 89: case 93:
						note = 4;
						break;
					case 83: case 88: case 99: case 104:
						note = 5;
						break;
					case 77: case 78: case 82: case 94: case 98:
						note = 7;
						break;
					case 79: case 95:
						note = 8;
						break;
					case 81: case 97:
						note = 9;
						break;
					case 75: case 91: case 96:
						note = 10;
						break;
					case 73: case 74: case 76: case 80: case 90: case 92:
						note = 11;
						break;
					default:
						note = -1;
				}

				this.scene2_bounce(note);
			}

			// pass 2,3
			if ( this.betweenBeats(105,165) )
			{
				var eighth;
				switch ( Math.floor( this.playtime * 2 / secPerBeat ) / 2 )
				{
					case 117: case 119: case 133:
					case 149: case 151:
						eighth = 4;
						break;
					case 118: case 150:
						eighth = 6;
						break;
					case 114: case 120: case 130: case 134:
					case 146: case 152: case 162:
						eighth = 7;
						break;
					case 111: case 127: case 143: case 159:
						eighth = 8;
						break;
					case 113: case 115: case 116: case 129: case 131: case 132:
					case 145: case 147: case 148: case 161: case 163: case 164:
						eighth = 9;
						break;
					case 135:
						eighth = 10;
						break;
					case 105: case 106: case 107: case 108: case 109: case 110: case 112:
					case 121: case 122: case 123: case 124: case 125: case 126: case 128:
					case 137: case 138: case 139: case 140: case 141: case 142: case 144:
					case 153: case 154: case 155: case 156: case 157: case 158: case 160:
						eighth = 11;
						break;
					case 136:
						eighth = 12;
						break;

					case 118.5: case 150.5:
						eighth = 5;
						break;
					case 112.5: case 117.5: case 128.5:
					case 144.5: case 149.5: case 160.5:
						eighth = 7;
						break;
					case 116.5: case 132.5: case 133.5: case 148.5: case 164.5:
						eighth = 8;
						break;
					case 110.5: case 120.5: case 126.5: case 135.5:
					case 142.5: case 152.5: case 158.5: case 167.5:
						eighth = 9;
						break;
					case 115.5: case 131.5: case 136.5: case 147.5: case 163.5:
						eighth = 10;
						break;
					case 134.5:
						eighth = 11;
						break;
					case 107.5: case 109.5: case 123.5: case 125.5:
					case 139.5: case 141.5: case 155.5: case 157.5:
						eighth = 12;
						break;
					default:
						eighth = -1;
				}

				this.scene2_bounce(eighth);
			}

			for (let i = 0; i < this.scene2.length-1; i++)
			{
				let s = this.scene2[i];
				s.draw( context, program_state,
						model_transform.times( Mat4.translation( Vec.of(0,-1.75,0) ) )
									   .times( Mat4.rotation( (i-1.5) * -4/3*Math.PI/(this.scene2.length-2), Vec.of(0,0,1) ) )
									   .times( Mat4.translation( s.getPos() ) )
									   .times( Mat4.scale( initScale ) )
									   .times( Mat4.scale( Vec.of(s.getRadius(),s.getRadius(),s.getRadius()) ) ),
						this.materials.b.override( s.getColor() ) );
			}
			let bigBall = this.scene2[this.scene2.length-1];
			bigBall.draw( context, program_state,
						  model_transform.times( Mat4.translation( bigBall.getPos() ) )
						  				 .times( Mat4.scale( initScale ) )
						  				 .times( Mat4.scale( Vec.of(trebScale, trebScale, trebScale) ) ),
						  this.materials.b.override( this.s2_color ) );
		}

		// Scene 3 (random motion + bass drops)
		else if (this.betweenBeats(168,296))
		{
			var initScale;
			if (this.betweenBeats(168,169))
				initScale = this.lerp( Vec.of(0,0,0), Vec.of(1,1,1) );
			else if (this.betweenBeats(293,296))
				initScale = this.lerp( Vec.of(1,1,1), Vec.of(0,0,0), 293, 3 );
			else
				initScale = Vec.of(1,1,1);

			if (!this.isPlaying || bass == 0)
				bassScale = 1.0;
			else
				bassScale = bass/256 *1.0+0.5;
			this.scene3.forEach( ball => ball.setRadius(bassScale) );

			if ( this.betweenBeats(217,218) || this.betweenBeats(221,222) || this.betweenBeats(233,234) || this.betweenBeats(240,241) || this.betweenBeats(241,242) )
			{
				lastPos = [];
				target = [];
				for (let i = 0; i < this.scene3.length; i++)
				{
					let pos = this.scene3[i].getPos();
					lastPos.push(pos);
					target.push( Vec.of(pos[0],-delta_y,pos[2]) );
				}
			}

			if (this.betweenBeats(242,296))
			{
				if (this.isPeak(bass-prevBass, this.playtime-prevTime))
				{
					lastPos = [];
					target = [];
					for (let i = 0; i < this.scene3.length; i++)
					{
						let pos = this.scene3[i].getPos();
						lastPos.push( pos );
						target.push( Vec.of(pos[0],-delta_y,pos[2]) );
					}
					s3_peak = true;
					peakTime = this.playtime;
				}
			}

			if ( ( this.betweenBeats(217,218) || this.betweenBeats(221,222) || this.betweenBeats(233,234) || this.betweenBeats(240,241) || this.betweenBeats(241,242) ) ||
				 (s3_peak && this.playtime - peakTime <= secPerBeat) )
			{
				this.scene3.forEach(ball => ball.setc(-1));
				this.scene3.forEach(ball => ball.setpotpos(ball.getPos()));
			 	for( let i = 0; i < this.scene3.length; i ++)
				{
					col5(this.scene3, this.scene3[i], i), delta_x, delta_y, z_fwd, z_back;
				}

				this.scene3.forEach(ball => ball.setPos(ball.getpotpos()));
				

				for (let i = 0; i < this.scene3.length; i++)
				{
					this.scene3[i].setPos( this.lerp( this.lerp(this.scene3[i].getPos(),target[i]), this.lerp(target[i],Vec.of( lastPos[i][0],delta_y-2,lastPos[i][2] ) ) ) );
				}
			} else
				s3_peak = false;

			this.movSpheres( this.scene3 );
			this.scene3.forEach( ball => ball.draw( context, program_state,
													model_transform.times( Mat4.translation( ball.getPos() ) )
																   .times( Mat4.scale(initScale) )
																   .times( Mat4.scale( Vec.of(ball.getRadius(),ball.getRadius(),ball.getRadius()) ) ),
													this.materials.b.override( ball.getColor() ) ) );
		}

		// Scene 4 (ending)
		else if (this.betweenBeats(296,326))
		{
			var ballScale;

			if (!this.isPlaying || bass == 0)
				bassScale = 1.0;
			else
				bassScale = bass/256 *1.0+0.5;
			this.scene4.forEach( ball => ball.setRadius(bassScale) );

			if (this.betweenBeats(296,298))
			{
				ballScale = this.lerpInt( 0,1,296,2 );
			}

			for (let i = 0; i < this.scene4.length; i++)
			{
				let s = this.scene4[i];

				if ( this.betweenBeats(298+((9-i)/2),314+((9-i)/2)) )
				{
					s.setPos( this.lerp( Vec.of(5,0,0), Vec.of(0,0,0), 298+((9-i)/2), 16+((9-i)/2) ) );
					ballScale = this.lerpInt( 1, 0, 298+((9-i)/2), 16+((9-i)/2) );
				}
				else if ( this.betweenBeats(298,298+((9-i)/2)) )
				{
					s.setPos( Vec.of(5,0,0) );
					ballScale = 1;
				} else
					ballScale = 0;

				s.draw( context, program_state,
						model_transform.times( Mat4.rotation( (i+2*this.playtime)*2*Math.PI/this.scene4.length, Vec.of(0,0,1) ) )
					   				   .times( Mat4.translation( s.getPos() ) )
					   				   .times( Mat4.scale( Vec.of(ballScale,ballScale,ballScale) ) )
									   .times( Mat4.scale( Vec.of(s.getRadius(),s.getRadius(),s.getRadius() ) ) ),
						this.materials.b.override( s.getColor() ) );
			}
		}

		// Reload after song done
		else if (this.playtime > secPerBeat * 326)
		{
			this.reload();
		}

		// Default (random motion and colors)
		else if (this.betweenBeats(32.5,69) || this.playtime != delay)
		{
			var scaleDown = 0;
			if ( this.betweenBeats(32.5,33) )
				scaleDown = this.lerpInt( 0, 1, 32.5, 0.5 );
			else if ( this.betweenBeats(65,69) )
				scaleDown = this.lerpInt( 1, 0, 65, 4 );
			else
				scaleDown = 1;

			if (this.betweenBeats(65,69))
				this.movSpheres(this.spheres.array,program_state.animation_time, false);
			else
				this.movSpheres(this.spheres.array, program_state.animation_time, true);

			this.spheres.array.forEach( ball => ball.setRadius(bassScale) );
			this.spheres.array.forEach( ball => ball.draw(context, program_state,
														  model_transform.times( Mat4.translation( ball.getPos() ) )
																		 .times( Mat4.scale( Vec.of(scaleDown,scaleDown,scaleDown) ) )
																		 .times( Mat4.scale( Vec.of(ball.getRadius(),ball.getRadius(),ball.getRadius()) ) ),
														  this.materials.b.override( ball.getColor() ) ) );
		}
		// END SHADOWS

        var backScale;
		var floorScale;
		var ceilingScale;
		var wallScale;

		if (this.betweenBeats(0,9))
			backScale = Vec.of(3.5,3,1);
		else if (this.betweenBeats(9,11))
			backScale = this.lerp(Vec.of(3,3,1), Vec.of(1,1,1), 9, 2);
		else if (this.betweenBeats(11,322))
			backScale = Vec.of(1,1,1);
		else if (this.betweenBeats(322,325))
			backScale = this.lerp(Vec.of(1,1,1), Vec.of(0,0,0), 322, 3);
		else
			backScale = Vec.of(0,0,0);

		if (this.betweenBeats(12.5,13))
			floorScale = this.lerp(Vec.of(0,0,0), Vec.of(1,1,1), 12.5, 0.5);
		else if (this.betweenBeats(13,318))
			floorScale = Vec.of(1,1,1);
		else if (this.betweenBeats(318,319))
			floorScale = this.lerp(Vec.of(1,1,1), Vec.of(0,0,0));
		else
			floorScale = Vec.of(0,0,0);

		if (this.betweenBeats(13.5,14))
			ceilingScale = this.lerp(Vec.of(0,0,0), Vec.of(1,1,1), 13.5, 0.5);
		else if (this.betweenBeats(14,319))
			ceilingScale = Vec.of(1,1,1);
		else if (this.betweenBeats(319,320))
			ceilingScale = this.lerp(Vec.of(1,1,1), Vec.of(0,0,0));
		else
			ceilingScale = Vec.of(0,0,0);

		if (this.betweenBeats(14.5,15))
			wallScale = this.lerp(Vec.of(0,0,0), Vec.of(1,1,1), 14.5, 0.5);
		else if (this.betweenBeats(15,320))
			wallScale = Vec.of(1,1,1);
		else if (this.betweenBeats(320,322))
			wallScale = this.lerp(Vec.of(1,1,1), Vec.of(0,0,0), 320, 2);
		else
			wallScale = Vec.of(0,0,0);

		// Background and Walls
		if (this.playtime > delay)
			this.shapes.square.draw(context, program_state, this.backplane.times(Mat4.scale(backScale)), this.materials.a);
		if (this.playtime >= secPerBeat * 12.5)
			this.shapes.box.draw( context, program_state, this.floor.times(Mat4.scale(floorScale)), this.materials.c );
		if (this.playtime >= secPerBeat * 13.5)
			this.shapes.box.draw( context, program_state, this.ceiling.times(Mat4.scale(ceilingScale)), this.materials.backgrnd.override(ceiling_color));
		if (this.playtime >= secPerBeat * 14.5)
		{
			this.shapes.box.draw( context, program_state, this.left_wall.times(Mat4.scale(wallScale)), this.materials.l_wall_material );
			this.shapes.box.draw( context, program_state, this.right_wall.times(Mat4.scale(wallScale)), this.materials.r_wall_material );
		}

		prevBass = bass;
		prevTreble = treble;
		prevTime = this.playtime;

		GlobalScene = this;
		GlobalProgramState = program_state;
    }

    sphere_interact(mouseLoc)
    {
		if ( !sphere_click( mouseLoc, GlobalProgramState ) )
    	{
			let color = Color.of( Math.round(Math.random()*2)/2, Math.round(Math.random()*2)/2, Math.round(Math.random()*2)/2, 1 );
			if (GlobalScene.playtime > delay && GlobalScene.playtime <= secPerBeat * 32.5)
				GlobalScene.scene1.forEach( ball => { ball.setColor(color) } );
			else if (GlobalScene.betweenBeats(69,169))
				GlobalScene.s2_color = color;
			else if (GlobalScene.betweenBeats(169,296))
				GlobalScene.scene3.forEach( ball => { ball.setColor(color) } );
			else if (GlobalScene.betweenBeats(296,326))
				GlobalScene.scene4.forEach( ball => { ball.setColor(color) } );
			else
				GlobalScene.spheres.array.forEach( ball => { ball.setColor(color) } );
    	}
    }

	isPeak(val_diff, time_diff)
	{
		const val_thresh = 25;
		const time_thresh = secPerBeat * 1.4;
		if (val_diff > 0)
		{
			bassDiff += val_diff;
			if (bassDiff > val_thresh)
			{
				if (timeBtwn > time_thresh)
				{
					timeBtwn = 0;
					return true;
				}
			}
		} else
		{
			bassDiff = 0;
		}
		timeBtwn += time_diff;
		return false;
	}

    lerp(p1, p2, start=1, numBeats=1)	// p1: start Vec, p2: end Vec, start: starting beat number, numBeats: how many beats to move for
	{
		let offset = ( start % numBeats ) * secPerBeat;
		let duration = secPerBeat * numBeats;
		let t = ( (this.playtime - offset) % duration ) / duration;
		return ( p1.times( 1-t ) ).plus( ( p2.times( t ) ) );
	}

	lerpInt(num1, num2, start=1, numBeats=1)
	{
		let offset = ( start % numBeats ) * secPerBeat;
		let duration = secPerBeat * numBeats;
		let t = ( (this.playtime - offset) % duration ) / duration;
		return ( num1 * ( 1-t ) ) + ( num2 * t );
	}
}

export const sphere_interact = Main_Scene.prototype.sphere_interact;

function getTreble()
{
    var freqPerBin = audiocontext.sampleRate / analyser.fftSize;
    var start = Math.floor(3000/freqPerBin);
    var values = 0;
    var average;

    for (var i = start; i < frequency_array.length ; i ++)
    {
      values += frequency_array[i];
    }
    average = values/ (frequency_array.length - start);
    return average;
}

function getBass()
{
    var freqPerBin = audiocontext.sampleRate / analyser.fftSize;
    var maxFreq = 250;
    var length = maxFreq / freqPerBin;
    var values = 0;
    var average;
    for (var i = 0; i < length; i ++)
    {
      values += frequency_array[i];
    }
    average = values/length;
    return average;
}

// gets closest ray-sphere intersection based on location of mouse click
function sphere_click(mouseLoc, program_state)
{
    const x = mouseLoc[0], y = mouseLoc[1];

    let newX = (2. * x) / 1080. - 1.;
    let newY = 1. - (2. * y) / 600.;
    let ray_clip = Vec.of( newX, newY, -1., 1. );
    let ray_eye = Mat4.inverse( program_state.projection_transform ).times( ray_clip );
    ray_eye = Vec.of( ray_eye[0], ray_eye[1], -1., 0. );
    let ray_wor = program_state.camera_inverse.times( ray_eye );
    ray_wor = Vec.of( ray_wor[0], ray_wor[1], ray_wor[2] ).normalized();

    let index = getClosestSphere(ray_wor);
    if (index != -1)
    {
        let randColor = Color.of(Math.round(Math.random()*2)/2,Math.round(Math.random()*2)/2,Math.round(Math.random()*2)/2,1);
        if ( (GlobalScene.playtime > delay && GlobalScene.playtime <= secPerBeat * 32.5) ||
           ( GlobalScene.betweenBeats(69,169) ) || ( GlobalScene.betweenBeats(296,326) ) )
        	return false;
        else if (GlobalScene.betweenBeats(169,296))
        	GlobalScene.scene3[index].setColor( randColor );
        else
        	GlobalScene.spheres.array[index].setColor( randColor );
        return true;
    }
    return false;
}

function getClosestSphere(norm)
{
    let sphere_hits = [];
    var array;
    if (GlobalScene.playtime > delay && GlobalScene.playtime <= secPerBeat * 32.5)
    	array = GlobalScene.scene1;
	else if (GlobalScene.betweenBeats(69,169))
		array = GlobalScene.scene2;
	else if (GlobalScene.betweenBeats(169,296))
		array = GlobalScene.scene3;
	else if (GlobalScene.betweenBeats(296,326))
		array = GlobalScene.scene4;
	else
		array = GlobalScene.spheres.array;

    for (let i = 0; i < array.length; i++)
    {
        let pos = array[i].getPos();
        let origin = Vec.of( 0., 0., 20. );
        let radius = array[i].getRadius();
        let tmp = origin.minus(pos);
        let b = norm.dot( tmp );
        let c = (origin.minus(pos)).dot(origin.minus(pos)) - radius**2;
        let discr = b * b - c;

        if (discr < 0)
            sphere_hits.push(Number.MAX_VALUE);
        else
            sphere_hits.push( Math.min(-b + Math.sqrt(discr), -b - Math.sqrt(discr) ) );
    }
    let min = Math.min( ...sphere_hits );
    return min != Number.MAX_VALUE ? sphere_hits.indexOf(min) : -1;
}

const Additional_Scenes = [];

export { Main_Scene, Additional_Scenes, Canvas_Widget, Code_Widget, Text_Widget, defs }


const Camera_Teleporter = defs.Camera_Teleporter =
class Camera_Teleporter extends Scene
{                               // **Camera_Teleporter** is a helper Scene meant to be added as a child to
                                // your own Scene.  It adds a panel of buttons.  Any matrices externally
                                // added to its "this.cameras" can be selected with these buttons. Upon
                                // selection, the program_state's camera matrix slowly (smoothly)
                                // linearly interpolates itself until it matches the selected matrix.
  constructor()
    { super();
      this.cameras = [];
      this.selection = 0;
    }
  make_control_panel()
    {                                // make_control_panel(): Sets up a panel of interactive HTML elements, including
                                     // buttons with key bindings for affecting this scene, and live info readouts.

      this.key_triggered_button(  "Enable",       [ "e" ], () => this.enabled = true  );
      this.key_triggered_button( "Disable", [ "Shift", "E" ], () => this.enabled = false );
      this.new_line();
      this.key_triggered_button( "Previous location", [ "g" ], this.decrease );
      this.key_triggered_button(              "Next", [ "h" ], this.increase );
      this.new_line();
      this.live_string( box => { box.textContent = "Selected camera location: " + this.selection } );
    }
  increase() { this.selection = Math.min( this.selection + 1, Math.max( this.cameras.length-1, 0 ) ); }
  decrease() { this.selection = Math.max( this.selection - 1, 0 ); }   // Don't allow selection of negative indices.
  display( context, program_state )
  {
    const desired_camera = this.cameras[ this.selection ];
    if( !desired_camera || !this.enabled )
      return;
    const dt = program_state.animation_delta_time;
    program_state.set_camera( desired_camera.map( (x,i) => Vec.from( program_state.camera_inverse[i] ).mix( x, .01*dt ) ) );
  }
}


const Planar_Star = defs.Planar_Star =
class Planar_Star extends Shape
{                                 // **Planar_Star** defines a 2D five-pointed star shape.  The star's inner
                                  // radius is 4, and its outer radius is 7.  This means the complete star
                                  // fits inside a 14 by 14 sqaure, and is centered at the origin.
  constructor()
    { super( "position", "normal", "texture_coord" );

      this.arrays.position.push( Vec.of( 0,0,0 ) );
      for( let i = 0; i < 11; i++ )
        {
          const spin = Mat4.rotation( i * 2*Math.PI/10, Vec.of( 0,0,-1 ) );

          const radius = i%2 ? 4 : 7;
          const new_point = spin.times( Vec.of( 0,radius,0,1 ) ).to3();

          this.arrays.position.push( new_point );
          if( i > 0 )
            this.indices.push( 0, i, i+1 )
        }

      this.arrays.normal        = this.arrays.position.map( p => Vec.of( 0,0,-1 ) );

                                      // TODO (#5a):  Fill in some reasonable texture coordinates for the star:
      this.arrays.texture_coord = this.arrays.position.map( p => { let test = p.times(1/14).plus(Vec.of(0.5,0.5,0));
                                                                   return Vec.of(test[0], test[1]) } );
    }
}

const Gouraud_Shader = defs.Gouraud_Shader =
class Gouraud_Shader extends defs.Phong_Shader
{
  shared_glsl_code()           // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
    {
                          // TODO (#6b2.1):  Copy the Phong_Shader class's implementation of this function, but
                          // change the two "varying" vec3s declared in it to just one vec4, called color.
                          // REMEMBER:
                          // **Varying variables** are passed on from the finished vertex shader to the fragment
                          // shader.  A different value of a "varying" is produced for every single vertex
                          // in your array.  Three vertices make each triangle, producing three distinct answers
                          // of what the varying's value should be.  Each triangle produces fragments (pixels),
                          // and the per-fragment shader then runs.  Each fragment that looks up a varying
                          // variable will pull its value from the weighted average of the varying's value
                          // from the three vertices of its triangle, weighted according to how close the
                          // fragment is to each extreme corner point (vertex).

      return ` precision mediump float;
        const int N_LIGHTS = ` + this.num_lights + `;
        uniform float ambient, diffusivity, specularity, smoothness;
        uniform vec4 light_positions_or_vectors[N_LIGHTS], light_colors[N_LIGHTS];
        uniform float light_attenuation_factors[N_LIGHTS];
        uniform vec4 shape_color;
        uniform vec3 squared_scale, camera_center;

                              // Specifier "varying" means a variable's final value will be passed from the vertex shader
                              // on to the next phase (fragment shader), then interpolated per-fragment, weighted by the
                              // pixel fragment's proximity to each of the 3 vertices (barycentric interpolation).
        //varying vec3 N, vertex_worldspace;
        varying vec4 color;
                                             // ***** PHONG SHADING HAPPENS HERE: *****
        vec3 phong_model_lights( vec3 N, vec3 vertex_worldspace )
          {                                        // phong_model_lights():  Add up the lights' contributions.
            vec3 E = normalize( camera_center - vertex_worldspace );
            vec3 result = vec3( 0.0 );
            for(int i = 0; i < N_LIGHTS; i++)
              {
                            // Lights store homogeneous coords - either a position or vector.  If w is 0, the
                            // light will appear directional (uniform direction from all points), and we
                            // simply obtain a vector towards the light by directly using the stored value.
                            // Otherwise if w is 1 it will appear as a point light -- compute the vector to
                            // the point light's location from the current surface point.  In either case,
                            // fade (attenuate) the light as the vector needed to reach it gets longer.
                vec3 surface_to_light_vector = light_positions_or_vectors[i].xyz -
                                               light_positions_or_vectors[i].w * vertex_worldspace;
                float distance_to_light = length( surface_to_light_vector );

                vec3 L = normalize( surface_to_light_vector );
                vec3 H = normalize( L + E );
                                                  // Compute the diffuse and specular components from the Phong
                                                  // Reflection Model, using Blinn's "halfway vector" method:
                float diffuse  =      max( dot( N, L ), 0.0 );
                float specular = pow( max( dot( N, H ), 0.0 ), smoothness );
                float attenuation = 1.0 / (1.0 + light_attenuation_factors[i] * distance_to_light * distance_to_light );


                vec3 light_contribution = shape_color.xyz * light_colors[i].xyz * diffusivity * diffuse
                                                          + light_colors[i].xyz * specularity * specular;

                result += attenuation * light_contribution;
              }
            return result;
          } ` ;
    }
  vertex_glsl_code()           // ********* VERTEX SHADER *********
    {
                                          // TODO (#6b2.2):  Copy the Phong_Shader class's implementation of this function,
                                          // but declare N and vertex_worldspace as vec3s local to function main,
                                          // since they are no longer scoped as varyings.  Then, copy over the
                                          // fragment shader code to the end of main() here.  Computing the Phong
                                          // color here instead of in the fragment shader is called Gouraud
                                          // Shading.
                                          // Modify any lines that assign to gl_FragColor, to assign them to "color",
                                          // the varying you made, instead.  You cannot assign to gl_FragColor from
                                          // within the vertex shader (because it is a special variable for final
                                          // fragment shader color), but you can assign to varyings that will be
                                          // sent as outputs to the fragment shader.

      return this.shared_glsl_code() + `
        attribute vec3 position, normal;                            // Position is expressed in object coordinates.

        uniform mat4 model_transform;
        uniform mat4 projection_camera_model_transform;

        void main()
          {                                                                   // The vertex's final resting place (in NDCS):
            vec3 N, vertex_worldspace;

            gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
                                                                              // The final normal vector in screen space.
            N = normalize( mat3( model_transform ) * normal / squared_scale);

            vertex_worldspace = ( model_transform * vec4( position, 1.0 ) ).xyz;

                                                                      // Compute an initial (ambient) color:
            color = vec4( shape_color.xyz * ambient, shape_color.w );
                                                                     // Compute the final color with contributions from lights:
            color.xyz += phong_model_lights( normalize( N ), vertex_worldspace );
          } ` ;
    }
  fragment_glsl_code()         // ********* FRAGMENT SHADER *********
    {                          // A fragment is a pixel that's overlapped by the current triangle.
                               // Fragments affect the final image or get discarded due to depth.

                               // TODO (#6b2.3):  Leave the main function almost blank, except assign gl_FragColor to
                               // just equal "color", the varying you made earlier.
      return this.shared_glsl_code() + `
        void main()
          {
            gl_FragColor = color;
          } ` ;
    }
}


const Black_Hole_Shader = defs.Black_Hole_Shader =
class Black_Hole_Shader extends Shader         // Simple "procedural" texture shader, with texture coordinates but without an input image.
{ update_GPU( context, gpu_addresses, program_state, model_transform, material )
      {
                  // update_GPU(): Define how to synchronize our JavaScript's variables to the GPU's.  This is where the shader
                  // recieves ALL of its inputs.  Every value the GPU wants is divided into two categories:  Values that belong
                  // to individual objects being drawn (which we call "Material") and values belonging to the whole scene or
                  // program (which we call the "Program_State").  Send both a material and a program state to the shaders
                  // within this function, one data field at a time, to fully initialize the shader for a draw.

                  // TODO (#EC 1b):  Send the GPU the only matrix it will need for this shader:  The product of the projection,
                  // camera, and model matrices.  The former two are found in program_state; the latter is directly
                  // available here.  Finally, pass in the animation_time from program_state. You don't need to allow
                  // custom materials for this part so you don't need any values from the material object.
                  // For an example of how to send variables to the GPU, check out the simple shader "Funny_Shader".

        const [ P, C, M ] = [ program_state.projection_transform, program_state.camera_inverse, model_transform ],
                      PCM = P.times( C ).times( M );
        context.uniformMatrix4fv( gpu_addresses.projection_camera_model_transform, false, Mat.flatten_2D_to_1D( PCM.transposed() ) );
        context.uniform1f ( gpu_addresses.animation_time, program_state.animation_time / 1000 );
      }
  shared_glsl_code()            // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
    {
                  // TODO (#EC 1c):  For both shaders, declare a varying vec2 to pass a texture coordinate between
                  // your shaders.  Also make sure both shaders have an animation_time input (a uniform).
      return `precision mediump float;
              varying vec2 f_tex_coord;
      `;
    }
  vertex_glsl_code()           // ********* VERTEX SHADER *********
    {
                          // TODO (#EC 1d,e):  Create the final "gl_Position" value of each vertex based on a displacement
                          // function.  Also pass your texture coordinate to the next shader.  As inputs,
                          // you have the current vertex's stored position and texture coord, animation time,
                          // and the final product of the projection, camera, and model matrices.
      return this.shared_glsl_code() + `
        attribute vec3 position;
        attribute vec2 texture_coord;
        uniform mat4 projection_camera_model_transform;
        uniform float animation_time;

        void main()
        {
            float t = animation_time, v = texture_coord.y;

            float rate = mod( 5.*t - 40.*v, radians(360.) );
            float sinFunc = 1. + 0.05 * sin( rate );

            gl_Position = projection_camera_model_transform * vec4( position * sinFunc, 1.0 );
            f_tex_coord = texture_coord;
        }`;
    }
  fragment_glsl_code()           // ********* FRAGMENT SHADER *********
    {
                          // TODO (#EC 1f):  Using the input UV texture coordinates and animation time,
                          // calculate a color that makes moving waves as V increases.  Store
                          // the result in gl_FragColor.
      return this.shared_glsl_code() + `
        uniform float animation_time;

        void main()
        {
            float t = animation_time, v = f_tex_coord.y;
            float rate = mod( 5.*t - 40.*v, radians(360.) );
            float sinFunc = sin( rate );

            gl_FragColor = vec4(sinFunc, 0, 0, 1);
        }`;
    }
}


const Ball_Noise_Shader = defs.Ball_Noise_Shader =
class Ball_Noise_Shader extends Shader
{ update_GPU( context, gpu_addresses, program_state, model_transform, material )
    {
        const [ P, C, M ] = [ program_state.projection_transform, program_state.camera_inverse, model_transform ],
                      PCM = P.times( C ).times( M );
        context.uniformMatrix4fv( gpu_addresses.projection_camera_model_transform, false, Mat.flatten_2D_to_1D( PCM.transposed() ) );
        context.uniform1f ( gpu_addresses.animation_time, program_state.animation_time / 1000 );
        context.uniform4fv( gpu_addresses.shape_color, material.color );
    }

  shared_glsl_code()
    { return `precision mediump float;
              varying float disp;
      `;
    }
  vertex_glsl_code()
    { return this.shared_glsl_code() + `
        uniform mat4 projection_camera_model_transform;

        attribute vec3 position;
        attribute vec3 normal;

        varying float noise;
        uniform float animation_time;


        vec3 hash3_3(vec3 p3) {
	p3 = fract(p3 * vec3(.1031, .11369, .13787));
    p3 += dot(p3, p3.yxz + 19.19);
    vec3 random3 = fract(vec3((p3.x + p3.y) * p3.z, (p3.x+p3.z) * p3.y, (p3.y+p3.z) * p3.x));
    return normalize(-1. + 2. * random3);
}

        float cnoise(vec3 p)
        {
          vec3 pi = floor(p);
   		 vec3 pf = p - pi;
   		 vec3 pf3 = pf * pf * pf;
   		 vec3 pf4 = pf3 * pf;
   		 vec3 pf5 = pf4 * pf;
   		 vec3 w = 6. * pf5 - 15. * pf4 + 10. * pf3;

    return mix(
    	mix(
            mix(dot(pf - vec3(0, 0, 0), hash3_3(pi + vec3(0, 0, 0))), dot(pf - vec3(1, 0, 0), hash3_3(pi + vec3(1, 0, 0))), w.x),
            mix( dot(pf - vec3(0, 0, 1), hash3_3(pi + vec3(0, 0, 1))), dot(pf - vec3(1, 0, 1), hash3_3(pi + vec3(1, 0, 1))),w.x),w.z),
        mix( mix(dot(pf - vec3(0, 1, 0), hash3_3(pi + vec3(0, 1, 0))), dot(pf - vec3(1, 1, 0), hash3_3(pi + vec3(1, 1, 0))),w.x),
            mix(dot(pf - vec3(0, 1, 1), hash3_3(pi + vec3(0, 1, 1))), dot(pf - vec3(1, 1, 1), hash3_3(pi + vec3(1, 1, 1))),w.x),w.z),w.y);
        }

        float turbulence( vec3 p ) {
            float t = -0.5;
            for (float f = 1.0 ; f <= 10.0 ; f++ ){
                float power = pow( 2.0, f );
                t += abs( cnoise( vec3( power * p ) ) / power );
            }
            return t;
        }

        void main()
        {
            float pulseHeight = 0.0;
            float displacementHeight = 0.65;
            float turbulenceDetail = 0.4;


            noise = -0.8 * turbulence( turbulenceDetail * normal + ( animation_time * 1.0 ) );

            float b = pulseHeight * cnoise(
                0.05 * position + vec3( 1.0 * animation_time )
            );
            float displacement = ( 0.0 - displacementHeight ) * noise + b;

            gl_Position = projection_camera_model_transform * vec4( position, 1.0 );

            disp = displacement * 15.;
        }`;
    }
  fragment_glsl_code()
    { return this.shared_glsl_code() + `
        uniform vec4 shape_color;

        void main()
        {
            vec3 a = vec3(0.5,0.5,0.5);
    		vec3 b = vec3(0.5,0.5,0.5);
    		vec3 c = vec3(1.0,1.0,1.0);
    		vec3 d = vec3(0.0,0.33,0.67);
    		vec3 color = a + b*abs(tan( 6.28318*(c*disp+d) ));
            gl_FragColor = vec4( color.rgb, 1.0 );
            gl_FragColor *= shape_color;
        } ` ;
    }
}
const L_Wall_Shader = defs.L_Wall_Shader =
class L_Wall_Shader extends Shader
{ update_GPU( context, gpu_addresses, program_state, model_transform, material )
      {

        const [ P, C, M ] = [ program_state.projection_transform, program_state.camera_inverse, model_transform ],
                      PCM = P.times( C ).times( M );
        context.uniformMatrix4fv( gpu_addresses.projection_camera_model_transform, false, Mat.flatten_2D_to_1D( PCM.transposed() ) );
        context.uniform1f ( gpu_addresses.animation_time, program_state.animation_time / 1000 );
      }
  shared_glsl_code()
    {
      return `precision mediump float;
              varying vec2 f_tex_coord;
      `;
    }
  vertex_glsl_code()
    {
      return this.shared_glsl_code() + `
        attribute vec3 position;
        attribute vec2 texture_coord;
        uniform mat4 projection_camera_model_transform;


        void main()
        {

            gl_Position = projection_camera_model_transform * vec4( position , 1.0 );
            f_tex_coord = texture_coord;
        }`;
    }
  fragment_glsl_code()
    {
      return this.shared_glsl_code() + `
        uniform float animation_time;

        void main()
        {
        	vec2 center = vec2(0, 0);
			vec2 p = gl_FragCoord.xy / 500.;
			float t = animation_time;
			float dist = sqrt((p.x-1.1)*(p.x-1.1) + (p.y-0.5)*(p.y-0.5));
 		    p.x+=0.2*t;

            vec3 a = vec3(0.5,0.5,0.5);
    		vec3 b = vec3(0.5,0.5,0.5);
    		vec3 c = vec3(1.0,1.0,1.0);
    		vec3 d = vec3(0.0,0.33,0.67);
    		vec3 col = a + b*cos( 6.28318*(c*0.3*dist+d) );

			float f = fract(p.x*16.0);
            col *= smoothstep( 0.49, 0.47, abs(f-0.1) );
			gl_FragColor = vec4( col, 1.0);

        }`;
    }
}
const R_Wall_Shader = defs.R_Wall_Shader =
class R_Wall_Shader extends Shader
{ update_GPU( context, gpu_addresses, program_state, model_transform, material )
      {

        const [ P, C, M ] = [ program_state.projection_transform, program_state.camera_inverse, model_transform ],
                      PCM = P.times( C ).times( M );
        context.uniformMatrix4fv( gpu_addresses.projection_camera_model_transform, false, Mat.flatten_2D_to_1D( PCM.transposed() ) );
        context.uniform1f ( gpu_addresses.animation_time, program_state.animation_time / 1000 );
      }
  shared_glsl_code()
    {
      return `precision mediump float;
              varying vec2 f_tex_coord;
      `;
    }
  vertex_glsl_code()
    {
      return this.shared_glsl_code() + `
        attribute vec3 position;
        attribute vec2 texture_coord;
        uniform mat4 projection_camera_model_transform;

        void main()
        {

            gl_Position = projection_camera_model_transform * vec4( position , 1.0 );
            f_tex_coord = texture_coord;
        }`;
    }
  fragment_glsl_code()
    {
      return this.shared_glsl_code() + `
        uniform float animation_time;

        void main()
        {
        	vec2 center = vec2(0, 0);
			vec2 p = gl_FragCoord.xy / 500.;
			float t = animation_time;
			float dist = sqrt((p.x-1.1)*(p.x-1.1) + (p.y-0.5)*(p.y-0.5));
 		    p.x-=0.2*t;

            vec3 a = vec3(0.5,0.5,0.5);
    		vec3 b = vec3(0.5,0.5,0.5);
    		vec3 c = vec3(1.0,1.0,1.0);
    		vec3 d = vec3(0.0,0.33,0.67);
    		vec3 col = a + b*cos( 6.28318*(c*0.3*dist+d) );

			float f = fract(p.x*16.0);
            col *= smoothstep( 0.49, 0.47, abs(f-0.1) );
			gl_FragColor = vec4( col, 1.0);

        }`;
    }
}



const Floor_Shader = defs.Floor_Shader =
class Floor_Shader extends Shader
{ update_GPU( context, gpu_addresses, program_state, model_transform, material )
      {

        const [ P, C, M ] = [ program_state.projection_transform, program_state.camera_inverse, model_transform ],
                      PCM = P.times( C ).times( M );
        context.uniformMatrix4fv( gpu_addresses.projection_camera_model_transform, false, Mat.flatten_2D_to_1D( PCM.transposed() ) );
        context.uniform1f ( gpu_addresses.animation_time, program_state.animation_time / 1000 );
      }
  shared_glsl_code()
    {
      return `precision mediump float;
              varying vec2 f_tex_coord;
      `;
    }
  vertex_glsl_code()
    {
      return this.shared_glsl_code() + `
        attribute vec3 position;
        attribute vec2 texture_coord;
        uniform mat4 projection_camera_model_transform;

        void main()
        {

            gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
            f_tex_coord = texture_coord;
        }`;
    }
  fragment_glsl_code()
    {
      return this.shared_glsl_code() + `
        uniform float animation_time;

        void main()
        {
        	vec2 center = vec2(0, 0);
			vec2 p = gl_FragCoord.xy / 500.;
			float t = animation_time;
			float dist = sqrt((p.x-1.1)*(p.x-1.1) + (p.y-0.5)*(p.y-0.5));
 		    dist-=0.2*t;
 		    p.y+=0.13*t;

            vec3 a = vec3(0.5,0.5,0.5);
    		vec3 b = vec3(0.5,0.5,0.5);
    		vec3 c = vec3(1.0,1.0,1.0);
    		vec3 d = vec3(0.0,0.33,0.67);
    		vec3 col = a + b*cos( 6.28318*(c*dist+d) );

			float f = fract(p.y*16.0);
            col *= smoothstep( 0.49, 0.47, abs(f-0.1) );
			gl_FragColor = vec4( col, 1.0);

        }`;
    }
}
const Edge_Shader = defs.Edge_Shader =
class Edge_Shader extends Shader
{ update_GPU( context, gpu_addresses, program_state, model_transform, material )
      {

        const [ P, C, M ] = [ program_state.projection_transform, program_state.camera_inverse, model_transform ],
                      PCM = P.times( C ).times( M );
        context.uniformMatrix4fv( gpu_addresses.projection_camera_model_transform, false, Mat.flatten_2D_to_1D( PCM.transposed() ) );
        context.uniform1f ( gpu_addresses.animation_time, program_state.animation_time / 1000 );
      }
  shared_glsl_code()
    {
      return `precision mediump float;
              varying vec2 f_tex_coord;
      `;
    }
  vertex_glsl_code()
    {
      return this.shared_glsl_code() + `
        attribute vec3 position;
        attribute vec2 texture_coord;
        uniform mat4 projection_camera_model_transform;

        void main()
        {

            gl_Position = projection_camera_model_transform * vec4( position, 1.0 );
            f_tex_coord = texture_coord;
        }`;
    }
  fragment_glsl_code()
    {
      return this.shared_glsl_code() + `
        uniform float animation_time;

        void main()
        {
        	vec2 res = vec2(1080. , 580. );
			vec2 p = gl_FragCoord.xy / res.xy;
			p = p - 0.5;
			p.x = abs(p.x) * 5.0;
			p.x = pow(p.x , 4.5);
			p.y = abs(p.y) * 3.0 + 0.1;
			p.y = pow(p.y, 4.5);
			float c = 0. ;
			if(p.x+p.y <0.0)
			{
				c= 0.0;
			}
			else if(p.x+p.y > 1.0)
			{
				c = 2.0 ;
			}
			else
			{
				c = p.x + p.y * 2.0;
			}

			gl_FragColor = vec4( 0.254902 * c, 0.411765*c, 0.882353*c, 1.0) * 2.0 ;


        }`;
    }
}
