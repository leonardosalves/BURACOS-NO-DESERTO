import path from "path";
import { fileURLToPath } from "url";
import type { Configuration } from "webpack";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const webpackOverride = (config: Configuration): Configuration => {
  const plugins = [...(config.plugins || [])];
  try {
    const CopyWebpackPlugin = require("copy-webpack-plugin");
    plugins.push(
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.join(
              __dirname,
              "node_modules/cesium/Build/Cesium/Workers"
            ),
            to: "cesium/Workers",
          },
          {
            from: path.join(
              __dirname,
              "node_modules/cesium/Build/Cesium/ThirdParty"
            ),
            to: "cesium/ThirdParty",
          },
          {
            from: path.join(
              __dirname,
              "node_modules/cesium/Build/Cesium/Assets"
            ),
            to: "cesium/Assets",
          },
          {
            from: path.join(
              __dirname,
              "node_modules/cesium/Build/Cesium/Widgets"
            ),
            to: "cesium/Widgets",
          },
        ],
      })
    );
  } catch {
    /* copy-webpack-plugin opcional no primeiro install */
  }

  return {
    ...config,
    plugins,
    resolve: {
      ...config.resolve,
      alias: {
        ...(config.resolve?.alias as Record<string, string>),
        cesium: path.join(__dirname, "node_modules/cesium/Source/Cesium.js"),
      },
      fallback: {
        ...(config.resolve?.fallback as Record<string, string | false>),
        fs: false,
        http: false,
        https: false,
        zlib: false,
        url: false,
      },
    },
    module: {
      ...config.module,
      rules: [
        ...(config.module?.rules || []),
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"],
        },
      ],
    },
  };
};
