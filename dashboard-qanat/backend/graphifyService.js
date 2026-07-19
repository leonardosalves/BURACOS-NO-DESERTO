import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import {
  registerExternalJob,
  updateExternalJob,
} from "./externalJobRegistry.js";

const GRAPHIFY_OUT_DIR = path.join(process.cwd(), "graphify-out");
const GRAPH_JSON_PATH = path.join(GRAPHIFY_OUT_DIR, "graph.json");
const GRAPH_HTML_PATH = path.join(GRAPHIFY_OUT_DIR, "graph.html");
const GRAPH_REPORT_PATH = path.join(GRAPHIFY_OUT_DIR, "GRAPH_REPORT.md");

export function getGraphifyStatus() {
  const exists = fs.existsSync(GRAPH_JSON_PATH);
  if (!exists) {
    return { available: false, nodeCount: 0, edgeCount: 0 };
  }
  try {
    const data = JSON.parse(fs.readFileSync(GRAPH_JSON_PATH, "utf8"));
    const nodes = Array.isArray(data.nodes) ? data.nodes.length : 0;
    const edges = Array.isArray(data.edges) ? data.edges.length : 0;
    return { available: true, nodeCount: nodes, edgeCount: edges };
  } catch (err) {
    return { available: true, nodeCount: 0, edgeCount: 0, error: err.message };
  }
}

export function getGraphifyReport() {
  if (fs.existsSync(GRAPH_REPORT_PATH)) {
    return fs.readFileSync(GRAPH_REPORT_PATH, "utf8");
  }
  return "";
}

export function getGraphifyHtmlPath() {
  if (fs.existsSync(GRAPH_HTML_PATH)) {
    return GRAPH_HTML_PATH;
  }
  return null;
}

export function runGraphifyExtract() {
  const jobId = `graphify-extract-${Date.now()}`;
  registerExternalJob(jobId, "Extraindo grafo da base de código...");

  const child = spawn("graphify", ["extract", "./", "--code-only"], {
    cwd: process.cwd(),
    shell: true,
  });

  let output = "";
  child.stdout.on("data", (data) => {
    output += data.toString();
  });
  child.stderr.on("data", (data) => {
    output += data.toString();
  });

  child.on("close", (code) => {
    if (code === 0) {
      updateExternalJob(jobId, {
        status: "completed",
        percent: 100,
        message: "Grafo construído com sucesso!",
      });
    } else {
      updateExternalJob(jobId, {
        status: "error",
        percent: 100,
        message: `Falha na extração. Código: ${code}`,
        error: output || `Process exited with code ${code}`,
      });
    }
  });

  return jobId;
}

export function runGraphifyQuery(type, query, queryB = "") {
  return new Promise((resolve, reject) => {
    let args = [];
    if (type === "explain") {
      args = ["explain", query];
    } else if (type === "path") {
      args = ["path", query, queryB];
    } else {
      args = ["query", query];
    }

    const child = spawn("graphify", args, {
      cwd: process.cwd(),
      shell: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(
          new Error(
            stderr || stdout || `Graphify query falhou com código ${code}`
          )
        );
      }
    });
  });
}
