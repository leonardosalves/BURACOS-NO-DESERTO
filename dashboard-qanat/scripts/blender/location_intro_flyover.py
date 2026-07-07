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

EARTH_RADIUS_M = 6_371_000.0


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


def tile_span_m(lat: float, zoom: float, width: int, height: int) -> float:
    z = max(1.0, min(20.0, float(zoom)))
    meters_per_pixel = (156_543.03392 * math.cos(math.radians(lat))) / (2**z)
    return max(900.0, meters_per_pixel * max(width, height) * 1.35)


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


def boundary_span_m(geo_path: str, center_lat: float, center_lng: float) -> float:
    if not geo_path or not os.path.isfile(geo_path):
        return 80_000.0
    with open(geo_path, "r", encoding="utf-8") as f:
        geo = json.load(f)
    rings: list[list] = []
    gtype = geo.get("type")
    if gtype == "Polygon":
        rings = [geo.get("coordinates", [[]])[0]]
    elif gtype == "MultiPolygon":
        rings = [poly[0] for poly in geo.get("coordinates", []) if poly]
    min_x = min_y = float("inf")
    max_x = max_y = float("-inf")
    for ring in rings:
        for pt in ring or []:
            lng, lat = float(pt[0]), float(pt[1])
            x, y = latlng_to_local(lat, lng, center_lat, center_lng)
            min_x, max_x = min(min_x, x), max(max_x, x)
            min_y, max_y = min(min_y, y), max(max_y, y)
    if min_x == float("inf"):
        return 80_000.0
    span = max(max_x - min_x, max_y - min_y)
    return max(80_000.0, span * 1.85)


def create_textured_ground(texture_path: str, size_m: float = 80_000) -> bpy.types.Object:
    bpy.ops.mesh.primitive_plane_add(size=size_m, location=(0, 0, 12))
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


def make_emission_material(name: str, color: tuple[float, float, float, float], strength: float = 1.0) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    mat.diffuse_color = color
    if len(color) >= 4 and color[3] < 1.0:
        mat.blend_method = "BLEND"
        if hasattr(mat, "use_screen_refraction"):
            mat.use_screen_refraction = False
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    nodes.clear()
    out = nodes.new("ShaderNodeOutputMaterial")
    emission = nodes.new("ShaderNodeEmission")
    emission.inputs["Color"].default_value = color
    emission.inputs["Strength"].default_value = strength
    links.new(emission.outputs["Emission"], out.inputs["Surface"])
    return mat


def create_earth_context() -> None:
    """Adds a real curved Earth surface for the first seconds of the zoom."""
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=96,
        ring_count=48,
        radius=EARTH_RADIUS_M,
        location=(0, 0, -EARTH_RADIUS_M),
    )
    earth = bpy.context.active_object
    earth.name = "LumieraEarthCurvature"
    earth.data.materials.append(
        make_emission_material("EarthMat", (0.035, 0.11, 0.18, 1.0), 0.72)
    )

    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=96,
        ring_count=48,
        radius=EARTH_RADIUS_M * 1.006,
        location=(0, 0, -EARTH_RADIUS_M),
    )
    atmosphere = bpy.context.active_object
    atmosphere.name = "LumieraAtmosphere"
    atmosphere.data.materials.append(
        make_emission_material("AtmosphereMat", (0.14, 0.38, 0.72, 0.32), 0.18)
    )
    atmosphere.display_type = "TEXTURED"

    bpy.ops.object.light_add(type="SUN", location=(0, -2_000_000, 4_000_000))
    sun = bpy.context.active_object
    sun.name = "LumieraSun"
    sun.data.energy = 2.4

    world = bpy.context.scene.world or bpy.data.worlds.new("LumieraWorld")
    bpy.context.scene.world = world
    world.color = (0.002, 0.004, 0.008)


