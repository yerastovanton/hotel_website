const fs = require('fs');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const webpack = require('webpack');

module.exports = (env) => {
    const isDev = env.mode === 'development';
    const absoluteDirPath = path.resolve(__dirname, './src/pages/');
    const entriesSettings = path.resolve(__dirname, './src/pages/index.js');

    const getHtmlWebpackPluginSetting = (dir) => {
        const htmlWebpackPluginSetting = [];

        const getAllFiles = (dir) =>
            fs.readdirSync(dir).reduce((files, file) => {
              const name = path.join(dir, file);
              const isDirectory = fs.statSync(name).isDirectory();
              return isDirectory ? [...files, ...getAllFiles(name)] : [...files, name];
            }, []);

        for (const file of getAllFiles(dir)) {
            // if (path.extname(file) == '.js') {
                //     entriesAndPages.entries.push(
                //         `${file}`
                //     );
                // };
            if (path.extname(file) == '.pug') {
                const deleteExt = path.basename(`${file}`, '.pug');
                htmlWebpackPluginSetting.push(
                    new HtmlWebpackPlugin({
                        template: file,
                        filename: `${deleteExt}.html`,
                    })
                );
            };
        };

        return htmlWebpackPluginSetting;
    };

    const htmlWebpackPluginSetting = getHtmlWebpackPluginSetting(absoluteDirPath);

    const cssLoaderWithModules = {
        loader: 'css-loader',
        options: {
            modules: {
            localIdentName: isDev ? '[local]' : '[hash:base64:8]',
            },
        },
    }; 
    const cssLoader = {
        test: /\.s[ac]ss$/i,
        use: [
            isDev ? MiniCssExtractPlugin.loader : 'style-loader', 
            cssLoaderWithModules, 
            'sass-loader',
        ],
    };
    const assetsLoader = {
        test: /\.(png|svg|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
    };
    const pugLoader = {
        test: /\.pug$/,
        loader: 'pug-loader',
    };

return {
    mode: env.mode || 'development',
        entry: entriesSettings,
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: '[name].[contenthash].js',
            clean: true,
        },
        resolve: {
            alias: {
                "@src": path.resolve(__dirname, "src"),
                "@assets": path.resolve(__dirname, "src/assets"),
                "@components": path.resolve(__dirname, "src/components"),
                "@pages": path.resolve(__dirname, "src/pages"),
                "@styles": path.resolve(__dirname, "src/assets/styles"),
                "@data": path.resolve(__dirname, "src/assets/data"),
            },
        },
        module: {
            rules: [
                pugLoader,
                assetsLoader,
                cssLoader,
            ],
        },
        plugins: [
            isDev && new webpack.ProgressPlugin(),
            isDev && new MiniCssExtractPlugin({
                filename: 'css/[name].[contenthash:8].css',
                chunkFilename: 'css/[name].[contenthash:8].css',
            }),
            ...htmlWebpackPluginSetting,
        ],
        devtool: isDev ? false : 'inline-source-map',
        devServer: isDev ? {
            port: env.port || 5000,
            open: true,
        } : undefined,
    };
};