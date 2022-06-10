const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    mode: 'development', // development or production (minimize file size)
    stats: {warnings: false},
    entry: {
        main: path.resolve(__dirname, './src/mainVR.js'),
    },
    output: {
        path: path.resolve(__dirname, 'docs'),
        filename: 'app.bundle.js',
        assetModuleFilename: '[name][ext]',
        clean: false,
    },
    devtool: 'inline-source-map',
    
    devServer: {
        static: {
            directory: path.join(__dirname, 'docs'),
        },
        port: 7700,        /*
        const delta = clock.getDelta();
        let camera = this.camera;
        if (this.loadingObjectPlaceholder.visible) {
            this.loadingObjectPlaceholder.rotation.x += delta * 0.5;
            this.loadingObjectPlaceholder.rotation.y += delta * 0.2;
            this.tempVecS.set(this.cameraDistance / 30, this.cameraDistance / 30, this.cameraDistance / 30);
            this.loadingObjectPlaceholder.scale.copy(this.tempVecS);
        }
        this.cameraDistance = camera.position.distanceTo(this.obj3Dcursor.position);
        this.objCursorRing.scale.copy(this.tempVecS);
        this.objCursor.scale.copy(this.tempVecS);
        this.objCursor.lookAt(camera.position);
        this.tempVecS.set(this.cameraDistance / 60, this.cameraDistance / 60, this.cameraDistance / 60);
        this.obj3Dcursor.scale.copy(this.tempVecS);
        this.objCursorRing.lookAt(camera.position);
        */
        open: true,
        hot: true,

    },

    //loaders

    module:{
        rules: [
            { test: /\.(svg|png|jpg|gif|jpeg|webp|ico|glsl|vs|fs|glb|ifc)$/, type: 'asset/resource' }, //load images, shaders, models
            // {test /\.js$/, exclude: /node_modules/, use: { loader: 'babel-loader, options: { presets: ['@babel/preset-env']}}}, //transpile to es5 for older browsers instal (npm i -D babel-loader @babel/core @babel/preset-env)
        ]
    },


    //plugins

    plugins: [ new HtmlWebpackPlugin({
            title: "VR IFC file viewer",
            filename: "index.html",
            langauge: "en",
        }),
    ],
};