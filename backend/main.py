import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# rembg is lazy-loaded only when remove-bg is called
# to avoid OOM on startup (u2netp model = 4.7MB vs u2net = 176MB)
_rembg_session = None

def get_rembg_session():
    global _rembg_session
    if _rembg_session is None:
        from rembg import new_session
        _rembg_session = new_session("u2netp")
    return _rembg_session

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Image Editing Backend"}

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/api/sketch")
async def convert_to_sketch(file: UploadFile = File(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # 1. Grayscale
    gray_image = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # 2. Invert
    inverted_image = cv2.bitwise_not(gray_image)
    
    # 3. Blur
    blurred_image = cv2.GaussianBlur(inverted_image, (21, 21), 0)
    
    # 4. Invert blur
    inverted_blur = cv2.bitwise_not(blurred_image)
    
    # 5. Sketch (Color Dodge blend)
    sketch_image = cv2.divide(gray_image, inverted_blur, scale=256.0)
    
    # Darken the sketch slightly by using gamma correction for richer pencil strokes
    gamma = 0.6
    invGamma = 1.0 / gamma
    table = np.array([((i / 255.0) ** invGamma) * 255
                      for i in np.arange(0, 256)]).astype("uint8")
    sketch_image = cv2.LUT(sketch_image, table)
    
    _, encoded_img = cv2.imencode('.jpg', sketch_image)
    return Response(content=encoded_img.tobytes(), media_type="image/jpeg")

@app.post("/api/remove-bg")
async def remove_background(file: UploadFile = File(...)):
    from rembg import remove
    contents = await file.read()
    session = get_rembg_session()
    output_bytes = remove(contents, session=session)
    return Response(content=output_bytes, media_type="image/png")

def color_quantization(img, k):
    data = np.float32(img).reshape((-1, 3))
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    ret, label, center = cv2.kmeans(data, k, None, criteria, 10, cv2.KMEANS_RANDOM_CENTERS)
    center = np.uint8(center)
    result = center[label.flatten()]
    result = result.reshape(img.shape)
    return result

@app.post("/api/anime")
async def apply_anime(file: UploadFile = File(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Resize image if it's too large to improve performance and filter quality
    h, w = img.shape[:2]
    max_dim = 1000
    scale = 1.0
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        img_resized = cv2.resize(img, (int(w * scale), int(h * scale)))
    else:
        img_resized = img.copy()

    # 1. Edge-preserving filter for smooth, cel-shaded colors
    color = cv2.edgePreservingFilter(img_resized, flags=1, sigma_s=50, sigma_r=0.4)
    
    # 2. Vibrant colors (boost saturation and slightly adjust brightness)
    hsv = cv2.cvtColor(color, cv2.COLOR_BGR2HSV).astype("float32")
    hh, ss, vv = cv2.split(hsv)
    ss = np.clip(ss * 1.25, 0, 255) # Strong saturation boost for anime look
    vv = np.clip(vv * 1.05, 0, 255) 
    hsv = cv2.merge([hh, ss, vv])
    color = cv2.cvtColor(hsv.astype("uint8"), cv2.COLOR_HSV2BGR)
    
    # 3. Extract fine, detailed outlines using Adaptive Thresholding
    gray = cv2.cvtColor(img_resized, cv2.COLOR_BGR2GRAY)
    # Median blur to remove noise so we don't get messy edges
    gray = cv2.medianBlur(gray, 5)
    
    # Adaptive threshold gives fine, pencil-like outlines instead of thick blobs
    edges = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 9, 9)
    
    # 4. Combine colors and fine edges
    anime = cv2.bitwise_and(color, color, mask=edges)
    
    # Resize back to original dimensions if we scaled it down
    if scale != 1.0:
        anime = cv2.resize(anime, (w, h))
    
    _, encoded_img = cv2.imencode('.jpg', anime)
    return Response(content=encoded_img.tobytes(), media_type="image/jpeg")

@app.post("/api/painting")
async def apply_painting(file: UploadFile = File(...)):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    # Resize image if it's too large to improve processing speed
    h, w = img.shape[:2]
    max_dim = 1000
    scale = 1.0
    if max(h, w) > max_dim:
        scale = max_dim / max(h, w)
        img_resized = cv2.resize(img, (int(w * scale), int(h * scale)))
    else:
        img_resized = img.copy()
        
    # 1. Edge-preserving filter for a painted/canvas effect
    painted = cv2.edgePreservingFilter(img_resized, flags=1, sigma_s=60, sigma_r=0.4)
    
    # 2. Boost color vibrancy slightly
    hsv = cv2.cvtColor(painted, cv2.COLOR_BGR2HSV).astype("float32")
    h_channel, s, v = cv2.split(hsv)
    s = np.clip(s * 1.2, 0, 255) # Boost saturation
    hsv = cv2.merge([h_channel, s, v])
    painted = cv2.cvtColor(hsv.astype("uint8"), cv2.COLOR_HSV2BGR)
    
    # 3. Add a slight sharpening filter to simulate brush strokes
    kernel = np.array([[0, -0.5, 0], [-0.5, 3, -0.5], [0, -0.5, 0]])
    painted = cv2.filter2D(painted, -1, kernel)
    
    # Resize back to original dimensions if we scaled it down
    if scale != 1.0:
        painted = cv2.resize(painted, (w, h))
        
    _, encoded_img = cv2.imencode('.jpg', painted)
    return Response(content=encoded_img.tobytes(), media_type="image/jpeg")
