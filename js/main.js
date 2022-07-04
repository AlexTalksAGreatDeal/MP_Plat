'use strict';

console.log("Hello world. Main.js started.");

window.syncOtherPlayerFrameDelay = 0; //30 frames allows for 500ms of network jitter, to prevent late frames
window.currentChannelName; // Global variable for the current channel that your player character is on
window.currentFireChannelName; // Global variable that checks the current stage you are on to send the correct information to the PubNub Block
window.globalCurrentLevel = 0; // Global variable for the current level (index starts at 0)

window.UniqueID = window.PubNub.generateUUID(); // Generate a unique id for the player. Generated by the PubNub Network //This was commented out in the demo code when I forked it. Uncommented in an attempt to fix the game after replacingt their keys with my own.

//window.UniqueID = generateName(); //This was the original code in the Demo, but after I swapped in my PubNub keys, it broke
window.globalLevelState = null; // Sets the globalLevelState to null if you aren't connected to the network. Once connected, the level will generate to the info that was on the block.
window.globalWasHeroMoving = true;
// console.log('UniqueID', UniqueID); // Print out your clients Unique ID
window.text1 = 'Level 1 Occupancy: 0'; // Global text objects for occupancy count
window.text2 = 'Level 2 Occupancy: 0';
window.text3 = 'Level 3 Occupancy: 0';
let textResponse1;
let textResponse2;
let textResponse3;
window.updateOccupancyCounter = false; // Occupancy Counter variable to check if the timer has already been called in that scene
window.keyMessages = [];

