import {Assets} from './src/Assets.js';
import {Game} from './src/Game.js';
import {Renderer} from './src/Renderer.js'
console.log("Loading assets...");

await Assets.load();
Renderer.init(Assets, Game);
Game.init();
Game.start();