# a4-s19

Use this codebase not only for your Assignment 4, but for your Team Project!  Do not use assignment 3's; if you have already started something, copy it over to this codebase.

Assignment instructions:

https://docs.google.com/document/d/1d8A0aIGXSEodmgQUyssuTVANDphaBykTY0B2CTHTEWI/edit?usp=sharing
Advanced Topics:

Collisions
Shadow Mapping
Audio Analysis
Mouse Ray-Casting
Physics (gravity)
Alissa : I did the shadow mapping and the shaders for the background and balls. In order to do the shadow mapping I had to draw the balls in black and a background then use the image of this to create a texture. I then cleared the scene and redrew the balls in color and used the texture I created to texturize the floor. The shaders I created used a gradient for the walls, with columns moving with time. The ball shaders used a noise function to change the color.

Tabatha: I did the fall, collision and gravity button. In order to of collision I had to detect the motion of randoms objects. In gravity I calculated an accerlation based off of current and final position. In addition to falling they had to be able to detect the motion of other objects during their fall and make sure to stay within bounds, with a changing radius. Gravity works best when motion is random without intercepting coordinating motion, the bass drops because that is hard to account for. In collisions, each ball predicted whether or not the ball it could potentially collide into would collide into a wall as well, so it had to predict possibel changes in motion of another ball when it was seeing if it would intercept it. It was hard to coordiante the random motion and bass drops because the bass dops moved using an interpolations method so I had to try to see if its arc would intercet another sphere, since calling movSpheres when two balls overlap would cause a glitch. Because the speed and motion changed inconsistently a hash table did not prove to be any more efficient than iterating through each sphere and recursievly perfecting the collisions took too long to return.

Jordan: I added all audio-related functionality, including frequency analysis in order to get the objects to pulse/scale along with the beat of the song. I also constructed all of the scenes that appear during the song, including preset ball animations, and pieced these scenes together in the display function using scene timing. In order to get the ball to move and scale as we desired, I had to implement several Bezier curve functions. I also added mouse interactivity (in order to change the spheres' color), using raycasting to convert from viewport to model space, and using the ray-sphere intersection formula to determine if an object was clicked.
