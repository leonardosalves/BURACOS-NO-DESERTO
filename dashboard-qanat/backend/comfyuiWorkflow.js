const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SKIP_TYPES = new Set(["MarkdownNote", "RandomIntegerNodeEfficient"]);

let objectInfoCache = null;
let objectInfoFetchedAt = 0;
const OBJECT_INFO_TTL_MS = 5 * 60 * 1000;

function isSubgraphDefinition(sg) {
  return Boolean(
    sg &&
    typeof sg.id === "string" &&
    typeof sg.name === "string" &&
    Array.isArray(sg.nodes) &&
    sg.inputNode &&
    sg.outputNode
  );
}

function isSubgraphType(type) {
  return UUID_RE.test(type);
}

function collectSubgraphDefinitions(definitions) {
  const result = [];
  const seen = new Set();

  function collect(list) {
    for (const sg of list || []) {
      if (!isSubgraphDefinition(sg) || seen.has(sg.id)) continue;
      seen.add(sg.id);
      result.push(sg);
      collect(sg.definitions?.subgraphs);
    }
  }

  collect(definitions?.subgraphs || []);
  return result;
}

function buildSubgraphExecutionPaths(topNodes, subgraphs) {
  const sgMap = new Map(subgraphs.map((sg) => [sg.id, sg]));
  const paths = new Map();
  const visiting = new Set();

  function build(nodes, prefix) {
    for (const node of nodes || []) {
      if (!isSubgraphType(node.type) || !sgMap.has(node.type) || visiting.has(node.type)) continue;
      const instancePath = prefix ? `${prefix}:${node.id}` : String(node.id);
      const existing = paths.get(node.type) || [];
      existing.push(instancePath);
      paths.set(node.type, existing);
      visiting.add(node.type);
      build(sgMap.get(node.type).nodes, instancePath);
      visiting.delete(node.type);
    }
  }

  build(topNodes, "");
  return paths;
}

function flattenWorkflowNodes(workflow) {
  const subgraphs = collectSubgraphDefinitions(workflow.definitions);
  const sgMap = new Map(subgraphs.map((sg) => [sg.id, sg]));
  const paths = buildSubgraphExecutionPaths(workflow.nodes || [], subgraphs);
  const flat = [...(workflow.nodes || [])];

  for (const [sgId, instances] of paths.entries()) {
    const sg = sgMap.get(sgId);
    if (!sg?.nodes) continue;
    for (const prefix of instances) {
      for (const node of sg.nodes) {
        flat.push({
          ...node,
          id: `${prefix}:${node.id}`,
          _instancePrefix: prefix,
          _subgraphId: sgId,
        });
      }
    }
  }

  return { flat, subgraphs, sgMap, paths };
}

function normalizeLinks(links) {
  const normalized = [];
  for (const link of links || []) {
    if (Array.isArray(link)) {
      const [id, origin_id, origin_slot, target_id, target_slot, type] = link;
      normalized.push({ id, origin_id, origin_slot, target_id, target_slot, type });
    } else if (link && typeof link === "object") {
      normalized.push(link);
    }
  }
  return normalized;
}

function buildLinkIndexes(workflow, subgraphs, sgMap, paths) {
  const byId = new Map();
  const incomingByTarget = new Map();

  function addLink(link, prefix, wrapperByPrefix) {
    const resolved = {
      ...link,
      origin_id: resolveLinkEndpoint(link.origin_id, prefix, wrapperByPrefix, "origin"),
      target_id: resolveLinkEndpoint(link.target_id, prefix, wrapperByPrefix, "target"),
    };
    byId.set(link.id, resolved);
    const key = endpointKey(resolved.target_id, resolved.target_slot);
    const bucket = incomingByTarget.get(key) || [];
    bucket.push(resolved);
    incomingByTarget.set(key, bucket);
  }

  const wrapperByPrefix = new Map();
  for (const [sgId, instances] of paths.entries()) {
    const sg = sgMap.get(sgId);
    if (!sg) continue;
    for (const prefix of instances) {
      const wrapperId = Number(prefix.split(":").pop());
      const wrapper = (workflow.nodes || []).find((n) => String(n.id) === String(wrapperId));
      if (wrapper) wrapperByPrefix.set(prefix, { wrapper, subgraph: sg });
    }
  }

  for (const link of normalizeLinks(workflow.links)) {
    addLink(link, null, wrapperByPrefix);
  }

  for (const [sgId, instances] of paths.entries()) {
    const sg = sgMap.get(sgId);
    if (!sg) continue;
    for (const prefix of instances) {
      for (const link of normalizeLinks(sg.links)) {
        addLink(link, prefix, wrapperByPrefix);
      }
    }
  }

  return { byId, incomingByTarget, wrapperByPrefix };
}

