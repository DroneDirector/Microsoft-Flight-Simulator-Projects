# Makes the start screen pictures in www/assets/title from the owner's photos: grades them, blurs other
# brands in the backgrounds, splits the flight deck into inside and outside, and cuts the aircraft in flight from
# its clouds (fly_mask.png). Needs OpenCV (opencv-contrib-python) and NumPy.
import cv2, numpy as np
A='/mnt/user-data/attachments/9fdae574-b4c0-5f3c-9462-583c96d7a878/'
rd=lambda f: cv2.imread(A+f+'-image.jpg').astype(np.float32)/255
def gblur(im,s): return cv2.GaussianBlur(im,(0,0),s)
def band_blur(im, y_full, y_end, keeps, sig=5):
    H,W=im.shape[:2]; m=np.zeros((H,W),np.float32)
    ys=np.arange(H); col=np.clip((y_end-ys)/(y_end-y_full),0,1); m[:]=col[:,None]
    for k in keeps: cv2.fillPoly(m,[np.array(k,np.int32)],0)
    m=gblur(m,4)[...,None]
    return im*(1-m)+gblur(im,sig)*m
def spot(im, shapes, sig=6):
    H,W=im.shape[:2]; m=np.zeros((H,W),np.float32)
    for s in shapes:
        if s[0]=='e': cv2.ellipse(m,(s[1],s[2]),(s[3],s[4]),0,0,360,1,-1)
        else: cv2.rectangle(m,(s[1],s[2]),(s[3],s[4]),1,-1)
    m=gblur(m,5)[...,None]; return im*(1-m)+gblur(im,sig)*m
def grade(im, bloom=0.22):
    b,g,r=im[...,0],im[...,1],im[...,2]
    L=(0.2126*r+0.7152*g+0.0722*b)[...,None]
    rgb=np.stack([r,g,b],-1)
    # gentle S-curve
    s=rgb*rgb*(3-2*rgb); rgb=rgb*0.72+s*0.28
    # vibrance / saturation
    L=(0.2126*rgb[...,0]+0.7152*rgb[...,1]+0.0722*rgb[...,2])[...,None]
    sat=np.abs(rgb-L).max(-1,keepdims=True); rgb=L+(rgb-L)*(1.12+0.25*(1-np.clip(sat*3,0,1)))
    rgb=np.clip(rgb,0,1)
    # split tone: deep indigo-teal shadows, warm magenta-peach highlights
    sh=np.array([0.07,0.10,0.26]); hi=np.array([1.0,0.62,0.66])
    ws=((1-L)**2.2)*0.22; wh=(L**2.4)*0.13
    rgb=rgb*(1-ws)+sh*ws*1.0+ (rgb*0)  # lift shadows toward indigo
    rgb=rgb*(1-wh)+ (rgb*hi)*wh*1.0 + hi*wh*0.12
    # bloom from the highlights, tinted pink-gold
    hl=np.clip((rgb.max(-1,keepdims=True)-0.72)/0.28,0,1)*rgb
    bl=gblur(hl,14)*np.array([1.0,0.78,0.9])
    rgb=1-(1-rgb)*(1-bl*bloom*2.2)
    out=np.clip(rgb,0,1)[...,::-1]
    return out
def save(im, name, alpha=None, q=86):
    im8=(np.clip(im,0,1)*255+0.5).astype(np.uint8)
    if alpha is not None: im8=np.dstack([im8,(np.clip(alpha,0,1)*255+0.5).astype(np.uint8)])
    cv2.imwrite('out/'+name, im8, [cv2.IMWRITE_WEBP_QUALITY, q])

