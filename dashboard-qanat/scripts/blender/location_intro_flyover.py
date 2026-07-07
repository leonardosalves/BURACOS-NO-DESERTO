"""
Lumiera — voo satélite location-intro via Blender (headless).
Job JSON (-- job_path):
  lat, lng, zoom_levels[], duration_sec, fps, output_mp4,
  texture_wide, texture_tight, boundary_geojson (path opcional),
  place_type, accent_color, use_blender_gis (bool)
"""

from __future__ import annotations

import json
import math
import os
import sys
from pathlib import Path

# Pillow/PyProj locais (scripts/install-blendergis.ps1) — antes de bpy/blendergis
_DEPS = Path(__file__).resolve().parent / "python-deps"
if _DEPS.is_dir():
    _deps_str = str(_DEPS)
    if _deps_str not in sys.path:
        sys.path.insert(0, _deps_str)

import bpy
from mathutils import Vector


def log(msg: str) -> None:
    print(f"[lumiera-blender] {msg}", flush=True)


def parse_job() -> dict:
    argv = sys.argv
    if "--" in argv:
        idx = argv.index("--")
        args = argv[idx + 1 :]
    else:
        args = []
    if not args:
        raise SystemExit("Uso: blender --background --python location_intro_flyover.py -- job.json")
    job_path = Path(args[0]).resolve()
    with job_path.open("r", encoding="utf-8") as f:
        return json.load(f)


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in bpy.data.meshes:
        if block.users == 0:
            bpy.data.meshes.remove(block)
    for block in bpy.data.materials:
        if block.users == 0:
            bpy.data.materials.remove(block)
    for block in bpy.data.images:
        if block.users == 0:
            bpy.data.images.remove(block)


def zoom_to_height(zoom: float) -> float:
    z = max(1.0, min(20.0, float(zoom)))
    return 40_075_000 / (2**z)


def enable_blender_gis() -> bool:
    try:
        bpy.ops.preferences.addon_enable(module="blendergis")
        return "blendergis" in bpy.context.preferences.addons
    except Exception as err:
        log(f"BlenderGIS indisponível: {err}")
        return False


def latlng_to_local(lat: float, lng: float, center_lat: float, center_lng: float) -> tuple[float, float]:
    x = (lng - center_lng) * 111_320 * math.cos(math.radians(center_lat))
    y = (lat - center_lat) * 111_320
    return x, y


def create_textured_ground(texture_path: str, size_m: float = 80_000) -> bpy.types.Object:
    bpy.ops.mesh.primitive_plane_add(size=size_m, location=(0, 0, 0))
    ground = bpy.context.active_object
    ground.name = "LumieraGround"
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.subdivide(number_cuts=24)
    bpy.ops.object.mode_set(mode="OBJECT")

    mat = bpy.data.materials.new(name="SatelliteMat")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    tex = nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(texture_path)
    tex.interpolation = "Linear"
    links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])
    ground.data.materials.append(mat)
    return ground


def import_boundary_curve(geo_path: str, center_lat: float, center_lng: float, accent: str) -> None:
    if not geo_path or not os.path.isfile(geo_path):
        return
    with open(geo_path, "r", encoding="utf-8") as f:
        geo = json.load(f)

    rings: list[list] = []
    gtype = geo.get("type")
    if gtype == "Polygon":
        rings = [geo.get("coordinates", [[]])[0]]
    elif gtype == "MultiPolygon":
        rings = [poly[0] for poly in geo.get("coordinates", []) if poly]

    for ring in rings:
        if not ring or len(ring) < 3:
            continue
        curve = bpy.data.curves.new("Boundary", type="CURVE")
        curve.dimensions = "3D"
        spline = curve.splines.new("POLY")
        spline.points.add(len(ring) - 1)
        for i, pt in enumerate(ring):
            lng, lat = float(pt[0]), float(pt[1])
            x, y = latlng_to_local(lat, lng, center_lat, center_lng)
            spline.points[i].co = (x, y, 8.0)
            spline.points[i].radius = 1.0
        obj = bpy.data.objects.new("BoundaryLine", curve)
        obj.location = (0, 0, 0)
        bpy.context.collection.objects.link(obj)
        mat = bpy.data.materials.new("BoundaryMat")
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        if bsdf:
            col = tuple(int(accent.lstrip("#")[i : i + 2], 16) / 255 for i in (0, 2, 4)) + (1,)
            bsdf.inputs["Base Color"].default_value = col
            bsdf.inputs["Emission"].default_value = col
            bsdf.inputs["Emission Strength"].default_value = 1.2
        obj.data.bevel_depth = 120
        obj.data.materials.append(mat)


