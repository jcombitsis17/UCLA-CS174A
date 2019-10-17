# a4-s19

This was a three-person project in which we used JavaScript (WebGL) to implement several basic and advanced computer graphics techniques in order to create a "music video", in which objects were animated both manually and based on physics in order to interact with background audio.

Fundamental topics included matrix transformations and linear interpolation for basic object placement, movement, and animation. Advanced techniques included audio frequency analysis and beat detection, continuous collision detection (CCD), post-processing (for reflections and shadow mapping), spline curves, mouse ray-casting, custom shader coding (GLSL), and scene timing.

For this project, my role included adding all audio-related functionality, including frequency analysis in order to get the objects to pulse/scale along with the beat of the song. I also constructed all of the scenes that appear during the song, including preset ball animations, and pieced these scenes together in the display function using scene timing. In order to get the balls to move and scale as we desired, I had to implement several Bezier curve functions for both ease of use and smooth transitions. I also added mouse interactivity (in order to change the spheres' color), using raycasting to convert from viewport to model space, and using the ray-sphere intersection formula to determine if an object was clicked.

The final project can be viewed on GitHub Pages at this URL: https://intro-graphics-master.github.io/term-project-27/