//PubNub integration starts here
window.createMyPubNub = function (currentLevel) {
   console.log('createMyPubNub', currentLevel);
  window.globalCurrentLevel = currentLevel; // Get the current level and set it to the global level
  window.currentFireChannelName = 'realtimephaserFire2';
  window.currentChannelName = `realtimephaser${currentLevel}`; // Create the channel name + the current level. This way each level is on its own channel.
  let checkIfJoined = false; // If player has joined the channel

  // Setup PubNub Keys
  window.pubnub = new window.PubNub({
//Alex's PubNub keys. 
   publishKey: 'pub-c-144006c6-3268-499a-b735-ce033df1873d',
  subscribeKey: 'sub-c-91189840-af0f-4af6-9ebb-3909785c6d52',
     
     //original keys from demo
  //    publishKey: 'pub-c-1c688f67-2435-4622-96e3-d30dfd9d0b37',
 //   subscribeKey: 'sub-c-e4c02264-1e13-11e7-894d-0619f8945a4f',
    uuid: window.UniqueID,
  });

  // Subscribe to the two PubNub Channels
  window.pubnub.subscribe({
    channels: [window.currentChannelName, window.currentFireChannelName],
    withPresence: true,
  });


  // Create PubNub Listener for message events
  window.listener = {
    status() {
      // Send fire event to connect to the block
      const requestIntMsg = { requestInt: true, currentLevel: window.globalCurrentLevel, uuid: window.UniqueID };
      window.pubnub.fire({
        message: requestIntMsg,
        channel: window.currentFireChannelName,
        sendByPost: false
      });
    },

    message(messageEvent) {
      if (messageEvent.message.uuid === window.UniqueID) {
        return; // this blocks drawing a new character set by the server for ourselve, to lower latency
      }
      if (messageEvent.channel === window.currentFireChannelName) {
        window.globalLastTime = messageEvent.timetoken; // Set the timestamp for when you send fire messages to the block
        if (messageEvent.message.int === true && messageEvent.message.sendToRightPlayer === window.UniqueID) { // If you get a message and it matches with your UUID
          window.globalLevelState = messageEvent.message.value; // Set the globalLevelState to the information set on the block
          window.StartLoading(); // Call the game state start function in onLoad
        }
      }
      if (window.globalOtherHeros) { // If player exists
        if (messageEvent.channel === window.currentChannelName) { // If the messages channel is equal to your current channel
          if (!window.globalOtherHeros.has(messageEvent.message.uuid)) { // If the message isn't equal to your uuid
            window.globalGameState._addOtherCharacter(messageEvent.message.uuid); // Add another player to the game that is not yourself
            window.sendKeyMessage({}); // Send publish to all clients about user information
            const otherplayer = window.globalOtherHeros.get(messageEvent.message.uuid);
            otherplayer.position.set(messageEvent.message.position.x, messageEvent.message.position.y); // set the position of each player according to x y
            otherplayer.initialRemoteFrame = messageEvent.message.frameCounter;
            otherplayer.initialLocalFrame = window.frameCounter;
            otherplayer.totalRecvedFrameDelay = 0;
            otherplayer.totalRecvedFrames = 0;
          }
          if (messageEvent.message.position && window.globalOtherHeros.has(messageEvent.message.uuid)) { // If the message contains the position of the player and the player has a uuid that matches with one in the level
            window.keyMessages.push(messageEvent);
          }
        }
      }
    },

    presence(presenceEvent) { // PubNub on presence message / event
      let occupancyCounter;

      function checkFlag() {  // Function that reruns until response
        if (window.globalOtherHeros && checkIfJoined === true) { // If the globalother heros exists and if the player joined equals true
          clearInterval(occupancyCounter); // Destroy the timer for that scene
          window.updateOccupancyCounter = true; // Update the variable that stops the timer from running
          // Run PubNub HereNow function that controls the occupancy
          window.pubnub.hereNow(
            {
              includeUUIDs: true,
              includeState: true
            },
            (status, response) => {
              // If I get a valid response from the channel change the text objects to the correct occupancy count
              if (typeof (response.channels.realtimephaser0) !== 'undefined') {
                textResponse1 = response.channels.realtimephaser0.occupancy.toString();
              } else {
                textResponse1 = '0';
              }
              if (typeof (response.channels.realtimephaser1) !== 'undefined') {
                textResponse2 = response.channels.realtimephaser1.occupancy.toString();
              } else {
                textResponse2 = '0';
              }
              if (typeof (response.channels.realtimephaser2) !== 'undefined') {
                textResponse3 = response.channels.realtimephaser2.occupancy.toString();
              } else {
                textResponse3 = '0';
              }
              window.text1 = `Level 1 Occupancy: ${textResponse1}`;
              window.text2 = `Level 2 Occupancy: ${textResponse2}`;
              window.text3 = `Level 3 Occupancy: ${textResponse3}`;
              window.textObject1.setText(window.text1);
              window.textObject2.setText(window.text2);
              window.textObject3.setText(window.text3);
            }
          );
        }
      }

      if (window.updateOccupancyCounter === false) {
        occupancyCounter = setInterval(checkFlag, 200); // Start timer to run the checkflag function above
      }

      if (presenceEvent.action === 'join') { // If we recieve a presence event that says a player joined the channel from the pubnub servers
        checkIfJoined = true;
        checkFlag();
        // text = presenceEvent.totalOccupancy.toString()
        if (presenceEvent.uuid !== window.UniqueID) {
          window.sendKeyMessage({}); // Send message of players location on screen
        }
      } else if (presenceEvent.action === 'leave' || presenceEvent.action === 'timeout') {
        checkFlag();
        try {
          window.globalGameState._removeOtherCharacter(presenceEvent.uuid); // Remove character on leave events if the individual exists
        } catch (err) {
           console.log(err)
        }
      }
    }
  };

  // If person leaves or refreshes the window, run the unsubscribe function
  window.addEventListener('beforeunload', () => {
    navigator.sendBeacon(`https://pubsub.pubnub.com/v2/presence/sub_key/mySubKey/channel/ch1/leave?uuid=${window.UniqueID}`); // pub
    window.globalUnsubscribe();
  });

  // Unsubscribe people from PubNub network
  window.globalUnsubscribe = function () {
    try {
       console.log('unsubscribing', window.currentChannelName);
      window.pubnub.unsubscribe({
        channels: [window.currentChannelName, window.currentFireChannelName],
        withPresence: true
      });
      window.pubnub.removeListener(window.listener);
    } catch (err) {
       console.log("Failed to UnSub");
    }
  };
  window.pubnub.addListener(window.listener);
};

  window.sendKeyMessage = (keyMessage) => {
      try {
        if (window.globalMyHero) {
          window.pubnub.publish({
            message: {
              uuid: window.UniqueID,
              keyMessage,
              position: window.globalMyHero.body.position,
              frameCounter: window.frameCounter
            },
            channel: window.currentChannelName,
            sendByPost: false, // true to send via posts
          });
        }
           console.log("send message!")
      } catch (err) {
        console.log(err);
      }
  };

window.fireCoins = () => {
  const message = {
    uuid: window.UniqueID,
    coinCache: window.globalLevelState.coinCache,
    currentLevel: window.globalCurrentLevel,
    time: window.globalLastTime
  };
   console.log('fireCoins', message);
  window.pubnub.fire(
    {
      message,
      channel: window.currentFireChannelName,
      sendByPost: false, // true to send via posts
    });
};

// Load External Javascript files
const loadHeroScript = document.createElement('script');
loadHeroScript.src = './js/heroScript.js';
document.head.appendChild(loadHeroScript);

const loadLoadingState = document.createElement('script');
loadLoadingState.src = './js/loadingState.js';
document.head.appendChild(loadLoadingState);

const loadPlaystate = document.createElement('script');
loadPlaystate.src = './js/playState.js';
document.head.appendChild(loadPlaystate);

// =============================================================================
// Load the various phaser states and start game
// =============================================================================

window.addEventListener('load', () => {
  const game = new window.Phaser.Game(960, 600, window.Phaser.AUTO, 'game');
  game.state.disableVisibilityChange = true; // This allows two windows to be open at the same time and allow both windows to run the update function
  game.state.add('play', window.PlayState);
  game.state.add('loading', window.LoadingState);
  window.createMyPubNub(0); // Connect to the pubnub network and run level code 0
  window.StartLoading = function () {
    game.state.start('loading'); // Run the loading function once you successfully connect to the pubnub network
    window.initChatEngine();
  };
});
