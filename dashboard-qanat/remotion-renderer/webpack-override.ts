import path from "path";
import type { Configuration } from "webpack";

/** Remotion CLI compila o config como CJS — import.meta.url fica vazio. */
function resolveRendererRoot(): string {
  const cwd = path.resolve(process.cwd());
  if (cwd.replace(/\\/g, "/").includes("remotion-renderer")) {
    return cwd;
  }
  return path.resolve(cwd, "dashboard-qanat", "remotion-renderer");
}

const rendererRoot = resolveRendererRoot();
const sharedRoot = path.resolve(rendererRoot, "..", "shared");

type WebpackAlias = NonNullable<Configuration["resolve"]>["alias"];

function mergeWebpackAlias(
  existing: WebpackAlias | undefined,
  additions: Record<string, string>
): WebpackAlias {
  const additionNames = new Set(Object.keys(additions));

  if (Array.isArray(existing)) {
    const kept = existing.filter(
      (entry) =>
        typeof entry === "object" &&
        entry !== null &&
        "name" in entry &&
        !additionNames.has(String(entry.name))
    );
    return [
      ...kept,
      ...Object.entries(additions).map(([name, aliasPath]) => ({
        name,
        alias: aliasPath,
      })),
    ];
  }

  const base =
    existing && typeof existing === "object"
      ? { ...(existing as Record<string, string>) }
      : {};
  return { ...base, ...additions };
}

export const webpackOverride = (config: Configuration): Configuration => {
  const plugins = [...(config.plugins || [])];
  try {
    const CopyWebpackPlugin = require("copy-webpack-plugin");
    plugins.push(
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.join(
              rendererRoot,
              "node_modules/cesium/Build/Cesium/Workers"
            ),
            to: "cesium/Workers",
          },
          {
            from: path.join(
              rendererRoot,
              "node_modules/cesium/Build/Cesium/ThirdParty"
            ),
            to: "cesium/ThirdParty",
          },
          {
            from: path.join(
              rendererRoot,
              "node_modules/cesium/Build/Cesium/Assets"
            ),
            to: "cesium/Assets",
          },
          {
            from: path.join(
              rendererRoot,
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
      alias: mergeWebpackAlias(config.resolve?.alias, {
        "@lumiera/shared": sharedRoot,
        "@lumiera/shared/cesiumFly.js": path.join(sharedRoot, "cesiumFly.js"),
        cesium: path.join(rendererRoot, "node_modules/cesium/Source/Cesium.js"),
      }),
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