def create_poi_marker(job: dict) -> None:
    place_type = str(job.get("place_type") or "city")
    if place_type not in {"poi", "historic_site"}:
        return

    accent = str(job.get("accent_color") or "#C5A889").lstrip("#")
    color = (
        tuple(int(accent[i : i + 2], 16) / 255 for i in (0, 2, 4)) + (1.0,)
        if len(accent) == 6
        else (0.95, 0.82, 0.35, 1.0)
    )
    marker_mat = make_emission_material("PoiMarkerMat", color, 2.2)

    bpy.ops.mesh.primitive_torus_add(
        major_radius=150,
        minor_radius=6,
        major_segments=96,
        minor_segments=8,
        location=(0, 0, 28),
    )
    ring = bpy.context.active_object
    ring.name = "LumieraPoiTargetRing"
    ring.data.materials.append(marker_mat)

    if str(job.get("poi_kind") or "").lower() != "bridge":
        bpy.ops.mesh.primitive_cone_add(vertices=48, radius1=42, radius2=0, depth=125, location=(0, 0, 95))
        pin = bpy.context.active_object
        pin.name = "LumieraPoiPin"
        pin.data.materials.append(marker_mat)
        return

    deck_mat = make_emission_material("BridgeDeckMat", (0.9, 0.92, 0.88, 1.0), 0.85)
    cable_mat = make_emission_material("BridgeCableMat", color, 1.8)

    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, 115))
    deck = bpy.context.active_object
    deck.name = "LumieraBridgeDeck"
    deck.dimensions = (360, 28, 14)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    deck.rotation_euler[2] = math.radians(14)
    deck.data.materials.append(deck_mat)

    for x in (-75, 75):
        bpy.ops.mesh.primitive_cube_add(size=1, location=(x * 1.35, 0, 190))
        tower = bpy.context.active_object
        tower.name = "LumieraBridgeTower"
        tower.dimensions = (14, 22, 150)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        tower.rotation_euler[2] = deck.rotation_euler[2]
        tower.data.materials.append(deck_mat)

    for y in (-7, 7):
        curve = bpy.data.curves.new("LumieraBridgeCable", type="CURVE")
        curve.dimensions = "3D"
        curve.bevel_depth = 2.2
        spline = curve.splines.new("POLY")
        spline.points.add(4)
        pts = [(-180, y, 125), (-102, y, 250), (0, y, 225), (102, y, 250), (180, y, 125)]
        for i, pt in enumerate(pts):
            spline.points[i].co = (*pt, 1.0)
        obj = bpy.data.objects.new("LumieraBridgeCable", curve)
        obj.rotation_euler[2] = deck.rotation_euler[2]
        bpy.context.collection.objects.link(obj)
        obj.data.materials.append(cable_mat)


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
            # POLY spline points use 4D homogeneous coords (x, y, z, w).
            spline.points[i].co = (x, y, 8.0, 1.0)
            spline.points[i].radius = 1.0
        obj = bpy.data.objects.new("BoundaryLine", curve)
        obj.location = (0, 0, 0)
        bpy.context.collection.objects.link(obj)
        mat = bpy.data.materials.new("BoundaryMat")
        mat.use_nodes = True
        nodes = mat.node_tree.nodes
        links = mat.node_tree.links
        nodes.clear()
        out = nodes.new("ShaderNodeOutputMaterial")
        emission = nodes.new("ShaderNodeEmission")
        raw = accent.lstrip("#")
        col = (
            tuple(int(raw[i : i + 2], 16) / 255 for i in (0, 2, 4)) + (1.0,)
            if len(raw) == 6
            else (0.77, 0.66, 0.54, 1.0)
        )
        emission.inputs["Color"].default_value = col
        emission.inputs["Strength"].default_value = 1.2
        links.new(emission.outputs["Emission"], out.inputs["Surface"])
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
    duration = float(job.get("duration_sec") or 8)
    fps = int(job.get("fps") or 30)
    frames = max(2, int(duration * fps))
    place_type = str(job.get("place_type") or "city")
    orbit_poi = bool(job.get("orbit_poi")) and place_type in {"poi", "historic_site"}
    show_city = place_type == "city"

    target = bpy.data.objects.new("FlyTarget", None)
    target.location = (0, 0, 0)
    bpy.context.collection.objects.link(target)

    start_height = max(zoom_to_height(zoom_levels[0]), EARTH_RADIUS_M * 1.55)
    final_height = zoom_to_height(zoom_levels[-1])
    if show_city:
        final_height = max(final_height, 38_000.0)
    else:
        final_height = min(max(final_height, 900.0), 1400.0)

    bpy.ops.object.camera_add(location=(0, -start_height * 0.34, start_height))
    cam = bpy.context.active_object
    cam.name = "FlyCamera"
    cam.data.lens = 30
    cam.data.sensor_width = 32
    track = cam.constraints.new(type="TRACK_TO")
    track.target = target
    track.track_axis = "TRACK_NEGATIVE_Z"
    track.up_axis = "UP_Y"
    bpy.context.scene.camera = cam

    scene = bpy.context.scene
    scene.frame_start = 1
    scene.frame_end = frames
    scene.render.fps = fps

    descent_end = int(frames * 0.72) if orbit_poi else frames
    descent_key_count = max(18, int(duration * 4))
    for i in range(descent_key_count):
        t = i / max(descent_key_count - 1, 1)
        eased = 1 - (1 - t) ** 3
        frame = 1 + int(eased * max(descent_end - 1, 1))
        log_height = math.log(start_height) + (math.log(final_height) - math.log(start_height)) * eased
        height = math.exp(log_height)
        lateral = height * (0.34 * (1 - eased) + (0.032 if orbit_poi else 0.055) * eased)
        cam.location = (
            math.sin(eased * math.pi * 0.26) * lateral * 0.28,
            -lateral,
            height,
        )
        cam.data.lens = 30 + (42 if show_city else 78) * eased
        cam.keyframe_insert(data_path="location", frame=frame)
        cam.data.keyframe_insert(data_path="lens", frame=frame)

    if orbit_poi:
        radius = max(final_height * 0.72, 650.0)
        orbit_frames = max(2, frames - descent_end)
        for step in range(orbit_frames + 1):
            frame = descent_end + step
            t = step / max(orbit_frames, 1)
            angle = t * math.pi * 2
            cam.location = (
                math.sin(angle) * radius,
                -math.cos(angle) * radius,
                final_height * 0.62,
            )
            cam.keyframe_insert(data_path="location", frame=frame)
            cam.data.lens = 82
            cam.data.keyframe_insert(data_path="lens", frame=frame)

    for action_owner in (cam, cam.data):
        action = getattr(getattr(action_owner, "animation_data", None), "action", None)
        fcurves = getattr(action, "fcurves", None)
        if not fcurves:
            continue
        for fcurve in fcurves:
            for kp in fcurve.keyframe_points:
                kp.interpolation = "BEZIER"
                kp.easing = "EASE_IN_OUT"

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
    img = scene.render.image_settings
    # Blender 5+: VIDEO media type; Blender 4.x: FFMPEG file_format.
    if hasattr(img, "media_type"):
        img.media_type = "VIDEO"
    else:
        img.file_format = "FFMPEG"
    scene.render.ffmpeg.format = "MPEG4"
    scene.render.ffmpeg.codec = "H264"
    scene.render.ffmpeg.constant_rate_factor = "MEDIUM"
    scene.render.ffmpeg.ffmpeg_preset = "GOOD"
    scene.render.use_file_extension = True
    scene.render.filepath = str(out.with_suffix(""))


