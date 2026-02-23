const path = require("path");
const fs = require("fs");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = (env, argv) => {
  const isDev = argv.mode === "development";

  return {
    entry: {
      taskpane: "./src/taskpane/index.tsx",
    },
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].bundle.js",
      clean: true,
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx"],
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"],
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: "./src/taskpane/taskpane.html",
        filename: "taskpane.html",
        chunks: ["taskpane"],
      }),
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, "dist"),
      },
      port: 3000,
      server: {
        type: "https",
        options: {
          key: fs.readFileSync(path.resolve(process.env.HOME, ".office-addin-dev-certs/localhost.key")),
          cert: fs.readFileSync(path.resolve(process.env.HOME, ".office-addin-dev-certs/localhost.crt")),
          ca: fs.readFileSync(path.resolve(process.env.HOME, ".office-addin-dev-certs/ca.crt")),
        },
      },
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
    },
    devtool: isDev ? "source-map" : false,
  };
};