function endpointKey(nodeId, slot) {
  return `${nodeId}:${slot}`;
}

function resolveLinkEndpoint(endpoint, prefix, wrapperByPrefix, role) {
  if (endpoint === -10 || endpoint === "-10") return endpoint;
  if (endpoint === -20 || endpoint === "-20") {
    if (!prefix) return endpoint;
    const ctx = wrapperByPrefix.get(prefix);
    return ctx ? String(ctx.wrapper.id) : endpoint;
  }
  if (prefix && typeof endpoint === "number" && endpoint > 0) {
    return `${prefix}:${endpoint}`;
  }
  return String(endpoint);
}

function resolveInputSource(originId, originSlot) {
  if (originId === -10 || originId === "-10") return undefined;
  return [String(originId), originSlot];
}

function resolveWrapperInputValue(wrapper, subgraph, inputName, workflow, seed, nodeTypeById) {
  const widgetMap = buildProxyWidgetMap(wrapper);
  const widgetIdx = widgetMap[inputName];
  const wrapperInput = (wrapper.inputs || []).find((i) => i.name === inputName);

  if (wrapperInput?.link != null) {
    const topLink = normalizeLinks(workflow.links).find((l) => l.id === wrapperInput.link);
    if (topLink) {
      const originType = nodeTypeById.get(String(topLink.origin_id));
      if (SKIP_TYPES.has(originType)) return seed;
      return [String(topLink.origin_id), topLink.origin_slot];
    }
  }

  if (widgetIdx != null) return wrapper.widgets_values?.[widgetIdx];
  return undefined;
}

function buildInputLiteralValues(wrapperByPrefix, workflow, seed) {
  const values = new Map();
  const nodeTypeById = new Map((workflow.nodes || []).map((n) => [String(n.id), n.type]));

  for (const [prefix, { wrapper, subgraph }] of wrapperByPrefix.entries()) {
    for (const link of normalizeLinks(subgraph.links)) {
      if (link.origin_id !== -10 && link.origin_id !== "-10") continue;
      const sgInput = subgraph.inputs?.[link.origin_slot];
      const inputName = sgInput?.name;
      if (!inputName) continue;
      const targetId = `${prefix}:${link.target_id}`;
      const resolved = resolveWrapperInputValue(wrapper, subgraph, inputName, workflow, seed, nodeTypeById);
      values.set(endpointKey(targetId, link.target_slot), resolved);
    }
  }

  return values;
}

function buildWrapperOutputLinks(wrapperByPrefix) {
  const outputs = new Map();

  for (const [prefix, { wrapper, subgraph }] of wrapperByPrefix.entries()) {
    const wrapperOutputs = new Map();
    for (const link of normalizeLinks(subgraph.links)) {
      if (link.target_id !== -20 && link.target_id !== "-20") continue;
      wrapperOutputs.set(link.target_slot, [`${prefix}:${link.origin_id}`, link.origin_slot]);
    }
    outputs.set(String(wrapper.id), wrapperOutputs);
  }

  return outputs;
}

const CONNECTION_TYPES = new Set([
  "IMAGE", "LATENT", "CONDITIONING", "MODEL", "CLIP", "VAE", "MASK", "AUDIO", "VIDEO",
  "GUIDER", "SAMPLER", "SIGMAS", "NOISE", "LATENT_UPSCALE_MODEL",
]);

function isConnectionInputSpec(spec) {
  if (!Array.isArray(spec) || spec.length === 0) return false;
  const first = spec[0];
  if (Array.isArray(first)) return false;
  return typeof first === "string" && CONNECTION_TYPES.has(first);
}

function getOrderedInputNames(classType, objectInfo) {
  const info = objectInfo?.[classType];
  if (!info) return [];
  const order = info.input_order;
  if (order) {
    return [...(order.required || []), ...(order.optional || []), ...(order.hidden || [])];
  }
  const names = [];
  for (const bucket of ["required", "optional", "hidden"]) {
    const section = info.input?.[bucket];
    if (!section) continue;
    names.push(...Object.keys(section));
  }
  return names;
}

