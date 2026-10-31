"""Run with Blender: --background --python scripts/convert-quaternius.py -- input.fbx output.glb."""
import bpy, sys, json, os
source, target=sys.argv[sys.argv.index('--')+1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=os.path.abspath(source))
print('ASSET_INSPECTION',json.dumps({'meshes':[(o.name,len(o.data.polygons)) for o in bpy.data.objects if o.type=='MESH'],'actions':[(a.name,tuple(a.frame_range)) for a in bpy.data.actions],'images':[(i.name,i.filepath) for i in bpy.data.images]}))
bpy.ops.export_scene.gltf(filepath=os.path.abspath(target),export_format='GLB',export_animations=True,export_yup=True)
