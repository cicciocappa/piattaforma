export const Game = {
    settings:{
        TILE_SIZE: 32,
        SCREEN_WIDTH: 640,
        SCREEN_HEIGHT: 480,
        NUM_LAYERS: 4,
    },
    camera: {x:0,y:0},
    layers: [{parallax:0.5, sampler:0},{parallax:1,sampler:0}],
    init(){},
    start(){},
};