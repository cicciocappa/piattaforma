import {Assets} from './src/Assets.js';
import {Game} from './src/Game.js';
import {Renderer} from './src/Renderer.js'
console.log("Loading assets...");

await Assets.load();
// spostare sotto alla fine
Game.init();
Renderer.init(Assets, Game);

Game.start();