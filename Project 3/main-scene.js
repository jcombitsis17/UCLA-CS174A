import {tiny, defs} from './assignment-3-resources.js';
                                                                // Pull these names into this module's scope for convenience:
const { Vec, Mat, Mat4, Color, Shape, Shader,
         Scene, Canvas_Widget, Code_Widget, Text_Widget } = tiny;
const { Cube, Subdivision_Sphere, Transforms_Sandbox_Base } = defs;

// Now we have loaded everything in the files tiny-graphics.js, tiny-graphics-widgets.js, and assignment-3-resources.js.
// This yielded "tiny", an object wrapping the stuff in the first two files, and "defs" for wrapping all the rest.

// (Can define Main_Scene's class here)
const Main_Scene = defs.Transforms_Sandbox =
class Transforms_Sandbox extends Transforms_Sandbox_Base
{                                                    // **Transforms_Sandbox** is a Scene object that can be added to any display canvas.
                                                     // This particular scene is broken up into two pieces for easier understanding.
                                                     // See the other piece, Transforms_Sandbox_Base, if you need to see the setup code.
                                                     // The piece here exposes only the display() method, which actually places and draws 
                                                     // the shapes.  We isolate that code so it can be experimented with on its own.
                                                     // This gives you a very small code sandbox for editing a simple scene, and for
                                                     // experimenting with matrix transformations.

    constructor()
    {
        super(...arguments),

        this.colors = 
        {
              blue:   Color.of( 0,0,1,1 ),
              yellow: Color.of( 1,1,0,1 ), 
              orange: Color.of( 1,0.5,0,1 ), 
              wings:  Color.of( 0,0,0,0.5 )
        };
        
        this.freq = 6;                                         // frequency of dragonfly parts' movement (for sin function)

        this.num_dragonflies = 10,
        this.dragonfly_data = [];
        for (let i = 0; i < this.num_dragonflies; i++)
        {
            this.dragonfly_data.push(
            {
                position: Vec.of( 0,0,0 ),
                velocity: Vec.of( (Math.random()-0.5)*0.01, (Math.random()-0.5)*0.01, 0 )
            });
        }
    }

    display( context, program_state )
    {                                                // display():  Called once per frame of animation.  For each shape that you want to
                                                     // appear onscreen, place a .draw() call for it inside.  Each time, pass in a
                                                     // different matrix value to control where the shape appears.

                                                     // Variables that are in scope for you to use:
                                                     // this.shapes.box:   A vertex array object defining a 2x2x2 cube.
                                                     // this.shapes.ball:  A vertex array object defining a 2x2x2 spherical surface.
                                                     // this.materials.metal:    Selects a shader and draws with a shiny surface.
                                                     // this.materials.plastic:  Selects a shader and draws a more matte surface.
                                                     // this.lights:  A pre-made collection of Light objects.
                                                     // this.hover:  A boolean variable that changes when the user presses a button.
                                                     // program_state:  Information the shader needs for drawing.  Pass to draw().
                                                     // context:  Wraps the WebGL rendering context shown onscreen.  Pass to draw().                                                       

        // Call the setup code that we left inside the base class:
        super.display( context, program_state );
        
        // Time Variable
        const t = this.t = program_state.animation_time/1000;

        // Reset coordinate system every frame
        let model_transform = Mat4.identity();

        // Scale to fit into camera
        model_transform = model_transform.times( Mat4.scale( [ 0.4,0.4,0.4 ] ) );

        // Swarm Mode (EC1)
        // NOTE: Swarm must be FALSE for Hover to work (Piazza post said to ignore this.hover when this.swarm=true)
        // NOTE: Wrap-around based on default camera
        if ( this.swarm )
        {
            this.hover = false;

            for (let i = 0; i < this.num_dragonflies; i++)
            {
                model_transform = Mat4.translation( this.dragonfly_data[i].position )
                .times( Mat4.inverse( Mat4.look_at( Vec.of( 0,0,0 ), this.dragonfly_data[i].velocity.times(-1), Vec.of( 0,1,0 ) ) ) );
                
                model_transform = model_transform.times(Mat4.scale([0.1,0.1,0.1]));
                this.draw_dragonfly(context, program_state, model_transform, t);
                this.dragonfly_data[i].position = (this.dragonfly_data[i].position.plus( 
                                                   this.dragonfly_data[i].velocity.times(program_state.animation_delta_time) ) );
                    
                // Manual Wrap Around (using default camera)
                if (this.dragonfly_data[i].position[0] > 10) {
                    this.dragonfly_data[i].position[0] = -9;
                } else if (this.dragonfly_data[i].position[0] < -10) {
                    this.dragonfly_data[i].position[0] = 9;
                } else if (this.dragonfly_data[i].position[1] > 5) {
                    this.dragonfly_data[i].position[1] = -7;
                } else if (this.dragonfly_data[i].position[1] < -10) {
                    this.dragonfly_data[i].position[1] = 2;
                }
            }
        }

        // Dragonfly Movement (default)
        if ( !this.hover )
        {
            model_transform = model_transform.times( Mat4.rotation( t, [ 0,-1,0 ] ) )
                                             .times( Mat4.translation( [ 8,5*Math.sin(this.freq*t+Math.PI/2),5 ] ) );
                                             // x=radius, y=bounce, z=center of mass
        }

        if ( !this.swarm )  // erase default dragonfly if this.swarm=true
        {
            this.draw_dragonfly(context, program_state, model_transform, t);
        }

    }

