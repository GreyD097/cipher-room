import struct
import zlib

def create_png(width, height, r, g, b, a=255):
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
            raw.extend([r, g, b, a])
    
    compressed = zlib.compress(bytes(raw))
    
    png_data = signature
    png_data += chunk(b'IHDR', ihdr)
    png_data += chunk(b'IDAT', compressed)
    png_data += chunk(b'IEND', b'')
    
    return png_data

with open('public/icon-192.png', 'wb') as f:
    f.write(create_png(192, 192, 0, 188, 212))

with open('public/icon-512.png', 'wb') as f:
    f.write(create_png(512, 512, 0, 188, 212))

print('Icons generated')
