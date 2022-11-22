export const Assets = {
    textures:[],
    maps:[],
    async load(){
        await this.loadTextures();
        await this.loadMap();
    },
    async loadTextures(){
        let file = await fetch('assets/download.png');
        let data = await file.blob();
        let bmp = await createImageBitmap(data);
        this.textures.push({type:'tile','img':bmp});

    },
    async loadMap(){

    }
};