    draw_dragonfly(context, program_state, model_transform, t)
    {
        // Some Constants
        let leg_scale = [0.3,2,0.3];                          // scaling values for legs
        let placeholder;                                      // placeholder matrix for operations (so original doesn't get overwritten)
        
        // Head
        this.shapes.box.draw( context, program_state, model_transform, this.materials.plastic.override( this.colors.yellow ) );

        // Right Eye
        this.shapes.ball.draw( context, program_state, 
                               model_transform.times( Mat4.translation( [ 3,0,0 ] ) )
                                              .times( Mat4.scale( [ 2,2,2 ] ) ), 
                               this.materials.metal.override( this.colors.blue ) );
        // Left Eye
        this.shapes.ball.draw( context, program_state, 
                               model_transform.times( Mat4.translation( [ -3,0,0 ] ) )
                                              .times( Mat4.scale( [ 2,2,2 ] ) ), 
                               this.materials.metal.override( this.colors.blue ) );

        let wings_legs_1, wings_legs_2, legs_3;

        // Tail
        let tail_transform = model_transform.copy();
        tail_transform = tail_transform.times( Mat4.translation( [ 0,0,-2 ] ) );
        this.shapes.box.draw( context, program_state, tail_transform, this.materials.plastic.override( this.colors.orange ) );
        for (let i = 0; i < 9; i++)
        {
            tail_transform = tail_transform.times( Mat4.translation( [ 0,0,-2 ] ) )
                                           .times( Mat4.translation( [ 0,-1,1 ] ) )
                                           .times( Mat4.rotation( 0.1+0.1*Math.sin(this.freq*t), [ -1,0,0 ] ) )
                                           .times( Mat4.translation( [ 0,1,-1 ] ) );
            this.shapes.box.draw( context, program_state, tail_transform, this.materials.plastic.override( this.colors.orange ) );

            // store relevant tail locations
            if (i == 0) { wings_legs_1 = tail_transform.copy(); }
            if (i == 1) { wings_legs_2 = tail_transform.copy(); }
            if (i == 2) { legs_3 = tail_transform.copy(); }
        }

        // Wings
        for (let i = -1; i <= 1; i+=2)
        {
            // Front (Right=-1, Left=1)
            this.shapes.box.draw( context, program_state, wings_legs_1.times( Mat4.translation( [ 1*i,1,0 ] ) )
                                                                      .times( Mat4.rotation(-.5*i*Math.sin(this.freq*t), [ 0,0,1 ] ) )
                                                                      .times( Mat4.scale( [ 8,0.2,1 ] ) )
                                                                      .times( Mat4.translation( [ 1*i,1,0 ] ) ), 
                                  this.materials.plastic.override( this.colors.wings ) );

            // Back (Right=-1, Left=1)
            this.shapes.box.draw( context, program_state, wings_legs_2.times( Mat4.translation( [ -1*i,1,0 ] ) )
                                                                      .times( Mat4.rotation(.5*i*Math.sin(this.freq*t), [ 0,0,1 ] ) )
                                                                      .times( Mat4.scale( [ 8,0.2,1 ] ) )
                                                                      .times( Mat4.translation( [ -1*i,1,0 ] ) ), 
                                  this.materials.plastic.override( this.colors.wings ) );
        }

        // Legs
        for (let i = -1; i <= 1; i+=2)
        {
            // Right = -1, Left = 1
            for (let j = 0; j < 3; j++)
            {
                if      (j == 0) { placeholder = wings_legs_1; }    // Front
                else if (j == 1) { placeholder = wings_legs_2; }    // Middle
                else if (j == 2) { placeholder = legs_3; }          // Back

                placeholder = placeholder.times( Mat4.translation( [ 1*i,-1,0 ] ) )
                                         .times( Mat4.rotation( i*(0.1+0.1*Math.sin(this.freq*t)), [ 0,0,1 ] ) )
                                         .times( Mat4.scale( leg_scale ) )
                                         .times( Mat4.translation( [ 1*i,-1,0 ] ) );
                this.shapes.box.draw( context, program_state, placeholder, this.materials.plastic.override( this.colors.yellow ) );
                this.shapes.box.draw( context, program_state, placeholder.times( Mat4.translation( [ -1*i,-1,0 ] ) )
                                                                         .times( Mat4.scale( leg_scale.map( x => 1 / x ) ) )    // undo scaling
                                                                         .times( Mat4.rotation( -i*(0.1+0.1*Math.sin(this.freq*t)), [ 0,0,1 ] ) )
                                                                         .times( Mat4.scale( leg_scale ) )                      // redo scaling
                                                                         .times( Mat4.translation( [ 1*i,-1,0 ] ) ),
                                      this.materials.plastic.override( this.colors.yellow ) );
            }
        }

    }   // end draw_dragonfly
    
}   // end class

const Additional_Scenes = [];

export { Main_Scene, Additional_Scenes, Canvas_Widget, Code_Widget, Text_Widget, defs }