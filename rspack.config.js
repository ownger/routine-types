import path from 'path';
import { fileURLToPath } from 'url';
import { rspack } from '@rspack/core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV !== 'production';

export default {
    mode: isDev ? 'development' : 'production',

    entry: {
        main: './src/app.js',
    },

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: isDev ? '[name].js' : '[name].[contenthash:8].js',
        clean: true,
    },

    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    {
                        loader: 'builtin:lightningcss-loader',
                        options: {
                            targets: 'defaults',
                        },
                    },
                ],
                type: 'css/auto',
            },
        ],
    },

    plugins: [
        new rspack.HtmlRspackPlugin({
            template: './src/index.html',
            filename: 'index.html',
            chunks: ['main'],
            minify: !isDev, // true в production, false в dev
        }),

        new rspack.CopyRspackPlugin({
            patterns: [
                { from: 'src/manifest.json', to: 'manifest.json' },
                { from: 'src/sw.js', to: 'sw.js' },
            ],
        }),
    ],

    optimization: {
        minimize: !isDev,
    },

    devServer: {
        static: {
            directory: path.join(__dirname, 'dist'),
        },
        compress: true,
        port: 8000,
        open: true,
        hot: true,
        historyApiFallback: true,
    },

    experiments: {
        css: true,
    },

    devtool: isDev ? 'source-map' : false,
};