function buildProxyWidgetMap(wrapper) {
  const map = {};
  let widgetCursor = 0;
  for (const entry of wrapper.properties?.proxyWidgets || []) {
    const [nodeId, widgetName] = entry;
    if (nodeId === "-1" && widgetName) {
      map[widgetName] = widgetCursor++;
    }
  }
  return map;
}

function nodeToApiEntry(node, linkIndexes, inputLiterals, objectInfo) {
  const classType = node.type;
  const inputs = {};
  const widgetValues = [...(node.widgets_values || [])];
  const info = objectInfo?.[classType];
  const orderedNames = getOrderedInputNames(classType, objectInfo);
  let widgetIdx = 0;

  for (const input of node.inputs || []) {
    if (input.link == null) continue;
    const link = linkIndexes.byId.get(input.link);
    if (!link) continue;

    const literalKey = endpointKey(node.id, link.target_slot);
    if (inputLiterals.has(literalKey)) {
      inputs[input.name] = inputLiterals.get(literalKey);
      continue;
    }

    const source = resolveInputSource(link.origin_id, link.origin_slot);
    if (source !== undefined) inputs[input.name] = source;
    else if (link.origin_id !== -10 && link.origin_id !== "-10") {
      inputs[input.name] = [String(link.origin_id), link.origin_slot];
    }
  }

  for (const name of orderedNames) {
    let spec;
    for (const bucket of ["required", "optional"]) {
      spec = info?.input?.[bucket]?.[name];
      if (spec) break;
    }
    if (!spec || isConnectionInputSpec(spec)) continue;

    const nodeInput = (node.inputs || []).find((input) => input.name === name);
    if (nodeInput?.link != null) {
      if (widgetIdx < widgetValues.length) widgetIdx++;
      continue;
    }

    if (name in inputs) continue;

    if (widgetIdx < widgetValues.length) {
      inputs[name] = widgetValues[widgetIdx++];
    }
  }

  return {
    class_type: classType,
    inputs,
    _meta: { title: node.title || classType },
  };
}

export async function fetchObjectInfo(baseUrl = "http://127.0.0.1:8188") {
  const now = Date.now();
  if (objectInfoCache && now - objectInfoFetchedAt < OBJECT_INFO_TTL_MS) {
    return objectInfoCache;
  }
  const res = await fetch(`${baseUrl}/object_info`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`ComfyUI object_info falhou: ${res.status}`);
  objectInfoCache = await res.json();
  objectInfoFetchedAt = now;
  return objectInfoCache;
}

function patchAllWorkflowNodes(workflow, patch) {
  const nodeLists = [workflow.nodes || []];
  for (const sg of collectSubgraphDefinitions(workflow.definitions)) {
    nodeLists.push(sg.nodes || []);
  }

  for (const nodes of nodeLists) {
    for (const node of nodes) {
      if (node.type === "ImageScaleBy" && patch.upscale_scale != null) {
        const vals = [...(node.widgets_values || ["nearest-exact", 0.5])];
        vals[1] = patch.upscale_scale;
        node.widgets_values = vals;
      }
      if (node.type === "LatentUpscaleModelLoader" && patch.upscale_model) {
        node.widgets_values = [patch.upscale_model];
      }
      if (node.type === "UnetLoaderGGUF" && patch.model_gguf) {
        node.widgets_values = [patch.model_gguf];
      }
      if (node.type === "LoraLoaderModelOnly" && patch.lora_name) {
        const vals = [...(node.widgets_values || [])];
        vals[0] = patch.lora_name;
        if (patch.lora_strength != null) vals[1] = patch.lora_strength;
        node.widgets_values = vals;
      }
    }
  }
}