def try_gis_terrain(job: dict) -> bool:
    if not job.get("use_blender_gis"):
        return False
    if not enable_blender_gis():
        return False
    # dem_query exige cena georreferenciada; em headless usamos textura Esri local
    log("BlenderGIS ativo — terreno DEM requer georef manual; usando textura")
    return False


def setup_camera(job: dict) -> bpy.types.Object:
    zoom_levels = job.get("zoom_levels") or [3, 6, 10, 14]
    lat = float(job["lat"])
    lng = float(job["lng"])
    duration = float(job.get("duration_sec") or 8)
    fps = int(job.get("fps") or 30)
    frames = max(2, int(duration * fps))

    bpy.ops.object.camera_add(location=(0, 0, zoom_to_height(zoom_levels[0])))
    cam = bpy.context.active_object
    cam.name = "FlyCamera"
    cam.data.lens = 35
    bpy.context.scene.camera = cam

    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = frames
    scene.render.fps = fps

    keys = len(zoom_levels)
    for i, zoom in enumerate(zoom_levels):
        frame = 1 + int((i / max(keys - 1, 1)) * (frames - 1))
        height = zoom_to_height(zoom)
        # câmera olhando para o centro (0,0,0)
        cam.location = (0, -height * 0.15, height)
        cam.rotation_euler = (math.radians(55), 0, 0)
        cam.keyframe_insert(data_path="location", frame=frame)
        cam.keyframe_insert(data_path="rotation_euler", frame=frame)

    return cam


def setup_render(job: dict) -> None:
    out = Path(job["output_mp4"]).resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    scene = bpy.context.scene
    engine = "BLENDER_EEVEE"
    if hasattr(bpy.types, "Scene") and "eevee" in dir(scene):
        try:
            scene.render.engine = "BLENDER_EEVEE_NEXT"
            engine = scene.render.engine
        except Exception:
            scene.render.engine = "BLENDER_EEVEE"
    else:
        scene.render.engine = "BLENDER_EEVEE"
    log(f"Render engine: {engine}")

    scene.render.resolution_x = int(job.get("width") or 1280)
    scene.render.resolution_y = int(job.get("height") or 720)
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "FFMPEG"
    scene.render.ffmpeg.format = "MPEG4"
    scene.render.ffmpeg.codec = "H264"
    scene.render.ffmpeg.constant_rate_factor = "MEDIUM"
    scene.render.ffmpeg.ffmpeg_preset = "GOOD"
    scene.render.filepath = str(out.with_suffix(""))


def main() -> None:
    job = parse_job()
    clear_scene()

    lat = float(job["lat"])
    lng = float(job["lng"])
    texture = job.get("texture_tight") or job.get("texture_wide")
    if not texture or not os.path.isfile(texture):
        raise SystemExit(f"Textura satélite ausente: {texture}")

    if not try_gis_terrain(job):
        create_textured_ground(texture)

    import_boundary_curve(
        job.get("boundary_geojson") or "",
        lat,
        lng,
        str(job.get("accent_color") or "#C5A889"),
    )
    setup_camera(job)
    setup_render(job)

    log(f"Renderizando → {job['output_mp4']}")
    bpy.ops.render.render(animation=True)

    out = Path(job["output_mp4"])
    if not out.is_file():
        # Blender pode gravar sem extensão
        alt = Path(str(out.with_suffix("")))
        if alt.is_file():
            alt.rename(out)
    if not out.is_file():
        raise SystemExit(f"MP4 não gerado: {out}")

    print(json.dumps({"ok": True, "output": str(out)}), flush=True)


if __name__ == "__main__":
    main()