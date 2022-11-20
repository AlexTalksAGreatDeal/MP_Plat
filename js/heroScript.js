'use strict';

// =============================================================================
// Create Player (Hero)
// =============================================================================
window.Hero = class Hero extends window.Phaser.Sprite {
  constructor(game) {
    super();
    window.Phaser.Sprite.call(this, game, 10, 523, 'hero');
    // anchor
    this.anchor.set(0.5, 0.5);
    // physics properties
    this.game.physics.enable(this);
    this.body.collideWorldBounds = true;
    // animations
    this.animations.add('stop', [0]);
    this.animations.add('run', [1, 2], 8, true); // 8fps looped
    this.animations.add('jump', [3]);
    this.animations.add('fall', [4]);
    // starting animation
    this.animations.play('stop');
   
  }

  move(xDirection, yDirection)  
  {
      // "guard" (kick out if frozen)
      if (this.isFrozen) { return; }
      const SPEED = 200;

    //update our vertical and horizontal positions
      this.body.velocity.x = xDirection * SPEED;
    this.body.velocity.y = yDirection * SPEED;
      
    
      // update image flipping & animations
      if (this.body.velocity.x < 0) 
    {
        this.scale.x = -1;
      } else if (this.body.velocity.x > 0) 
    {
        this.scale.x = 1;
      }
  }


setTint(tintMultiplier)
{
	this.tint = tintMultiplier * 0xffffff;
}

// When player goes through door do animation and remove player

  freeze() 
  {    
    this.body.enable = false;
    this.isFrozen = true;
  }

  // returns the animation name that should be playing depending on
  // current circumstances
  _getAnimationName() 
  {
    let name = 'stop'; // default animation
    if (this.isFrozen) 
    {
      name = 'stop';
    } 
		else if (this.body.velocity.x !== 0 )
    {
      name = 'run';
    } 
    else if (this.body.velocity.y !== 0) 
    {
      name = 'run';
    } 
    else 
    {
        name = 'stop';
    }

    return name;
/*
    let name = 'stop'; // default animation
    if (this.isFrozen) 
    {
      name = 'stop';
    } else if (this.body.velocity.y < 0) 
    {
      name = 'run';
    } else if (this.body.velocity.x < 0) 
    {
      name = 'run';
    }
    return name;
*/

  }

// =============================================================================
// Update loop below
// =============================================================================



  update() {
    // update sprite animation, if it needs changing
    const animationName = this._getAnimationName();
    if (this.animations.name !== animationName) 
    {
      this.animations.play(animationName);
    }
  }



};
