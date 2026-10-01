"""Esporta il modello del corpo per la libreria esercizi 3D.

Uso (Blender, tab Scripting): seleziona il modello, che deve avere i vertex group
Petto, Dorso, Spalle, Bicipiti, Tricipiti, Core, Gambe, poi esegui lo script.

Ogni faccia va nel gruppo condiviso dalla maggioranza dei suoi vertici; le facce
senza gruppo finiscono nell'oggetto neutro "base". Il risultato è un GLB con gli
oggetti grp_<Gruppo> + base (texture ridotta a 2048 px), che l'app riconosce in
src/components/Body3D.jsx. Il modello originale non viene modificato: le copie
stanno nella collezione EXPORT_web.
"""
import os
from collections import Counter

import bmesh
import bpy

GROUPS = ["Petto", "Dorso", "Spalle", "Bicipiti", "Tricipiti", "Core", "Gambe"]
OUT = os.path.join(os.path.dirname(bpy.data.filepath) or os.path.expanduser("~"), "body-custom.glb")
TEX_SIZE = 2048

src = bpy.context.active_object
assert src and src.type == "MESH", "Seleziona il modello (mesh) prima di eseguire lo script"
if bpy.context.mode != "OBJECT":
    bpy.ops.object.mode_set(mode="OBJECT")
me = src.data
gi = {src.vertex_groups[g].index: g for g in GROUPS if g in src.vertex_groups}
vgs = [[gi[e.group] for e in v.groups if e.group in gi and e.weight > 0.001] for v in me.vertices]

# un vertice in più gruppi è ambiguo (Assign aggiunge senza togliere dal gruppo
# precedente): meglio fermarsi che scegliere a caso e perdere le modifiche
multi = [i for i, g in enumerate(vgs) if len(g) > 1]
if multi:
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="DESELECT")
    bpy.ops.object.mode_set(mode="OBJECT")
    for i in multi:
        me.vertices[i].select = True
    bpy.ops.object.mode_set(mode="EDIT")
    raise RuntimeError(f"{len(multi)} vertici sono in più gruppi (ora selezionati in Edit Mode): "
                       "toglili dal gruppo sbagliato con Remove e rilancia lo script")

face_grp = []
for p in me.polygons:
    c = Counter(g for vi in p.vertices for g in vgs[vi])
    g, n = c.most_common(1)[0] if c else (None, 0)
    face_grp.append(g if n >= len(p.vertices) / 2 else None)

col = bpy.data.collections.get("EXPORT_web")
if col:
    for o in list(col.objects):
        d = o.data
        bpy.data.objects.remove(o, do_unlink=True)
        if d and d.users == 0:
            bpy.data.meshes.remove(d)
else:
    col = bpy.data.collections.new("EXPORT_web")
    bpy.context.scene.collection.children.link(col)

# materiale web: copia di quello originale con texture ridotta
src_mat = me.materials[0]
web_mat = src_mat.copy()
web_mat.name = "body_web_mat"
for n in web_mat.node_tree.nodes:
    if n.type == "TEX_IMAGE" and n.image:
        img = n.image.copy()
        img.name = "body_web_basecolor"
        if max(img.size) > TEX_SIZE:
            img.scale(TEX_SIZE, TEX_SIZE)
            img.pack()  # senza pack Blender può ricaricare la texture originale a 4096 px
        n.image = img

for name in GROUPS + [None]:
    keep = {i for i, g in enumerate(face_grp) if g == name}
    if not keep:
        continue
    m = me.copy()
    bm = bmesh.new()
    bm.from_mesh(m)
    bm.faces.ensure_lookup_table()
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.index not in keep], context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.to_mesh(m)
    bm.free()
    for ca in list(m.color_attributes):
        m.color_attributes.remove(ca)
    m.materials.clear()
    m.materials.append(web_mat)
    o = bpy.data.objects.new(f"grp_{name}" if name else "base", m)
    o.matrix_world = src.matrix_world.copy()
    col.objects.link(o)

bpy.ops.object.select_all(action="DESELECT")
for o in col.objects:
    o.select_set(True)
# effetti (es. l'oggetto "aura"): esportati così come sono, l'animazione la fa l'app
vfx = bpy.data.collections.get("EXPORT_vfx")
for o in (vfx.objects if vfx else []):
    o.select_set(True)
bpy.context.view_layer.objects.active = col.objects[0]
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True, export_yup=True,
                          export_apply=True, export_image_format="JPEG", export_materials="EXPORT")
print("Esportato:", OUT, Counter(face_grp))
