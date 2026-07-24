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

def create_screenshot(w, h, style):
    pixels = []
    bg = (10, 10, 11, 255)
    accent = (0, 188, 212, 255)
    
    for y in range(h):
        for x in range(w):
            pixels.append(bg)
    
    if style == 'wide':
        for y in range(100, 150):
            for x in range(100, w - 100):
                pixels[y * w + x] = accent
        for i in range(4):
            y = 200 + i * 100
            for row in range(60):
                for x in range(100, w - 100):
                    pixels[(y + row) * w + x] = (20, 20, 22, 255)
    
    elif style == 'narrow':
        for y in range(80, 130):
            for x in range(30, w - 30):
                pixels[y * w + x] = accent
        for i in range(6):
            y = 180 + i * 80
            for row in range(50):
                for x in range(30, w - 30):
                    pixels[(y + row) * w + x] = (20, 20, 22, 255)
    
    return create_png(w, h, pixels)

with open('public/screenshot-wide-1.png', 'wb') as f:
    f.write(create_screenshot(1280, 800, 'wide'))

with open('public/screenshot-wide-2.png', 'wb') as f:
    f.write(create_screenshot(1280, 800, 'wide'))

with open('public/screenshot-narrow-1.png', 'wb') as f:
    f.write(create_screenshot(360, 780, 'narrow'))

with open('public/screenshot-narrow-2.png', 'wb') as f:
    f.write(create_screenshot(360, 780, 'narrow'))

print('Wide and narrow screenshots generated')