def resolve_rendered_mp4(expected: Path) -> Path | None:
    stem = expected.with_suffix("")
    # Blender 5 pode gravar com sufixo de faixa: name0001-0360.mp4.
    matches = sorted(
        [p for p in expected.parent.glob(f"{stem.name}*.mp4") if p.is_file() and p.stat().st_size > 0],
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    if matches:
        return matches[0]
    alt = Path(str(stem))
    if alt.is_file():
        return alt
    if expected.is_file():
        return expected
    return None


def main() -> None:
    job = parse_job()
    clear_scene()

    lat = float(job["lat"])
    lng = float(job["lng"])
    texture = job.get("texture_tight") or job.get("texture_wide")
    if not texture or not os.path.isfile(texture):
        raise SystemExit(f"Textura satélite ausente: {texture}")

    place_type = str(job.get("place_type") or "city")
    if place_type in {"poi", "historic_site"}:
        zoom_levels = job.get("zoom_levels") or [3, 6, 10, 14, 17]
        ground_size = tile_span_m(
            lat,
            float(zoom_levels[-1]),
            int(job.get("width") or 1280),
            int(job.get("height") or 720),
        )
    else:
        ground_size = boundary_span_m(
            job.get("boundary_geojson") or "",
            lat,
            lng,
        )
    if not try_gis_terrain(job):
        create_earth_context()
        create_textured_ground(texture, size_m=ground_size)

    import_boundary_curve(
        job.get("boundary_geojson") or "",
        lat,
        lng,
        str(job.get("accent_color") or "#C5A889"),
    )
    create_poi_marker(job)
    setup_camera(job)
    setup_render(job)

    log(f"Renderizando → {job['output_mp4']}")
    bpy.ops.render.render(animation=True)

    out = Path(job["output_mp4"])
    rendered = resolve_rendered_mp4(out)
    if not rendered:
        raise SystemExit(f"MP4 não gerado: {out}")
    if rendered != out:
        if out.is_file():
            out.unlink()
        rendered.rename(out)

    print(json.dumps({"ok": True, "output": str(out)}), flush=True)


if __name__ == "__main__":
    main()
