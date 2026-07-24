import struct
import zlib

def create_png(width, height, pixels):
    signature = b'\x89PNG\r\n\x1a\n'
    
    def crc32(data):
        crc = 0xFFFFFFFF
        table = []
        for i in range(256):
            c = i
            for j in range(8):
                c = (0xEDB88320 ^ (c >> 1)) if (c & 1) else (c >> 1)
            table.append(c)
        for byte in data:
            crc = table[(crc ^ byte) & 0xFF] ^ (crc >> 8)
        return struct.pack('>I', (crc ^ 0xFFFFFFFF) & 0xFFFFFFFF)
    
    def chunk(chunk_type, data):
        length = struct.pack('>I', len(data))
        crc_data = chunk_type + data
        return length + chunk_type + data + crc32(crc_data)
    
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    
    raw = []
    for y in range(height):
        raw.append(0)
        for x in range(width):
            idx = y * width + x
            r, g, b, a = pixels[idx]
            raw.extend([r, g, b, a])
    
    compressed = zlib.compress(bytes(raw))
    
    png_data = signature
    png_data += chunk(b'IHDR', ihdr)
    png_data += chunk(b'IDAT', compressed)
    png_data += chunk(b'IEND', b'')
    
    return png_data

def create_screenshot_1():
    w, h = 1080, 1920
    pixels = []
    bg = (10, 10, 11, 255)
    accent = (0, 188, 212, 255)
    text = (255, 255, 255, 255)
    muted = (100, 100, 100, 255)
    
    for y in range(h):
        for x in range(w):
            pixels.append(bg)
    
    for y in range(150, 200):
        for x in range(100, 980):
            pixels[y * w + x] = accent
    
    for y in range(300, 400):
        for x in range(100, 500):
            pixels[y * w + x] = (20, 20, 22, 255)
    
    for y in range(500, 600):
        for x in range(100, 980):
            pixels[y * w + x] = (20, 20, 22, 255)
    
    for y in range(700, 750):
        for x in range(100, 980):
            pixels[y * w + x] = accent
    
    return create_png(w, h, pixels)

def create_screenshot_2():
    w, h = 1080, 1920
    pixels = []
    bg = (10, 10, 11, 255)
    accent = (0, 188, 212, 255)
    
    for y in range(h):
        for x in range(w):
            pixels.append(bg)
    
    for i in range(8):
        y = 150 + i * 180
        for row in range(100):
            for x in range(100, 980):
                pixels[(y + row) * w + x] = (20, 20, 22, 255)
        for x in range(100, 150):
            pixels[y * w + x] = accent
    
    for y in range(h - 150, h):
        for x in range(100, 850):
            pixels[y * w + x] = (20, 20, 22, 255)
        for x in range(850, 980):
            pixels[y * w + x] = accent
    
    return create_png(w, h, pixels)

def create_screenshot_3():
    w, h = 1080, 1920
    pixels = []
    bg = (10, 10, 11, 255)
    accent = (0, 188, 212, 255)
    
    for y in range(h):
        for x in range(w):
            pixels.append(bg)
    
    for i in range(5):
        y = 200 + i * 200
        for row in range(120):
            for x in range(100, 980):
                pixels[(y + row) * w + x] = (20, 20, 22, 255)
    
    for y in range(100, 150):
        for x in range(100, 980):
            pixels[y * w + x] = accent
    
    return create_png(w, h, pixels)

with open('public/screenshot-1.png', 'wb') as f:
    f.write(create_screenshot_1())

with open('public/screenshot-2.png', 'wb') as f:
    f.write(create_screenshot_2())

with open('public/screenshot-3.png', 'wb') as f:
    f.write(create_screenshot_3())

print('Screenshots generated')
