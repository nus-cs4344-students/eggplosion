Steps  For Running The Game

Step 1 (Install the pre-requisite)
-Download and install latest stable version of redis server. The link is at http://redis.io/download
-Download and install latest stable version of python 2.x . The link is at http://www.python.org/getit/
-Download and install latest stable version of node.js. The link is at http://nodejs.org/download/

Step 2 ( Change the IP address in the source code)
-In our client code, we hardcode the ip address of the server to localhost. There is a need to change these hardcoded ip to the actual IP that you will be using. The files affected are 

-Eggplosion\client\game\index.html
	<script src="http://gameServerIP:8080/socket.io/socket.io.js"></script>

-Eggplosion\client\game\js\lobby.js
	  this.lobby = io.connect('http://gameServerIP:8080/lobby');

-Eggplosion\client\game\js\networking.js
	this.socket = io.connect('http://gameServerIP:8080/' + opt.game);

Thus if the game server is being run on 192.168.1.1, then the gameServerIP will be 192.168.1.1

Step 3 (run the different services)
-For redis server :
	- The binaries that are now compiled are available in the src directory. Run Redis with
	“$ src/redis-server” 

-For Eggplosion client:
	-Please go to “Eggplosion\client\game” and execute the following command:
	“python –m SimpleHTTPServer 8000”

-For Eggplosion server:
	-Please go to “Eggplosion\server\” and execute the following command:
	“node server.js”

Step 4 (Run the Game on browser)
-For all browsers, point to the following URL:
 	“http://yourIP:8000”
