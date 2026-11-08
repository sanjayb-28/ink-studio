"""Real compiler invariants. Isolated outputs; no model download or inference."""
import importlib.util, json, math, re, tempfile, unittest, sys
from pathlib import Path
import numpy as np
from PIL import Image

spec=importlib.util.spec_from_file_location('image_lab',Path(__file__).resolve().parents[1]/'scripts/image_lab.py')
sys.path.insert(0,str(Path(spec.origin).parent))
lab=importlib.util.module_from_spec(spec);spec.loader.exec_module(lab)

class CompilerContract(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
        lab.PUBLIC=self.root/'public';lab.PUBLIC.mkdir();lab.WORK=self.root/'work'
        pixels=np.zeros((180,260,3),np.uint8);pixels[:]=[182,152,112];pixels[30:140,60:200]=[28,44,81];pixels[70:100,80:110]=[243,218,160]
        self.path=self.root/'source.png';Image.fromarray(pixels).save(self.path)
    def tearDown(self):self.tmp.cleanup()
    def test_real_conversion_cache_and_contours(self):
        before=self.path.read_bytes();first=lab.render(self.path);second=lab.render(self.path)
        self.assertFalse(first['cacheHit']);self.assertTrue(second['cacheHit']);self.assertEqual(first['id'],second['id']);self.assertEqual(before,self.path.read_bytes())
        image=np.array(Image.open(lab.PUBLIC/first['image'].lstrip('/')))
        self.assertEqual(image.shape,(180,260,3));self.assertLess(image.mean(),np.array(Image.open(self.path)).mean())
        drawing=json.loads((lab.PUBLIC/first['drawing'].lstrip('/')).read_text())
        self.assertEqual(len(drawing['d']),len(drawing['len']));self.assertGreater(len(drawing['d']),0)
        for d,length in zip(drawing['d'],drawing['len']):
            pts=[float(v) for v in re.findall(r'-?\d+(?:\.\d+)?',d)]
            self.assertEqual(len(pts)%2,0);self.assertTrue(all(math.isfinite(v) for v in pts));self.assertGreater(length,0)
            self.assertTrue(all(0<=v<=260 for v in pts[::2]));self.assertTrue(all(0<=v<=180 for v in pts[1::2]))
        # A changed recipe yields new bytes, and missing outputs are regenerated.
        changed=lab.render(self.path,night=.9);self.assertNotEqual(changed['id'],first['id'])
        (lab.PUBLIC/first['image'].lstrip('/')).unlink();self.assertFalse(lab.render(self.path)['cacheHit'])
    def test_illustration_finish_preserves_structural_strokes(self):
        # A stronger visual finish must not remove or relocate the reveal lines.
        light=lab.render(self.path,illustration=0)
        heavy=lab.render(self.path,illustration=.9)
        first=json.loads((lab.PUBLIC/light['drawing'].lstrip('/')).read_text())
        second=json.loads((lab.PUBLIC/heavy['drawing'].lstrip('/')).read_text())
        self.assertEqual(first,second)
        self.assertGreater(len(first['d']),0)
        self.assertNotEqual((lab.PUBLIC/light['image'].lstrip('/')).read_bytes(),(lab.PUBLIC/heavy['image'].lstrip('/')).read_bytes())
        self.assertEqual((first['w'],first['h']),(260,180))

    def test_complex_edges_have_bounded_ink_travel(self):
        # A dense shelf/grid must not turn 36 contours into tens of thousands
        # of pixels of backtracking, which makes the same clock race and stutter.
        import cv2
        image=np.zeros((220,720,3),np.uint8)
        for x in range(20,700,19):
            cv2.line(image,(x,20),(x,200),(200,200,200),2)
        for y in range(30,210,30):
            cv2.line(image,(10,y),(710,y),(200,200,200),2)
        drawing=lab.contours(image,36)
        self.assertGreater(len(drawing['d']),0)
        self.assertLessEqual(len(drawing['d']),36)
        self.assertLessEqual(sum(drawing['len']),720*4.4+.1)
        self.assertEqual(drawing,lab.contours(image,36))

    def test_flat_transparent_and_orientation(self):
        flat=self.root/'flat.png';Image.new('RGBA',(100,80),(255,255,255,0)).save(flat)
        image=lab.source_image(flat);self.assertEqual(image.getpixel((0,0)),(0,0,0))
        d=lab.contours(np.zeros((80,100,3),np.uint8));self.assertGreater(len(d['d']),0)
        rotated=self.root/'rotated.jpg';im=Image.new('RGB',(100,60),'red');exif=im.getexif();exif[274]=6;im.save(rotated,exif=exif)
        self.assertEqual(lab.source_image(rotated).size,(60,100))
    def test_validation_and_interface_preservation(self):
        for kwargs in [dict(strength=float('nan')),dict(night=2),dict(seed=-1),dict(method='unknown'),dict(long_edge=400),dict(long_edge=True),dict(long_edge=1279),dict(long_edge=2048),dict(max_strokes=0),dict(max_strokes=True),dict(max_strokes=12.5),dict(max_strokes=201)]:
            with self.assertRaises(ValueError):lab.render(self.path,**kwargs)
        original=lab.source_image(self.path)
        preserved=lab.conventional(original,'pigment',.9,'interface')
        self.assertLess(np.max(np.abs(preserved-np.array(original)/255)),1e-6)
        with self.assertRaises(ValueError):lab.ai_repaint(original,.5,'interface',241)
        tiny=self.root/'tiny.png';Image.new('RGB',(8,8)).save(tiny)
        with self.assertRaises(ValueError):lab.source_image(tiny)

    def test_night_underpainting_keeps_values_and_identity(self):
        ramp=np.repeat(np.linspace(0,1,256,dtype=np.float32)[None,:,None],3,axis=2)
        ramp=np.repeat(ramp,32,axis=0)
        night=lab.night_underpainting(ramp,'scenery')
        self.assertEqual(night.shape,ramp.shape);self.assertTrue(np.isfinite(night).all())
        # Establish night values without clipping all bright architecture to black.
        levels=night.mean(axis=(0,2));self.assertTrue(np.all(np.diff(levels)>=-1e-6))
        self.assertLess(levels[-1],.7);self.assertGreater(levels[-1],.3)
        self.assertGreater(levels[220]-levels[100],.1)
        self.assertTrue(np.array_equal(lab.night_underpainting(ramp,'portrait'),ramp))
        self.assertTrue(np.array_equal(lab.night_underpainting(ramp,'interface'),ramp))

    def test_ai_exports_native_detail_without_enlargement(self):
        repaint=lab.ai_repaint
        try:
            # Model-free fixture tests the export boundary, not the model's artistry.
            lab.ai_repaint=lambda *_:(np.full((90,130,3),.2,np.float32),False,'test')
            result=lab.render(self.path,method='ai')
            self.assertEqual((result['width'],result['height']),(130,90))
            self.assertTrue(result['nativeResolution'])
            self.assertEqual((result['original']['width'],result['original']['height']),(260,180))
            with Image.open(lab.PUBLIC/result['image'].lstrip('/')) as output:
                self.assertEqual(output.size,(130,90))
            drawing=json.loads((lab.PUBLIC/result['drawing'].lstrip('/')).read_text())
            self.assertEqual((drawing['w'],drawing['h']),(130,90))
        finally:lab.ai_repaint=repaint

    def test_light_accent_is_local_and_requires_a_real_feature(self):
        rgb=np.full((180,260,3),.025,np.float32)
        import cv2
        cv2.ellipse(rgb,(150,85),(3,6),0,0,360,(.75,.65,.46),-1)
        a=lab.accent_settings(dict(enabled=True,kind='light',amount=.85,x=150/260,y=85/180),'scenery')
        original=rgb.copy();result,info=lab.vermilion(rgb,a,'scenery')
        self.assertTrue(info['applied']);self.assertLess(info['coverage'],.003)
        self.assertGreater(result[85,150,0],result[85,150,1]*3)
        self.assertGreater(result[85,162,0],original[85,162,0])
        self.assertLess(np.max(np.abs(result[:20,:20]-original[:20,:20])),1e-5)
        self.assertTrue(np.array_equal(rgb,original));self.assertTrue(np.isfinite(result).all())
        flat=np.full_like(rgb,.05);untouched,missing=lab.vermilion(flat,a,'scenery')
        self.assertFalse(missing['applied']);self.assertTrue(np.array_equal(flat,untouched))

    def test_pigment_keeps_object_shape_and_preservation_profiles(self):
        rgb=np.full((180,260,3),.28,np.float32);rgb[70:90,130:150]=[.09,.13,.3]
        a=lab.accent_settings(dict(enabled=True,kind='pigment',amount=.9,x=140/260,y=80/180),'portrait')
        result,info=lab.vermilion(rgb,a,'portrait')
        self.assertTrue(info['applied']);self.assertGreater(result[80,140,0],result[80,140,2])
        self.assertTrue(np.array_equal(result[:50],rgb[:50]))
        interface,info=lab.vermilion(rgb,a,'interface');self.assertFalse(info['applied']);self.assertTrue(np.array_equal(interface,rgb))
        auto=lab.accent_settings(dict(enabled=True),'portrait');_,info=lab.vermilion(rgb,auto,'portrait');self.assertFalse(info['applied'])
        off=lab.accent_settings(dict(enabled=False),'scenery');result,_=lab.vermilion(rgb,off,'scenery');self.assertTrue(np.array_equal(result,rgb))

    def test_accent_validation_and_cache_identity(self):
        for value in [dict(amount=float('nan')),dict(amount=True),dict(x=.2),dict(x=2,y=.5),dict(kind='moon')]:
            with self.assertRaises(ValueError):lab.accent_settings(value,'scenery')
        no=lab.render(self.path,accent=dict(enabled=False))
        yes=lab.render(self.path,accent=dict(enabled=True,kind='light',amount=.8,x=.37,y=.47))
        self.assertNotEqual(no['id'],yes['id'])
        self.assertTrue(lab.render(self.path,accent=dict(enabled=False))['cacheHit'])

    def test_auto_does_not_turn_arbitrary_bright_spots_into_red_lights(self):
        rgb=np.full((180,260,3),.025,np.float32)
        rgb[70:80,130:140]=.9
        for kind in ['auto','light']:
            setting=lab.accent_settings(dict(enabled=True,kind=kind),'scenery')
            result,info=lab.vermilion(rgb,setting,'scenery')
            self.assertFalse(info['applied']);self.assertTrue(np.array_equal(result,rgb))
        # Warm skin-like patches are insufficient evidence for automatic red.
        rgb[70:80,130:140]=[.7,.31,.17]
        setting=lab.accent_settings(dict(enabled=True),'scenery')
        result,info=lab.vermilion(rgb,setting,'scenery')
        self.assertFalse(info['applied']);self.assertTrue(np.array_equal(result,rgb))

    def test_auto_only_strengthens_an_existing_red_detail_without_glow(self):
        rgb=np.full((180,260,3),.025,np.float32)
        rgb[70:80,130:140]=[.55,.055,.055]
        setting=lab.accent_settings(dict(enabled=True),'scenery')
        result,info=lab.vermilion(rgb,setting,'scenery')
        self.assertTrue(info['applied']);self.assertEqual(info['kind'],'pigment')
        self.assertTrue(np.array_equal(result[:50],rgb[:50]))

if __name__=='__main__':unittest.main()