export async function workflowUiToApi(workflow, { baseUrl = "http://127.0.0.1:8188", patch = {} } = {}) {
  applyWorkflowPatch(workflow, patch);
  const seed = patch.seed ?? Math.floor(Math.random() * 2 ** 31);

  const objectInfo = await fetchObjectInfo(baseUrl);
  const { flat, subgraphs, sgMap, paths } = flattenWorkflowNodes(workflow);
  const linkIndexes = buildLinkIndexes(workflow, subgraphs, sgMap, paths);
  const inputLiterals = buildInputLiteralValues(linkIndexes.wrapperByPrefix, workflow, seed);
  const wrapperOutputs = buildWrapperOutputLinks(linkIndexes.wrapperByPrefix);

  const prompt = {};
  const wrapperIds = new Set(
    [...linkIndexes.wrapperByPrefix.values()].map(({ wrapper }) => String(wrapper.id))
  );

  for (const node of flat) {
    if (SKIP_TYPES.has(node.type)) continue;
    if (isSubgraphType(node.type)) continue;
    if (wrapperIds.has(String(node.id))) continue;

    const entry = nodeToApiEntry(node, linkIndexes, inputLiterals, objectInfo);
    prompt[String(node.id)] = entry;
  }

  // Rewire top-level links that originate from subgraph wrappers.
  for (const link of normalizeLinks(workflow.links)) {
    const originId = String(link.origin_id);
    const outputs = wrapperOutputs.get(originId);
    if (!outputs) continue;
    const source = outputs.get(link.origin_slot);
    if (!source) continue;

    const targetId = String(link.target_id);
    const targetEntry = prompt[targetId];
    if (!targetEntry) continue;

    const targetNode = flat.find((n) => String(n.id) === targetId);
    const inputName = targetNode?.inputs?.[link.target_slot]?.name;
    if (inputName) targetEntry.inputs[inputName] = source;
  }

  pruneDanglingReferences(prompt);
  applyModelPatch(prompt, patch.models || {});
  applyUpscaleBypass(prompt, patch.upscale === "none");

  return { prompt, seed };
}

function applyWorkflowPatch(workflow, patch) {
  if (!patch || Object.keys(patch).length === 0) return;

  patchAllWorkflowNodes(workflow, patch);

  const wrapper = (workflow.nodes || []).find((n) => isSubgraphType(n.type));
  if (wrapper) {
    const values = [...(wrapper.widgets_values || [])];
    if (patch.prompt != null) values[0] = patch.prompt;
    if (patch.width != null) values[1] = patch.width;
    if (patch.height != null) values[2] = patch.height;
    if (patch.frames != null) values[3] = patch.frames;
    wrapper.widgets_values = values;
  }

  const saveNode = (workflow.nodes || []).find((n) => n.type === "SaveVideo");
  if (saveNode) {
    const out = [...(saveNode.widgets_values || ["video/LTX-2", "auto", "auto"])];
    if (patch.filename_prefix != null) out[0] = patch.filename_prefix;
    if (patch.format != null) out[1] = patch.format;
    if (patch.codec != null) out[2] = patch.codec;
    saveNode.widgets_values = out;
  }
}

function applyModelPatch(prompt, models) {
  if (!models || Object.keys(models).length === 0) return;

  for (const entry of Object.values(prompt)) {
    if (entry.class_type === "UnetLoaderGGUF" && models.model_gguf) {
      entry.inputs.unet_name = models.model_gguf;
    }
    if (entry.class_type === "LoraLoaderModelOnly" && models.lora_name) {
      entry.inputs.lora_name = models.lora_name;
      if (models.lora_strength != null) entry.inputs.strength_model = models.lora_strength;
    }
    if (entry.class_type === "LatentUpscaleModelLoader" && models.upscale_model) {
      entry.inputs.model_name = models.upscale_model;
    }
    if (entry.class_type === "DualCLIPLoader" && models.text_encoder && models.embeddings_connector) {
      entry.inputs.clip_name1 = models.text_encoder;
      entry.inputs.clip_name2 = models.embeddings_connector;
    }
    if (entry.class_type === "VAELoader" && models.video_vae) {
      entry.inputs.vae_name = models.video_vae;
    }
    if (entry.class_type === "VAELoaderKJ" && models.audio_vae) {
      entry.inputs.vae_name = models.audio_vae;
    }
  }
}

function applyUpscaleBypass(prompt, disabled) {
  if (!disabled) return;

  let separateNodeId = null;
  let concatNodeId = null;

  for (const [id, entry] of Object.entries(prompt)) {
    if (entry.class_type === "LTXVSeparateAVLatent") separateNodeId = id;
    if (entry.class_type === "LTXVConcatAVLatent") concatNodeId = id;
  }

  if (separateNodeId && concatNodeId) {
    prompt[concatNodeId].inputs.video_latent = [separateNodeId, 0];
  }

  for (const [id, entry] of Object.entries(prompt)) {
    if (entry.class_type === "LTXVLatentUpsampler" || entry.class_type === "LatentUpscaleModelLoader") {
      delete prompt[id];
    }
  }

  pruneDanglingReferences(prompt);
}

function pruneDanglingReferences(prompt) {
  for (const entry of Object.values(prompt)) {
    for (const [key, value] of Object.entries(entry.inputs)) {
      if (Array.isArray(value) && value.length === 2 && !prompt[String(value[0])]) {
        delete entry.inputs[key];
      }
    }
  }
}