const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    mode: 'development', // or production (minimize file size)
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
        port: 7700,
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