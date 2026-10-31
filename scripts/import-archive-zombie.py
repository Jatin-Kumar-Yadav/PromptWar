"""blender --background --python scripts/import-archive-zombie.py
Publisher's CC0 pack: https://quaternius.com/packs/animatedzombie.html
"""
import bpy, os, json, subprocess, hashlib
from pathlib import Path
root = Path(__file__).resolve().parent.parent
sources = {'archive-zombie.blend': '1C7N1EADKkEpSQVpY9QFesECHkU71Qnkp', 'ZombieTexture.png': '1NSJdgIIwWOXsrUzCz_c_QR05cI9y3W9H'}
for filename, identifier in sources.items():
    path = Path('/tmp') / filename
    if not path.exists():
        subprocess.run(['curl', '-fsSL', 'https://drive.usercontent.google.com/download?id=' + identifier + '&export=download', '-o', str(path)], check=True)
bpy.ops.wm.open_mainfile(filepath='/tmp/archive-zombie.blend', use_scripts=False)
print('ACTIONS', [(a.name, tuple(a.frame_range)) for a in bpy.data.actions])
print('MESHES', [(o.name, len(o.data.polygons)) for o in bpy.data.objects if o.type == 'MESH'])
print('IMAGES', [(i.name, i.filepath) for i in bpy.data.images])
print('EXPORT_MODES', [p.identifier for p in bpy.ops.export_scene.gltf.get_rna_type().properties if 'animation' in p.identifier])
image = bpy.data.images.load('/tmp/ZombieTexture.png', check_existing=True)
for material in bpy.data.materials:
    material.use_nodes = True
    material.node_tree.nodes.clear()
    principled = material.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    output = material.node_tree.nodes.new('ShaderNodeOutputMaterial')
    material.node_tree.links.new(principled.outputs['BSDF'], output.inputs['Surface'])
    if principled:
        tex = material.node_tree.nodes.new('ShaderNodeTexImage')
        tex.image = image
        material.node_tree.links.new(tex.outputs['Color'], principled.inputs['Base Color'])
        principled.inputs['Roughness'].default_value = 0.9
        principled.inputs['Alpha'].default_value = 1
for obj in bpy.data.objects:
    if obj.type not in ['MESH', 'ARMATURE']: bpy.data.objects.remove(obj, do_unlink=True)
    elif obj.type == 'MESH':
        print('UVS', obj.name, len(obj.data.uv_layers), 'MATERIALS', [m.name for m in obj.data.materials if m])
        if not obj.data.materials: obj.data.materials.append(next(m for m in bpy.data.materials if m.use_nodes))
for action in bpy.data.actions:
    for curve in action.fcurves:
        curve.data_path = curve.data_path.replace('mixamorig_', '')
    action.name = {'ZombieIdle':'Idle', 'ZombieWalk':'Walk', 'ZombieRun':'Run', 'ZombieAttack':'Idle_Attack'}.get(action.name, action.name)
target = root / 'public/assets/quaternius/archive-zombie.glb'
bpy.ops.export_scene.gltf(filepath=str(target), export_format='GLB', export_animations=True, export_animation_mode='ACTIONS', export_yup=True)
manifest_path = target.parent / 'manifest.json'
manifest = json.loads(manifest_path.read_text())
manifest['assets'] = [a for a in manifest['assets'] if a['name'] != 'archive-zombie']
manifest['assets'].append({'name':'archive-zombie', 'author':'Quaternius', 'license':'CC0-1.0', 'source':'https://quaternius.com/packs/animatedzombie.html', 'sources':sources, 'sha256':hashlib.sha256(target.read_bytes()).hexdigest(), 'bytes':target.stat().st_size, 'clips':[a.name for a in bpy.data.actions], 'sourceHashes':{name:hashlib.sha256((Path('/tmp') / name).read_bytes()).hexdigest() for name in sources}})
manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
