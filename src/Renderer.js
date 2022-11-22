export const Renderer = {


    tile_program: undefined,
    sprite_program: undefined,
    locations: new Map(),
    tiles_buffer: undefined,
    init(Assets, Game) {
        const canvas = document.querySelector("#c");
        this.gl = canvas.getContext("webgl2");
        this.createShaders(this.gl);
        this.createBuffers(this.gl, Game.settings);
        this.createTextures(this.gl, Assets.textures, Game.settings.TILE_SIZE);

        // test
        console.log("testing...");
        this.rendertTiles(this.gl, Game);
    },
    createShaders(gl) {
        const tile_vs_src = `#version 300 es
        #pragma vscode_glsllint_stage: vert
        layout(location=0) in vec4 aPosition;
        layout(location=1) in vec2 aTexCoord;
        layout(location=2) in float aDepth;
        uniform vec2 uDelta;
        out vec2 vTexCoord;
        out float vDepth;
        void main()
        {
            vDepth = aDepth;
            vTexCoord = aTexCoord;
            gl_Position = aPosition+vec4(uDelta,0,0);
        }`;

        const tile_fs_src = `#version 300 es
        #pragma vscode_glsllint_stage: frag
        precision mediump float;
        uniform mediump sampler2DArray uSampler;
        in vec2 vTexCoord;
        in float vDepth;
        out vec4 fragColor;
        void main()
        {
            fragColor = texture(uSampler, vec3(vTexCoord, vDepth));   
        }`;
        const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, tile_vs_src);
        const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, tile_fs_src);

        this.tile_program = this.createProgram(gl, vertexShader, fragmentShader);


       

       
        this.locations.set("tile_delta", gl.getUniformLocation(this.tile_program, "uDelta"));
        this.locations.set("tile_sampler", gl.getUniformLocation(this.tile_program, "uSampler"));

        console.log(this.locations);

    },
    createShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (success) {
            return shader;
        }

        console.log(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
    },

    createProgram(gl, vertexShader, fragmentShader) {
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        const success = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (success) {
            return program;
        }

        console.log(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
    },

    createBuffers(gl, settings) {
        // ci serve un unico buffer per le coordinate,
        // ed n buffer per le uv per quanti sono i livelli
        // il loop di disegno del background sarà quindi un livello per volta
        // impostiamo  u_delta
        // impostiamo dove prendere le a_texcoord
        // e chiamiamo draw
        console.log(settings);
        const wquad = settings.SCREEN_WIDTH / settings.TILE_SIZE + 1;
        const hquad = settings.SCREEN_HEIGHT / settings.TILE_SIZE + 1;
        this.tiles_buffer = gl.createBuffer();
        console.log(this.tiles_buffer);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.tiles_buffer);
        const data = [];
        const dx = 2 * settings.TILE_SIZE / settings.SCREEN_WIDTH;
        const dy = 2 * settings.TILE_SIZE / settings.SCREEN_HEIGHT;
        for (let x = 0; x < wquad; ++x) {
            for (let y = 0; y < hquad; ++y) {
                const sx = -1 + dx * x;
                const sy = 1 - dy * y;
                data.push(
                    sx, sy,
                    0, 0,
                    sx + dx, sy,
                    1, 0,
                    sx, sy - dy,
                    0, 1);
                data.push(
                    sx + dx, sy,
                    1, 0,
                    sx + dx, sy - dy,
                    1, 1,
                    sx, sy - dy,
                    0, 1);
            }
        }
        const num_vert = wquad * hquad * 6;

        for (let i = 0; i < settings.NUM_LAYERS; ++i) {
            let d = Math.floor(Math.random()*128);
            for (let j = 0; j < num_vert; ++j) {
                data.push((d+j)%128);
            }
        }
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);

    },

    createTextures(gl, textures, tile_size) {
        for (let i = 0; i < textures.length; ++i) {
            if (textures[i].type == 'tile') {
                // creiamo un texture array
                const img = textures[i].img;

                const offscreen = new OffscreenCanvas(img.width, img.height);
                const bmp = offscreen.getContext("2d");
                bmp.drawImage(img, 0, 0);
                const img_data = bmp.getImageData(0, 0, img.width, img.height).data;
                const texture = gl.createTexture();
                gl.activeTexture(gl.TEXTURE0 + i);
                gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
                const tiles_in_row = img.width / tile_size;
                const num_tiles = (img.width / tile_size) * (img.height / tile_size);
                gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, tile_size, tile_size, num_tiles);
               
                const pbo = gl.createBuffer();
                gl.bindBuffer(gl.PIXEL_UNPACK_BUFFER, pbo);
                gl.bufferData(gl.PIXEL_UNPACK_BUFFER, img_data, gl.STATIC_DRAW);

                 
                gl.pixelStorei(gl.UNPACK_ROW_LENGTH, img.width);
                gl.pixelStorei(gl.UNPACK_IMAGE_HEIGHT, img.height);

                
                for (let j = 0; j < num_tiles; ++j) {
                    
                    const row = Math.floor(j / tiles_in_row) * tile_size;
                    const col = (j % tiles_in_row) * tile_size;
                    //console.log(row,col);
                   
                    gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, col);
                    gl.pixelStorei(gl.UNPACK_SKIP_ROWS, row);

                    
                    gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, j, tile_size, tile_size, 1, gl.RGBA, gl.UNSIGNED_BYTE, 0);
                }

                gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
                gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            }
        }
    },

    rendertTiles(gl, Game){
        gl.useProgram(this.tile_program);
        gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0);
        gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
       
        gl.enableVertexAttribArray(0);
        gl.enableVertexAttribArray(1);
        gl.enableVertexAttribArray(2);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        
        for (let k=0;k<Game.layers.length;++k){
            const xc = Math.floor(Game.camera.x*Game.layers[k].parallax);
            const yc = Math.floor(Game.camera.y*Game.layers[k].parallax);
            const xtile = Math.floor(xc / 32);
            const xpos = xc % 32;
            const ytile = Math.floor(yc / 32);
            const ypos = yc % 32;

            if (xtile != Game.oxtile[k] || ytile != Game.oytile[k]) {
                const data = [];
                for (let i = 0; i < 21; i++) {
                    for (let j = 0; j < 16; j++) {
                        const n = Game.layers[k].data[80 * (ytile + j) + xtile+i];

                        data.push(n, n, n, n, n, n);



                    }
                }
                let fd = new Float32Array(data);
               
                gl.bufferSubData(gl.ARRAY_BUFFER,8064 * 4 + 2016 * 4 * k, fd);
                Game.oxtile[k] = xtile;
                Game.oytile[k] = ytile;
            }

            gl.uniform2f(this.locations.get('tile_delta'), -xpos/320,  ypos /240);		
            gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 0, 8064 * 4 + k* 2016 * 4 );
            gl.drawArrays(gl.TRIANGLES, 0, 6 * 21 * 16);
        }
        

        }


};