# 1 the stand with the ground power unit
i1=rd('54696557')
i1=band_blur(i1,195,282,[[(392,118),(462,118),(540,308),(442,308)],[(915,236),(970,236),(970,335),(915,335)]])
i1=spot(i1,[('e',225,372,40,24),('e',1335,600,34,26)],3.2)
save(grade(i1),'t1.webp')
# 2 pushback
i2=rd('a9e1c2cd')
i2=band_blur(i2,212,268,[[(903,292),(952,132),(992,132),(988,292)],[(418,255),(455,255),(472,348),(418,348)]])
i2=spot(i2,[('r',955,342,1060,372),('r',385,598,440,615)],7)
save(grade(i2),'t2.webp')
# 3 the flight deck: outside (pushed back) and inside (with the windows open)
i3=rd('1e04eb3c'); H,W=i3.shape[:2]
wins=[[(377,172),(768,170),(772,330),(470,335),(445,346),(412,334),(392,292)],
      [(828,170),(1222,172),(1203,292),(1182,332),(1152,346),(1122,335),(830,330)],
      [(135,195),(148,188),(315,188),(340,198),(378,352),(352,372),(255,377),(248,418),(185,418),(165,400),(160,345),(135,330)],
      [(1238,190),(1270,186),(1468,188),(1478,200),(1478,340),(1462,350),(1450,418),(1365,420),(1362,370),(1255,372),(1232,360),(1214,345)],
      [(0,182),(46,182),(50,298),(0,298)],[(1554,182),(1584,182),(1584,298),(1557,298)]]
hole=np.zeros((H,W),np.uint8)
for p in wins: cv2.fillPoly(hole,[np.array(p,np.int32)],255)
# the outside plate: the windows' view, carried on past their edges
small=cv2.resize((i3*255).astype(np.uint8),(W//4,H//4),interpolation=cv2.INTER_AREA)
hs=cv2.resize(hole,(W//4,H//4),interpolation=cv2.INTER_NEAREST)
hs=cv2.erode(hs,np.ones((3,3),np.uint8))
fill=cv2.inpaint(small,255-hs,9,cv2.INPAINT_TELEA)
fill=cv2.resize(fill,(W,H),interpolation=cv2.INTER_CUBIC).astype(np.float32)/255
hf=gblur((cv2.erode(hole,np.ones((5,5),np.uint8))/255.).astype(np.float32),2)[...,None]
outp=i3*hf+fill*(1-hf)
outp=gblur(outp,1.4)   # a little out of focus: the eye is on the flight deck
save(grade(outp),'t3o.webp')
a=1-gblur((hole/255.).astype(np.float32),1.1)
save(grade(i3),'t3i.webp',alpha=a,q=88)
# 4 in flight: the clouds, and the aircraft on its own
i4=rd('6e6ee5b7'); H,W=i4.shape[:2]
pm=cv2.imread('fly_mask.png',0)
pm=cv2.morphologyEx(pm,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
pm8=pm.copy()
d=cv2.dilate(pm,np.ones((17,17),np.uint8)); cv2.fillPoly(d,[np.array([(512,292),(562,222),(582,226),(558,318),(512,318)],np.int32)],255)
src=(i4*255).astype(np.uint8); sm=cv2.resize(src,(W//2,H//2),interpolation=cv2.INTER_AREA); dm=cv2.resize(d,(W//2,H//2),interpolation=cv2.INTER_NEAREST)
lab=cv2.cvtColor(sm,cv2.COLOR_BGR2Lab); o=np.zeros_like(lab); cv2.xphoto.inpaint(lab,255-dm,o,cv2.xphoto.INPAINT_SHIFTMAP)
up=cv2.resize(cv2.cvtColor(o,cv2.COLOR_Lab2BGR),(W,H),interpolation=cv2.INTER_CUBIC).astype(np.float32)/255
dm2=gblur((d/255.).astype(np.float32),3)[...,None]
plate=i4*(1-dm2)+up*dm2
pa=gblur((pm/255.).astype(np.float32),0.9)
save(grade(plate),'t4b.webp')
save(grade(i4),'t4a.webp',alpha=pa,q=90)
# 5 the operations desk
i5=rd('15e0f637'); i5=spot(i5,[('e',760,484,26,9)],4)
save(grade(i5),'t5.webp')
print('done')
